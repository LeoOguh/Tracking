export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { pdfBase64, categorias } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada na Vercel.' });

  try {
    // Usando a versão v1beta para garantir suporte a PDFs e modelos Flash
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Analise este extrato e retorne APENAS um JSON puro (sem markdown ou blocos de código) seguindo este formato exato: {"lancamentos": [{"desc": "string", "valor": number, "date": "YYYY-MM-DD", "type": "despesa", "cat": "string"}]}. Categorias permitidas: ${categorias}.` },
            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno ao processar o extrato.' });
  }
}