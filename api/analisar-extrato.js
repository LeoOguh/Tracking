export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { pdfBase64, categorias } = req.body;
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada na Vercel.' });

  try {
    // Usamos uma variável dedicada para o prompt ficar limpo e fácil de editar
    const promptIA = `
      Analise este extrato bancário em PDF e extraia todos os lançamentos.
      
      REGRAS DE CATEGORIZAÇÃO (Seja inteligente ao deduzir a categoria pelo nome do estabelecimento):
      - Supermercados, mercadinhos, padarias e apps de entrega (ex: Center Box, Assaí, iFood, Cometa) DEBEM ser 'Alimentação'.
      - Farmácias, clínicas e hospitais (ex: Pague Menos, Drogasil, Unimed) DEVEM ser 'Saúde'.
      - Apps de transporte e postos de combustível (ex: Uber, 99, Shell) DEVEM ser 'Transporte'.
      - Lojas de roupa e departamento (ex: Cea, Renner, Riachuelo) DEVEM ser 'Roupas'.
      - Serviços digitais e assinaturas (ex: Claude, Netflix, Amazon Prime, Spotify) DEVEM ser 'Assinaturas'.
      - Pagamentos de faturas, boletos genéricos ou Pix sem nome claro podem ir para 'Outros'.
      
      LIMPEZA DO NOME (desc):
      - Remova códigos estranhos ou números de transação do nome do estabelecimento para ficar legível.
      
      FORMATO DE SAÍDA:
      Retorne APENAS um objeto JSON puro (sem marcação markdown, sem crases) neste formato exato:
      {"lancamentos": [{"desc": "Nome Limpo", "valor": 00.00, "date": "YYYY-MM-DD", "type": "despesa", "cat": "Categoria Correspondente"}]}
      
      Categorias permitidas: ${categorias}
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptIA },
            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno no servidor da Vercel.' });
  }
}