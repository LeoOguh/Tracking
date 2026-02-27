export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { tipoGeracao, materias, texto, pdfBase64, dias, horasDia, dataInicio, diasSemana, diasSemanaIdx } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada.' });

  // Build weekdays string
  const weekdaysStr = diasSemana && diasSemana.length > 0
    ? diasSemana.join(', ')
    : 'segunda-feira, terça-feira, quarta-feira, quinta-feira, sexta-feira';
  
  const weekdaysIdxStr = diasSemanaIdx && diasSemanaIdx.length > 0
    ? diasSemanaIdx.join(', ')
    : '1, 2, 3, 4, 5';

  try {
    let promptIA = `Você é um especialista em planejamento de estudos para concursos públicos e vestibulares.
    Crie um cronograma detalhado de estudos com duração de ${dias} dias corridos, começando a partir da data: ${dataInicio}, com uma meta de ${horasDia}h de estudo por dia.

    REGRA FUNDAMENTAL DE DIAS DA SEMANA:
    - O aluno estuda SOMENTE nos seguintes dias da semana: ${weekdaysStr} (índices JS: ${weekdaysIdxStr}).
    - NÃO crie entradas no cronograma para dias da semana que NÃO estão na lista acima.
    - Verifique o dia da semana de cada data antes de incluí-la. Se a data cai em um dia não listado, PULE essa data.
    - Por exemplo, se o aluno não estuda no domingo (0) e no sábado (6), não inclua datas que caiam nesses dias.

    DISTRIBUIÇÃO DE HORAS POR IMPORTÂNCIA:
    - Distribua as ${horasDia}h diárias entre as matérias de forma PROPORCIONAL à importância de cada uma.
    - Matérias com importância 5 devem receber significativamente mais horas que matérias com importância 1.
    - Use a seguinte fórmula aproximada: horas_matéria = (importância_matéria / soma_importâncias) × ${horasDia}h.
    - Exemplo: se há 3 matérias com importâncias 5, 3 e 2 (soma=10), a de importância 5 recebe 50% das horas, a de 3 recebe 30%, e a de 2 recebe 20%.
    - Arredonde para múltiplos de 0.5h (mínimo de 0.5h por matéria quando incluída no dia).

    METODOLOGIA OBRIGATÓRIA:
    - Aplique métodos consagrados: Ciclo de Estudos de Robert Bjork, Revisão Espaçada (Spaced Repetition), Intercalação de Matérias (Interleaving) e Prática de Recuperação.
    - Divida o tempo em sessões usando a técnica Pomodoro (ex: 25, 30 ou 50 min de foco).
    - Alterne entre matérias diferentes no mesmo dia para não cansar o cérebro.
    - Inclua dicas específicas de quantas QUESTÕES resolver de cada matéria no dia.

    FONTE DOS DADOS:
    `;

    if (tipoGeracao === 'subjects') {
        promptIA += `O aluno estudará as seguintes matérias, importâncias e pesos sugeridos:\n${materias}\nDistribua essas matérias de forma inteligente, respeitando rigorosamente os pesos/importâncias na alocação de horas.`;
    } else {
        promptIA += `Analise o edital (em anexo/texto) e extraia todas as matérias e tópicos. Estime o peso/importância de cada matéria (1 a 5) com base no que mais cai em concursos. Distribua os tópicos ao longo dos ${dias} dias, respeitando os dias da semana permitidos.\n`;
        if (texto) promptIA += `\nTEXTO DO EDITAL:\n${texto}\n`;
    }

    promptIA += `
    FORMATO DE SAÍDA (Retorne APENAS um objeto JSON puro, sem crases, sem marcação markdown):
    {
      "schedule": {
        "YYYY-MM-DD": {
          "subjects": [
            {
              "name": "Nome da Matéria",
              "hours": 2,
              "sessions": 4,
              "sessionTime": 30,
              "importance": 4,
              "topics": ["Tópico 1", "Tópico 2"],
              "questions": 15,
              "notes": "Focar em exercícios da banca X"
            }
          ]
        }
      }
    }`;

    // Monta a requisição com suporte nativo a leitura de PDF
    const parts = [{ text: promptIA }];
    if (tipoGeracao === 'text' && pdfBase64) {
        parts.push({ inline_data: { mime_type: "application/pdf", data: pdfBase64 } });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno no servidor da Vercel.' });
  }
}