# ShopNGo

A multi-user marketplace (discover, compare, buy, track) built with Next.js, with a
built-in **data mining layer** that turns order history into product bundles,
customer segments, recommendations, sales forecasts and anomaly alerts.

The app runs out of the box with demo catalogue data and a seeded synthetic order
history, so every feature (including the data mining dashboard) can be tried without
a database or any API keys.

## Features

**Marketplace**
- Catalogue, categories, deterministic search, product and store pages
- Cart with quotes, orders with a validated fulfilment state machine, mock payments (dev only)
- Seller applications and listings, moderator review queue and audit log
- Firebase authentication with role-based access (buyer, seller, moderator, admin)
- Reviews, messages, notifications, addresses, profile
- Six themes, installable PWA, voice search, optional AI assistant (off by default)

**Data mining** (`src/features/analytics`)
- **Market basket analysis** - Apriori frequent itemsets and association rules
  (support, confidence, lift), shown as "Frequently bought together" on product pages
- **Customer segmentation** - RFM (recency, frequency, monetary) scoring with quintile
  segments (Champions, Loyal, At risk, ...) plus k-means++ clustering on standardized RFM
- **Recommendations** - item-to-item collaborative filtering (cosine similarity),
  personalised picks per customer and best sellers; `/api/recommendations` blends
  basket rules (60%) with similarity (40%)
- **Sales trends and forecasting** - daily revenue and order series, moving average,
  least-squares trend line, Holt (double exponential smoothing) forecast, top products
- **Anomaly detection** - unusual days by robust z-score (median absolute deviation)
  against a rolling median, for both revenue and order volume; unusually large or
  small orders by IQR fences
- **Insights dashboard** at `/insights` with a revenue chart, forecast, rules,
  clusters, anomalies and best sellers

## Quick start

Requirements: Node.js 20+ (22 recommended) and npm.

```bash
git clone https://github.com/Kuldeep2025/ShopNGo.git
cd ShopNGo
npm ci
cp .env.example .env.local   # optional; the app runs on demo data without it
npm run dev
```

Open http://localhost:3000, then try:
- http://localhost:3000/insights - data mining dashboard (sample data)
- http://localhost:3000/products/complete-python-for-beginners - "Frequently bought together"

## Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # run the production build
npm test            # unit tests (Vitest)
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run db:generate # Prisma client
npm run db:push     # push schema to the database
```

## Data mining API

All endpoints return JSON. With no database configured they run on the seeded sample
history (`"source": "sample"`). With a database, they mine paid, processing, shipped
and delivered orders from the last 180 days, and store-wide analytics require a
moderator or admin token (`Authorization: Bearer <Firebase ID token>`).

| Endpoint | Description |
|----------|-------------|
| `GET /api/analytics/frequently-bought-together?slug=<product>&limit=4` | Bundles for a product (public) |
| `GET /api/analytics/segments?k=4` | RFM segments and k-means clusters |
| `GET /api/analytics/trends?window=7&horizon=14` | Daily series, moving average, trend, forecast |
| `GET /api/analytics/anomalies?threshold=3.5` | Unusual days and unusual orders |
| `GET /api/analytics/insights` | Everything above in one response (used by `/insights`) |
| `GET /api/recommendations?slug=<product>` | Blended recommendations; best sellers without a slug |

### Sample data

`generateSampleTransactions()` in `src/features/analytics/sampleData.ts` creates a
deterministic 90-day order history (120 customers, seeded random generator) over the
demo catalogue. It contains planted patterns so the algorithms can be checked:
product bundles, steady growth, a weekend uplift, two traffic spikes, one outage day
and a few bulk orders. The tests assert that the miners recover them.

### Using the library directly

```ts
import {
  generateSampleTransactions,
  frequentlyBoughtTogether,
  segmentCustomers,
  salesTrends,
  detectActivityAnomalies,
  dailySeries,
  toBaskets,
} from "@/features/analytics";

const tx = generateSampleTransactions();
frequentlyBoughtTogether(toBaskets(tx), "demo-2");
segmentCustomers(tx, { k: 4 });
salesTrends(tx, { window: 7, horizon: 14 });
detectActivityAnomalies(dailySeries(tx));
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in only what you need. Never commit
`.env.local` or `.dev.vars`.

- **Firebase (auth)**: `NEXT_PUBLIC_FIREBASE_*` from your Firebase web app, and
  `FIREBASE_ADMIN_*` from a service account key (server only).
- **Database**: `DATABASE_URL` (PostgreSQL, e.g. Neon). Then run
  `npm run db:generate && npm run db:push`.
- **Production**: `SESSION_SECRET` (32+ random characters) and `APP_URL`.
- **AI assistant (optional)**: `AI_ENABLED=true`, `AI_PROVIDER=groq|openrouter`, and
  `GROQ_API_KEY` or `OPENROUTER_API_KEY`. Off by default.
- **Payments**: mock only; mock settlement is disabled when `NODE_ENV=production`.

Without a database the catalogue uses demo products. Auth, cart and orders need
Firebase and a database. `/health` is a readiness check and returns 503 in production
until Firebase and the database are configured.

## Project structure

```
prisma/schema.prisma        database schema (users, stores, listings, orders, ...)
public/                     icons, PWA manifest, service worker, product images
src/app/                    Next.js App Router pages and API routes
  api/analytics/            data mining endpoints
  api/recommendations/      blended recommendations
  insights/                 data mining dashboard
src/components/             UI components (layout, insights, ai, pwa, ...)
src/features/               domain logic
  analytics/                data mining: apriori, kmeans, rfm, recommend,
                            trends, anomaly, sampleData, insights (+ tests)
  catalogue/ cart/ orders/ sellers/ identity/ reviews/ search/ ai/ ...
src/lib/                    env validation, Prisma client, auth, demo data
docs/DEPLOY_CLOUDFLARE.md   Cloudflare Workers deployment notes
Dockerfile                  Node 22 standalone image
```

## Deployment

- **Docker / Node**: `npm run build`, then `node .next/standalone/server.js`
  (the provided Dockerfile does this). Supply secrets through your host's
  environment manager.
- **Cloudflare Workers**: `npm run deploy` (see `docs/DEPLOY_CLOUDFLARE.md`); set
  secrets with `npx wrangler secret put <NAME>`.

## Testing

```bash
npm test
```

37 unit tests cover the order state machine, catalogue visibility rules and the data
mining layer (Apriori counts and rule metrics, k-means separation and determinism,
RFM segments, recommendations, moving average, trend and forecast, anomaly
detection, and recovery of the planted patterns in the sample data).
