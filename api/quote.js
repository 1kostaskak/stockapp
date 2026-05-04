export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'No ticker' });
  
  const FINNHUB_KEY = 'd7sak1pr01qorsvi18p0d7sak1pr01qorsvi18pg';
  const isFutures = ticker.includes('=F') || ticker.includes('=X');
  
  try {
    if (isFutures) {
      // Futures/Commodities: use Yahoo only
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      );
      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(v=>v!=null) || [];
      const price = meta?.regularMarketPrice ?? closes.at(-1);
      const prev = closes.at(-2);
      const dp = prev ? ((price - prev) / prev * 100) : 0;
      res.status(200).json({
        quote: { c: price, dp, d: price - (prev??price) },
        hist: data
      });
    } else {
      // Stocks: Finnhub for real-time + Yahoo for history
      const [finnRes, yahooRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`),
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`,
          { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } })
      ]);
      const finnData  = await finnRes.json();
      const yahooData = await yahooRes.json();
      res.status(200).json({ quote: finnData, hist: yahooData });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
