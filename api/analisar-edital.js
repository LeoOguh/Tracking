export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { texto, pdfBase64 } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada.' });

  try {
    const promptIA = `Você é um especialista em concursos públicos e vestibulares.
    Analise o edital/texto a seguir e extraia TODAS as matérias e seus tópicos/subtópicos de forma hierárquica.

    REGRAS:
    - Identifique cada matéria principal (ex: Direito Penal, Matemática, Português).
    - Para cada matéria, liste todos os tópicos e subtópicos mencionados, mantendo a hierarquia.
    - Estime a importância de cada matéria de 1 a 5 (baseado no peso típico em concursos e na quantidade de tópicos).
    - Mantenha a ordem em que aparecem no edital.
    - Se houver indicação de quantidade de questões ou peso, use isso para definir a importância.

    ${texto ? 'TEXTO DO EDITAL:\n' + texto : 'O PDF do edital está em anexo.'}

    FORMATO DE SAÍDA (Retorne APENAS um objeto JSON puro, sem crases, sem marcação markdown):
    {
      "subjects": [
        {
          "name": "Nome da Matéria",
          "importance": 4,
          "topics": [
            {
              "name": "Tópico Principal",
              "subtopics": ["Subtópico 1", "Subtópico 2"]
            }
          ]
        }
      ]
    }`;

    const parts = [{ text: promptIA }];
    if (pdfBase64) {
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
