export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { tipoGeracao, materias, texto, pdfBase64, dias, horasDia, dataInicio } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada.' });

  try {
    let promptIA = `Você é um especialista em planejamento de estudos para concursos públicos e vestibulares.
    Crie um cronograma detalhado de estudos com duração de ${dias} dias, começando a partir da data: ${dataInicio}, com uma meta de ${horasDia}h de estudo por dia.

    METODOLOGIA OBRIGATÓRIA:
    - Aplique métodos consagrados: Ciclo de Estudos de Robert Bjork, Revisão Espaçada (Spaced Repetition), Intercalação de Matérias (Interleaving) e Prática de Recuperação.
    - Divida o tempo em sessões usando a técnica Pomodoro (ex: 25, 30 ou 50 min de foco).
    - Alterne entre matérias diferentes no mesmo dia para não cansar o cérebro.
    - Inclua dicas específicas de quantas QUESTÕES resolver de cada matéria no dia.

    FONTE DOS DADOS:
    `;

    if (tipoGeracao === 'subjects') {
        promptIA += `O aluno estudará as seguintes matérias e suas respectivas importâncias (de 1 a 5):\n${materias}\nDistribua essas matérias de forma inteligente, dando prioridade para as de peso maior.`;
    } else {
        promptIA += `Analise o edital (em anexo/texto) e extraia todas as matérias e tópicos. Estime o peso/importância de cada matéria (1 a 5) com base no que mais cai em concursos. Distribua os tópicos ao longo dos ${dias} dias.\n`;
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