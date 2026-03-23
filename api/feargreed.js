/**
 * Edge Function: /api/feargreed
 * Proxies CNN's Fear & Greed index.
 * Runs on Vercel Edge — bypasses CORS restrictions.
 */

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=300, stale-while-revalidate=120',
  };

  try {
    const res = await fetch(
      'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.cnn.com/markets/fear-and-greed',
          'Accept': 'application/json',
        },
      }
    );

    if (!res.ok) throw new Error(`CNN API responded ${res.status}`);

    const json = await res.json();

    const current = json.fear_and_greed ?? {};
    const historical = json.fear_and_greed_historical?.data ?? [];

    // Get previous readings from historical data
    // Data is an array of [timestamp, score] sorted newest-first
    const score      = Math.round(current.score ?? 50);
    const rating     = current.rating ?? 'neutral';

    // Pull historical scores for trend
    const prev7d  = historical[6]  ? Math.round(historical[6][1])  : null;
    const prev30d = historical[29] ? Math.round(historical[29][1]) : null;
    const prev1y  = historical[364]? Math.round(historical[364][1]): null;

    // Last 30 days for sparkline
    const history30d = historical.slice(0, 30).map(d => Math.round(d[1])).reverse();

    return new Response(JSON.stringify({
      score,
      rating,      // 'extreme fear' | 'fear' | 'neutral' | 'greed' | 'extreme greed'
      prev7d,
      prev30d,
      prev1y,
      history30d,
      timestamp: new Date().toISOString(),
    }), { status: 200, headers });

  } catch (err) {
    // Fallback: return a neutral placeholder so the page still loads
    return new Response(JSON.stringify({
      score: 50,
      rating: 'neutral',
      prev7d: null,
      prev30d: null,
      prev1y: null,
      history30d: [],
      error: err.message,
      timestamp: new Date().toISOString(),
    }), { status: 200, headers });
  }
}
