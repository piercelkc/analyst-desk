/**
 * Edge Function: /api/macro
 * Fetches macro indicators from FRED (Federal Reserve Economic Data).
 * Free API — requires FRED_API_KEY environment variable set in Vercel.
 *
 * Series fetched:
 *   DGS1MO  - 1-Month Treasury
 *   DGS3MO  - 3-Month Treasury
 *   DGS2    - 2-Year Treasury
 *   DGS5    - 5-Year Treasury
 *   DGS10   - 10-Year Treasury
 *   DGS30   - 30-Year Treasury
 *   DFEDTARU - Fed Funds Target Rate Upper Bound
 *   CPIAUCSL - CPI All Urban (YoY computed)
 *   CPILFESL - Core CPI ex Food & Energy
 *   PCEPILFE - Core PCE Price Index
 *   UNRATE   - Unemployment Rate
 *   A191RL1Q225SBEA - Real GDP Growth QoQ
 *   MANEMP  - ISM Manufacturing (proxy: Mfg Employment)
 */

export const config = { runtime: 'edge' };

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

async function fetchSeries(seriesId, apiKey, limit = 2) {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: ${res.status}`);
  const json = await res.json();
  return json.observations ?? [];
}

function latest(obs) {
  // obs sorted desc; find first non-missing value
  const valid = obs.filter(o => o.value !== '.' && o.value !== '');
  return valid[0] ?? null;
}

function prior(obs) {
  const valid = obs.filter(o => o.value !== '.' && o.value !== '');
  return valid[1] ?? null;
}

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=3600, stale-while-revalidate=1800',
  };

  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    // Return hardcoded fallback data when no API key is configured
    return new Response(JSON.stringify({
      yields: fallbackYields(),
      macro: fallbackMacro(),
      fedFunds: '5.25–5.50%',
      error: 'FRED_API_KEY not set — showing cached data. Add it in Vercel Environment Variables.',
      timestamp: new Date().toISOString(),
    }), { status: 200, headers });
  }

  try {
    // Fetch all series in parallel for speed
    const [
      t1m, t3m, t2y, t5y, t10y, t30y,
      fedFundsObs,
      cpiObs, coreCpiObs, corePceObs,
      unrateObs, gdpObs,
    ] = await Promise.all([
      fetchSeries('DGS1MO',  apiKey, 3),
      fetchSeries('DGS3MO',  apiKey, 3),
      fetchSeries('DGS2',    apiKey, 3),
      fetchSeries('DGS5',    apiKey, 3),
      fetchSeries('DGS10',   apiKey, 3),
      fetchSeries('DGS30',   apiKey, 3),
      fetchSeries('DFEDTARU',apiKey, 2),
      fetchSeries('CPIAUCSL',apiKey, 14),  // need 13 months for YoY
      fetchSeries('CPILFESL',apiKey, 14),
      fetchSeries('PCEPILFE', apiKey, 3),
      fetchSeries('UNRATE',  apiKey, 3),
      fetchSeries('A191RL1Q225SBEA', apiKey, 3),
    ]);

    // Helper: compute YoY % change from monthly series (sorted desc)
    function yoy(obs) {
      const valid = obs.filter(o => o.value !== '.' && o.value !== '');
      if (valid.length < 13) return null;
      const now  = parseFloat(valid[0].value);
      const ago  = parseFloat(valid[12].value);
      return +((now - ago) / ago * 100).toFixed(2);
    }

    // Build yield objects
    const buildYield = (obs, tenor) => {
      const l = latest(obs);
      const p = prior(obs);
      const rate = l ? parseFloat(l.value) : null;
      const prevRate = p ? parseFloat(p.value) : null;
      const chg = (rate !== null && prevRate !== null)
        ? +((rate - prevRate) * 100).toFixed(1)  // in bps
        : null;
      return { tenor, rate: rate ? rate.toFixed(2) : 'N/A', chg: chg ?? 0, date: l?.date };
    };

    const yields = [
      buildYield(t1m,  '1M'),
      buildYield(t3m,  '3M'),
      buildYield(t2y,  '2Y'),
      buildYield(t5y,  '5Y'),
      buildYield(t10y, '10Y'),
      buildYield(t30y, '30Y'),
    ];

    // Spreads
    const r2y  = parseFloat(latest(t2y)?.value ?? '0');
    const r3m  = parseFloat(latest(t3m)?.value ?? '0');
    const r10y = parseFloat(latest(t10y)?.value ?? '0');
    const spread2s10s = +((r10y - r2y).toFixed(2));
    const spread3m10y = +((r10y - r3m).toFixed(2));

    // Fed funds
    const ffLatest = latest(fedFundsObs);
    const fedFundsRate = ffLatest ? `${parseFloat(ffLatest.value).toFixed(2)}%` : 'N/A';

    // CPI YoY
    const cpiYoY     = yoy(cpiObs);
    const coreCpiYoY = yoy(coreCpiObs);
    const corePceL   = latest(corePceObs);
    const corePceP   = prior(corePceObs);

    // Unemployment
    const unrateL = latest(unrateObs);
    const unrateP = prior(unrateObs);

    // GDP
    const gdpL = latest(gdpObs);
    const gdpP = prior(gdpObs);

    const macro = [
      {
        name: 'CPI YoY',
        latest: cpiYoY !== null ? `${cpiYoY}%` : 'N/A',
        prior: 'Prior mo.',
        signal: cpiYoY !== null ? (cpiYoY > 3.5 ? 'negative' : cpiYoY > 2.5 ? 'neutral' : 'positive') : 'neutral',
        trend: cpiYoY !== null && coreCpiYoY !== null ? (cpiYoY < coreCpiYoY ? 'dn' : 'up') : 'neutral',
      },
      {
        name: 'Core CPI YoY',
        latest: coreCpiYoY !== null ? `${coreCpiYoY}%` : 'N/A',
        prior: 'Prior mo.',
        signal: coreCpiYoY !== null ? (coreCpiYoY > 3 ? 'negative' : coreCpiYoY > 2 ? 'neutral' : 'positive') : 'neutral',
        trend: 'dn',
      },
      {
        name: 'Core PCE',
        latest: corePceL ? `${parseFloat(corePceL.value).toFixed(1)}` : 'N/A',
        prior: corePceP ? `${parseFloat(corePceP.value).toFixed(1)}` : '--',
        signal: corePceL ? (parseFloat(corePceL.value) > 110 ? 'negative' : 'neutral') : 'neutral',
        trend: corePceL && corePceP
          ? (parseFloat(corePceL.value) < parseFloat(corePceP.value) ? 'dn' : 'up')
          : 'neutral',
      },
      {
        name: 'Unemployment',
        latest: unrateL ? `${parseFloat(unrateL.value).toFixed(1)}%` : 'N/A',
        prior: unrateP ? `${parseFloat(unrateP.value).toFixed(1)}%` : '--',
        signal: unrateL ? (parseFloat(unrateL.value) > 5 ? 'negative' : parseFloat(unrateL.value) > 4 ? 'neutral' : 'positive') : 'neutral',
        trend: unrateL && unrateP
          ? (parseFloat(unrateL.value) > parseFloat(unrateP.value) ? 'up' : 'dn')
          : 'neutral',
      },
      {
        name: 'Real GDP QoQ',
        latest: gdpL ? `${parseFloat(gdpL.value).toFixed(1)}%` : 'N/A',
        prior: gdpP ? `${parseFloat(gdpP.value).toFixed(1)}%` : '--',
        signal: gdpL ? (parseFloat(gdpL.value) < 0 ? 'negative' : parseFloat(gdpL.value) < 1.5 ? 'neutral' : 'positive') : 'neutral',
        trend: gdpL && gdpP
          ? (parseFloat(gdpL.value) > parseFloat(gdpP.value) ? 'up' : 'dn')
          : 'neutral',
      },
      {
        name: '10Y Real Yield',
        latest: r10y ? `${r10y.toFixed(2)}%` : 'N/A',
        prior: '--',
        signal: r10y > 2.5 ? 'negative' : r10y > 1.5 ? 'neutral' : 'positive',
        trend: 'up',
      },
    ];

    return new Response(JSON.stringify({
      yields,
      spread2s10s,
      spread3m10y,
      fedFundsRate,
      macro,
      timestamp: new Date().toISOString(),
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      yields: fallbackYields(),
      macro: fallbackMacro(),
      fedFunds: '5.25–5.50%',
      error: `FRED fetch failed: ${err.message}`,
      timestamp: new Date().toISOString(),
    }), { status: 200, headers });
  }
}

// ── Fallback data shown when API key isn't set yet ────────────────────────────
function fallbackYields() {
  return [
    { tenor: '1M',  rate: '5.27', chg: 0.0 },
    { tenor: '3M',  rate: '5.24', chg: -1.0 },
    { tenor: '2Y',  rate: '4.62', chg: 2.0 },
    { tenor: '5Y',  rate: '4.38', chg: 1.5 },
    { tenor: '10Y', rate: '4.45', chg: 1.0 },
    { tenor: '30Y', rate: '4.60', chg: 0.5 },
  ];
}

function fallbackMacro() {
  return [
    { name: 'CPI YoY',      latest: '3.2%',   prior: '3.4%',  signal: 'neutral',  trend: 'dn' },
    { name: 'Core CPI YoY', latest: '3.8%',   prior: '3.9%',  signal: 'negative', trend: 'dn' },
    { name: 'Core PCE',     latest: '2.8%',   prior: '2.9%',  signal: 'neutral',  trend: 'dn' },
    { name: 'Unemployment', latest: '3.9%',   prior: '3.7%',  signal: 'neutral',  trend: 'up' },
    { name: 'Real GDP QoQ', latest: '1.6%',   prior: '3.4%',  signal: 'neutral',  trend: 'dn' },
    { name: '10Y Real Yield', latest: '2.15%', prior: '2.0%', signal: 'neutral',  trend: 'up' },
  ];
}
