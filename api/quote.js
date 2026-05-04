export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'No ticker' });
  
  try {
    // Fetch both quote (for daily change) and chart (for RSI/MA history)
    const [quoteRes, chartRes] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      }),
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      })
    ]);

    const quoteJson = await quoteRes.json();
    const chartJson = await chartRes.json();

    const quote = quoteJson?.quoteResponse?.result?.[0];
    
    // Inject accurate daily change data into chart response
    if (quote && chartJson?.chart?.result?.[0]) {
      chartJson.chart.result[0].meta.regularMarketPrice = quote.regularMarketPrice;
      chartJson.chart.result[0].meta.regularMarketPreviousClose = quote.regularMarketPreviousClose;
      chartJson.chart.result[0].meta.regularMarketChangePercent = quote.regularMarketChangePercent;
    }

    res.status(200).json(chartJson);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
