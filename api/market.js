/**
 * Edge Function: /api/market
 * Proxies Yahoo Finance for real-time quotes.
 * Runs on Vercel Edge — no CORS, no API key needed.
 */

export const config = { runtime: 'edge' };

const SYMBOLS = [
  // Indices
  '%5EGSPC',   // S&P 500
  '%5EIXIC',   // NASDAQ Composite
  '%5EDJI',    // Dow Jones
  '%5ERUT',    // Russell 2000
  // Volatility
  '%5EVIX',    // VIX
  // Sector ETFs
  'XLK', 'XLV', 'XLF', 'XLE', 'XLI',
  'XLY', 'XLC', 'XLU', 'XLRE', 'XLB',
  // Commodities & FX
  'GC%3DF',    // Gold futures
  'CL%3DF',    // Crude Oil futures
  'DX-Y.NYB',  // DXY Dollar Index
  'BTC-USD',   // Bitcoin
];

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
  };

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${SYMBOLS.join(',')}&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) throw new Error(`Yahoo Finance responded ${res.status}`);

    const json = await res.json();
    const quotes = json?.quoteResponse?.result ?? [];

    // Map to clean objects
    const bySymbol = {};
    for (const q of quotes) {
      bySymbol[q.symbol] = {
        symbol: q.symbol,
        name: q.shortName ?? q.symbol,
        price: q.regularMarketPrice ?? null,
        change: q.regularMarketChange ?? null,
        changePct: q.regularMarketChangePercent ?? null,
        prevClose: q.regularMarketPreviousClose ?? null,
      };
    }

    // Structure the response
    const decode = (sym) => bySymbol[decodeURIComponent(sym)] ?? bySymbol[sym] ?? null;

    const payload = {
      indices: [
        decode('%5EGSPC') ?? bySymbol['^GSPC'],
        decode('%5EIXIC') ?? bySymbol['^IXIC'],
        decode('%5EDJI')  ?? bySymbol['^DJI'],
        decode('%5ERUT')  ?? bySymbol['^RUT'],
      ].filter(Boolean),
      vix: decode('%5EVIX') ?? bySymbol['^VIX'] ?? null,
      sectors: [
        bySymbol['XLK'], bySymbol['XLV'], bySymbol['XLF'],
        bySymbol['XLE'], bySymbol['XLI'], bySymbol['XLY'],
        bySymbol['XLC'], bySymbol['XLU'], bySymbol['XLRE'], bySymbol['XLB'],
      ].filter(Boolean),
      commodities: {
        gold:  decode('GC%3DF')  ?? bySymbol['GC=F']  ?? null,
        oil:   decode('CL%3DF')  ?? bySymbol['CL=F']  ?? null,
        dxy:   bySymbol['DX-Y.NYB'] ?? null,
        btc:   bySymbol['BTC-USD']  ?? null,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), { status: 200, headers });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers }
    );
  }
}
