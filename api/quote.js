export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker, range = '1y' } = req.query;
  if (!ticker) return res.status(400).json({ error: 'No ticker' });

  const FINNHUB_KEY = 'd7sak1pr01qorsvi18p0d7sak1pr01qorsvi18pg';
  const isFutures = ticker.includes('=F') || ticker.includes('=X');

  // Map range to Yahoo Finance params
  const rangeMap = {
    '1mo': { range: '1mo', interval: '1d' },
    '3mo': { range: '3mo', interval: '1d' },
    '6mo': { range: '6mo', interval: '1d' },
    '1y':  { range: '1y',  interval: '1d' },
    '3y':  { range: '3y',  interval: '1wk' },
    '5y':  { range: '5y',  interval: '1wk' },
  };
  const { range: yahooRange, interval } = rangeMap[range] || rangeMap['1y'];

  try {
    if (isFutures) {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${yahooRange}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
      );
      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
      const price = meta?.regularMarketPrice ?? closes.at(-1);
      const prev = closes.at(-2);
      const dp = prev ? ((price - prev) / prev * 100) : 0;
      res.status(200).json({ quote: { c: price, dp, d: price - (prev ?? price) }, hist: data });
    } else {
      const [finnRes, yahooRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`),
        fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${yahooRange}`,
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
