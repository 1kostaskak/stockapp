export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'No ticker' });
  
  const API_KEY = 'd7sak1pr01qorsvi18p0d7sak1pr01qorsvi18pg';
  
  try {
    const [quoteRes, histRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`),
      fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&count=250&token=${API_KEY}`)
    ]);
    
    const quote = await quoteRes.json();
    const hist  = await histRes.json();
    
    res.status(200).json({ quote, hist });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
