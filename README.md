# Suvarna Nyayanidhi — Outreach Dashboard

## Setup

1. Install dependencies: `npm install`
2. Run locally: `npm run dev`
3. Build for production: `npm run build`

## Configuration

Edit the three webhook URLs at the top of `src/App.jsx`:

```js
const FLOW_URL_LOAD       = "YOUR_FLOW_1_WEBHOOK_URL";
const FLOW_URL_CRM_UPDATE = "YOUR_FLOW_2_WEBHOOK_URL";
const FLOW_URL_SEND       = "YOUR_FLOW_3_WEBHOOK_URL";
```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo
3. Vercel auto-detects Vite — just click Deploy
