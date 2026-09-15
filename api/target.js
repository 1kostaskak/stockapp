// GET /api/target?ticker=AAPL
// Επιστρέφει { target: {mean,median,high,low,updated} | null, rec: {buy,hold,sell,period} | null }
//   - /stock/recommendation: FREE tier → consensus buy/hold/sell
//   - /stock/price-target:   PREMIUM → καλείται ΜΟΝΟ αν FINNHUB_PREMIUM=1 (αλλιώς σπαταλάει 1 call/ticker)
// Σε upstream σφάλμα (429/403/5xx) επιστρέφει { error, status } ΧΩΡΙΣ cache header,
// ώστε το frontend να το ξεχωρίζει από "δεν υπάρχουν στοιχεία" και να μην cache-άρεται στο edge.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'No ticker' });

  const FINNHUB_KEY = process.env.FINNHUB_KEY;
  if (!FINNHUB_KEY) return res.status(500).json({ error: 'Missing FINNHUB_KEY env var' });
  const PREMIUM = process.env.FINNHUB_PREMIUM === '1';

  const sym = encodeURIComponent(ticker);
  const safeJson = async (r) => { try { return await r.json(); } catch { return null; } };

  try {
    const rRes = await fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${sym}&token=${FINNHUB_KEY}`);
    if (!rRes.ok) {
      // ΔΕΝ βάζουμε Cache-Control εδώ — το σφάλμα δεν πρέπει να κλειδωθεί στο edge cache
      return res.status(200).json({ target: null, rec: null, error: `finnhub ${rRes.status}`, status: rRes.status });
    }
    const r = await safeJson(rRes);
    const latest = Array.isArray(r) && r.length ? r[0] : null; // νεότερο πρώτο
    const rec = latest
      ? {
          buy:  (latest.buy  || 0) + (latest.strongBuy  || 0),
          hold: (latest.hold || 0),
          sell: (latest.sell || 0) + (latest.strongSell || 0),
          period: latest.period,
        }
      : null;

    let target = null;
    if (PREMIUM) {
      const tRes = await fetch(`https://finnhub.io/api/v1/stock/price-target?symbol=${sym}&token=${FINNHUB_KEY}`);
      const t = tRes.ok ? await safeJson(tRes) : null;
      if (t && t.targetMean > 0) {
        target = { mean: t.targetMean, median: t.targetMedian, high: t.targetHigh, low: t.targetLow, updated: t.lastUpdated };
      }
    }

    // Cache μόνο επιτυχημένες απαντήσεις (ακόμα κι αν rec=null — αυτό είναι έγκυρο "χωρίς στοιχεία", π.χ. ETF)
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ target, rec });
  } catch (e) {
    res.status(200).json({ target: null, rec: null, error: e.message });
  }
}
