export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { pdfBase64, categorias } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada na Vercel.' });

  try {
    // Usando o modelo atualizado gemini-2.0-flash na v1beta
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Analise este PDF e extraia os lançamentos bancários. Retorne APENAS um JSON puro (sem markdown) neste formato: {"lancamentos": [{"desc": "string", "valor": number, "date": "YYYY-MM-DD", "type": "despesa", "cat": "string"}]}. Categorias: ${categorias}` },
            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" } // Força a saída em JSON
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno no servidor da Vercel.' });
  }
}