export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'No ticker' });
  
  const FINNHUB_KEY = 'd7sak1pr01qorsvi18p0d7sak1pr01qorsvi18pg';
  
  try {
    // Fetch real-time quote from Finnhub + historical from Yahoo for RSI/MA
    const [finnRes, yahooRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      })
    ]);

    const finnData  = await finnRes.json();
    const yahooData = await yahooRes.json();

    res.status(200).json({ quote: finnData, hist: yahooData });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
