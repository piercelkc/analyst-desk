# 📊 The Analyst Desk — Real Data Edition

A senior equity analyst dashboard with **live data** from free APIs.

---

## How the data works

| What you see | Where it comes from | Cost |
|---|---|---|
| Index prices (SPX, NDX, etc.) | Yahoo Finance (via `/api/market`) | Free, no key |
| VIX & sector ETFs | Yahoo Finance (via `/api/market`) | Free, no key |
| Gold, Oil, DXY, BTC | Yahoo Finance (via `/api/market`) | Free, no key |
| Fear & Greed Index | CNN (via `/api/feargreed`) | Free, no key |
| Treasury yields | FRED API (via `/api/macro`) | Free, needs key |
| CPI, GDP, Unemployment | FRED API (via `/api/macro`) | Free, needs key |
| AI Morning Brief | Claude API | Uses your claude.ai session |

---

## File structure

```
analyst-desk/
├── index.html          ← The dashboard UI
├── vercel.json         ← Vercel routing config
├── package.json        ← Marks this as a Node project
├── README.md           ← This file
└── api/
    ├── market.js       ← Edge Function: Yahoo Finance proxy
    ├── feargreed.js    ← Edge Function: CNN Fear & Greed proxy
    └── macro.js        ← Edge Function: FRED macro data proxy
```

---

## Step 1 — Get a free FRED API key (5 minutes)

FRED is the Federal Reserve's free public data API.

1. Go to **https://fredaccount.stlouisfed.org/login/secure**
2. Click **"Create a New Account"** — it's free, no credit card
3. After signing in, go to **My Account → API Keys**
4. Click **"Request API Key"**, fill in a brief description like "personal dashboard"
5. Your key looks like: `abcdef1234567890abcdef1234567890`
6. **Copy it** — you'll need it in Step 3

> Without a FRED key, yields and macro data show fallback/cached values. Everything else (prices, Fear & Greed) works without any key.

---

## Step 2 — Upload files to GitHub

1. Go to **https://github.com/new** and create a repo named `analyst-desk`
2. Set it **Public**, click **Create repository**
3. Click **"uploading an existing file"**
4. Upload **all files and the `api/` folder**:
   - `index.html`
   - `vercel.json`
   - `package.json`
   - `api/market.js`
   - `api/feargreed.js`
   - `api/macro.js`
5. Click **Commit changes**

---

## Step 3 — Deploy on Vercel + add your FRED key

1. Go to **https://vercel.com** and sign in with GitHub
2. Click **Add New → Project**, import `analyst-desk`
3. **Before clicking Deploy**, click **"Environment Variables"**
4. Add this variable:
   - **Name:** `FRED_API_KEY`
   - **Value:** your key from Step 1
5. Click **Add**, then click **Deploy**

Your live URL will be something like `https://analyst-desk-xyz.vercel.app`

---

## Step 4 — Future updates

Any change you commit to GitHub auto-redeploys in ~30 seconds.

To update a file:
1. Go to your GitHub repo
2. Click the file → click the ✏️ pencil icon
3. Edit → **Commit changes**

Done. Vercel picks it up automatically.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Yields show "N/A" | FRED key not set — go to Vercel Dashboard → your project → Settings → Environment Variables |
| Fear & Greed shows 50 | CNN API was unreachable; refreshes automatically |
| Prices all zero | Yahoo Finance rate limit hit; wait 1 minute and refresh |
| Deploy failed | Make sure `api/` folder is at the root of the repo, not nested inside another folder |
| Want to test locally | Run `npx vercel dev` in the project folder |

---

## Refreshing your FRED key

FRED keys don't expire. If you ever need to rotate it:
1. Vercel Dashboard → your project → **Settings → Environment Variables**
2. Click the key → **Edit** → paste new value
3. Click **Save** → Vercel auto-redeploys
