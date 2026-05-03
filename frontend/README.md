# GasHedge — Fuel Hedging Advisory Portal

A Next.js app for fuel-cost advisors who help small businesses (trucking, landscaping, delivery, construction) hedge against fuel price volatility.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | What it does |
|----------|----------|--------------|
| `POSTGRES_URL` | Recommended | Vercel Postgres / Neon connection string. Without it, the app falls back to an in-memory store that resets on every server restart. Set automatically when you attach a Vercel Postgres database in the dashboard. |
| `EIA_API_KEY` | Recommended | EIA fuel price API key from [eia.gov/opendata](https://www.eia.gov/opendata/). Without it, prices fall back to hardcoded defaults (gasoline $3.50, diesel $3.90). |
| `ALPHA_VANTAGE_API_KEY` | Optional | ETF prices (UGA, USO, BNO, UNL). Falls back to recent defaults if missing. Free tier is 5 calls/min. |
| `ANTHROPIC_API_KEY` | Optional | Claude AI integration for advisory recommendations and Q&A. Falls back to clear "API key not configured" error if missing. |

## Database

The app supports two modes:

1. **In-memory (default for local dev)** — three demo companies + three demo deals seeded automatically. Data resets when the server restarts.
2. **Vercel Postgres / Neon (production)** — set `POSTGRES_URL` and the schema will be created automatically on first request, with the same demo data seeded if the `companies` table is empty.

Tables created automatically:
- `companies` — company records (CRUD + soft-delete)
- `deals` — advisory deals tied to a company (CRUD)
- `hedging_plans` — saved hedging plans tied to a company and optionally a deal

## Deploy on Vercel

1. Push the repo to Vercel.
2. In the Vercel dashboard → Storage → Create → Postgres. The `POSTGRES_URL` env var is set automatically.
3. Add `EIA_API_KEY`, `ALPHA_VANTAGE_API_KEY`, and `ANTHROPIC_API_KEY` in Project Settings → Environment Variables.
4. Redeploy.

## Architecture

- **Next.js 16.2.1** with App Router (route handlers in `src/app/api/`)
- **React 19.2.4** + **Tailwind v4** + **lucide-react** for UI
- **`@vercel/postgres`** for persistence
- **`@anthropic-ai/sdk`** for AI features (Claude Sonnet 4)
- **EIA API** for live fuel prices, **Alpha Vantage** for ETF prices

Key files:
- `src/lib/store.ts` — CRUD layer (Postgres or in-memory, same API)
- `src/lib/db.ts` — Postgres client + schema management
- `src/lib/hedging-engine.ts` — All hedging math (ETF / options / futures)
- `src/lib/ai-client.ts` — Anthropic SDK wrapper

## License

Series 65/66 Licensed — ETF & Futures Advisory.
