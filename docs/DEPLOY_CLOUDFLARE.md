# Deploying ShopNGo to Cloudflare (Workers, via OpenNext)

The app is a full-stack Next.js 15 project (server routes, API endpoints), so it deploys
to **Cloudflare Workers** using the official [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)
adapter. Everything needed is already wired into the project:

- `wrangler.jsonc` – Worker config (assets binding, Node compat)
- `open-next.config.ts` – adapter config
- `public/_headers` – static asset caching + basic security headers
- `.dev.vars` – local preview secrets (**not committed**; see `.gitignore`)
- `package.json` scripts: `preview`, `deploy`, `upload`, `cf-typegen`

## 1. One-time setup

```bash
cd shopngo
npm ci                        # installs deps incl. wrangler + @opennextjs/cloudflare
npx wrangler login            # opens browser, authorize your Cloudflare account
```

Create `.env.local` from `.env.example` and fill in your keys (AI, Firebase, Neon, SESSION_SECRET).

## 2. Preview locally in the real Workers runtime (optional but recommended)

```bash
npm run preview
```

This builds and serves the app through workerd at `http://localhost:8787` —
the exact same runtime Cloudflare will use in production.
Secrets for preview come from `.dev.vars` (already created in the project;
add your own values there or edit the existing one).

## 3. Set your production secrets

Secrets must be set per Worker – they are never in the code bundle:

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put SESSION_SECRET
# only if you use Firebase Admin / Neon in production:
npx wrangler secret put FIREBASE_ADMIN_PROJECT_ID
npx wrangler secret put FIREBASE_ADMIN_CLIENT_EMAIL
npx wrangler secret put FIREBASE_ADMIN_PRIVATE_KEY
npx wrangler secret put DATABASE_URL
```

Non-secret vars (client Firebase config, feature flags) can go in the Cloudflare
dashboard → Workers & Pages → shopngo → Settings → Variables, or in `wrangler.jsonc` under `vars`.

## 4. Deploy

```bash
npm run deploy
```

That runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
On first deploy Wrangler prints your live URL, e.g. `https://shopngo.<your-subdomain>.workers.dev`.

## 5. Custom domain (optional)

Cloudflare dashboard → Workers & Pages → shopngo → Settings → Domains & Routes →
Add custom domain (the domain must be on your Cloudflare account).

## 6. Git-based automatic deploys (optional)

Connect your GitHub/GitLab repo in dashboard → Workers & Pages → shopngo → Settings →
Builds. Cloudflare runs `npm run deploy` on every push to your production branch.

## Notes & gotchas

- **Do not** add `export const runtime = "edge"` to any route — the edge runtime is
  not supported by the adapter.
- `output: "standalone"` in `next.config.ts` is harmless here; the adapter overrides it.
- If you enable **R2 incremental cache** later, create a bucket and add an
  `r2_buckets` binding named `NEXT_INC_CACHE_R2_BUCKET` in `wrangler.jsonc`.
- The service worker (`public/sw.js`) caches only static assets (`/images/*`, icons),
  never API routes or pages — so deployments show fresh content immediately.
- After first deploy, verify `/health` returns `{"status": ...}` on your worker URL.
