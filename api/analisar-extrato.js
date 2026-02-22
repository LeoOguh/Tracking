export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { pdfBase64, categorias } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'API_KEY não configurada na Vercel' });

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Analise este PDF de extrato bancário. Extraia os lançamentos e retorne APENAS um objeto JSON puro, sem markdown, seguindo este formato: {"lancamentos": [{"desc": "string", "valor": number, "date": "YYYY-MM-DD", "type": "despesa", "cat": "string"}]}. Categorias permitidas: ${categorias}` },
            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" } // Força o JSON
      })
    });

    const data = await response.json();
    
    if (data.error) {
        return res.status(400).json({ error: data.error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Falha crítica na API' });
  }
}