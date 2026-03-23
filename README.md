# 📊 The Analyst Desk — Daily Equity Dashboard

A senior equity analyst's daily market intelligence dashboard with AI-powered morning briefs.

## Features

| Module | What it shows |
|--------|---------------|
| **Key Indices** | S&P 500, NASDAQ 100, Dow Jones, Russell 2000 |
| **Fear & Greed** | CNN-style index with needle meter & trend |
| **VIX / MOVE** | Equity + bond vol regimes with sparklines |
| **Yield Curve** | Full curve from 1M→30Y + 2s10s, 3m10y spreads |
| **Macro Dashboard** | CPI, PCE, PMI, GDP, unemployment signals |
| **Sector Heatmap** | All 10 S&P sectors color-coded by performance |
| **Market Breadth** | Advance/decline, new highs/lows, McClellan oscillator |
| **AI Morning Brief** | Claude AI generates analyst commentary each load |

## 🚀 Deploy to Vercel (Free, 3 steps)

### Option A — Vercel CLI (Fastest)
```bash
npm install -g vercel
cd equity-dashboard
vercel --prod
```

### Option B — GitHub + Vercel UI
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your repo → **Deploy**

That's it — Vercel auto-detects the static HTML and deploys instantly.

## 🔌 Connecting Real Data (Optional Upgrades)

The dashboard currently uses simulated market data. To connect live APIs:

### Free Data Sources
| API | What for | Free tier |
|-----|----------|-----------|
| [Yahoo Finance (unofficial)](https://github.com/gadicc/node-yahoo-finance2) | Index prices | Unlimited |
| [FRED API](https://fred.stlouisfed.org/docs/api/fred/) | Macro indicators | Free with key |
| [Alpha Vantage](https://www.alphavantage.co) | Stocks, forex, crypto | 25 req/day free |
| [CNN Fear & Greed](https://production.dataviz.cnn.io/index/fearandgreed/graphdata) | Actual index | Free (unofficial) |

### To add live Fear & Greed data:
In `index.html`, replace the `getMarketData()` fearGreed section with:
```javascript
const fgRes = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata');
const fgData = await fgRes.json();
const score = Math.round(fgData.fear_and_greed.score);
```
> Note: Add a Vercel Edge Function as a proxy to avoid CORS issues.

## 📁 File Structure
```
equity-dashboard/
├── index.html     # Complete dashboard (single file)
├── vercel.json    # Vercel deployment config
└── README.md      # This file
```

## 🤖 AI Brief
The morning brief uses the Claude API (claude-sonnet-4). The API key is 
injected automatically when running inside Claude.ai artifacts. For 
standalone deployment, add your own key:

```javascript
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'YOUR_ANTHROPIC_API_KEY',
  'anthropic-version': '2023-06-01'
}
```

Get your API key at [console.anthropic.com](https://console.anthropic.com).
