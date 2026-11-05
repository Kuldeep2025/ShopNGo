# ShopNGo

A multi-store marketplace built with Next.js 15, Prisma (PostgreSQL / Neon), Firebase sign-in, and installable PWA support. It includes search, cart, checkout, orders, seller and moderator tools, admin analytics, data-mining recommendations (frequently bought together, similar items, customer segments) and an optional AI shopping assistant.

Without a database the app runs in demo mode with sample products, so you can always browse it.

## Deploy to Vercel

1. Create free accounts on Vercel, Neon and Firebase.
2. Neon: create a project and copy the connection string.
3. Firebase: create a project, add a Web app, and copy its config values. Turn on Authentication, then Email/Password and Google sign-in. Under Authentication settings, add your Vercel domain to Authorized domains.
4. Firebase: Project settings, Service accounts, Generate new private key. Use the project id, client email and private key from that file for the FIREBASE_ADMIN_* variables.
5. Vercel: Add New Project, import this GitHub repository.
6. In Environment Variables add every variable from `.env.example` (see the list below). Deploy.
7. Set up the database once from your computer (see next section).
8. Open the site, create an account with the email in ADMIN_EMAILS; it becomes the admin.

## Database setup

```
cp .env.example .env.local   # fill in DATABASE_URL (direct Neon string)
npm install
npm run db:setup             # applies migrations and loads sample data
```

Alternative: `npm run db:push` then `npm run db:seed`. The seed is safe to run again.

### Mall catalogue

The seed adds 2,230 mall products across 10 departments and 41 sub-categories (15 stores), each with a name, brand, price, stock, a three-sentence description and an image with alt text. It also adds about 3,000 past orders and 1,400 reviews so recommendations and analytics have data. Products are generated from a fixed seed (`src/lib/mall`), so every run produces the same catalogue and re-running adds nothing twice.

The images are generated illustrations, not photographs. They live in `public/images/mall`; `npm run mall:images` rewrites them. Search pages hold up to 50 products and use page cursors, so the whole catalogue can be walked in any sort order.

## Environment variables

- Firebase client: NEXT_PUBLIC_FIREBASE_API_KEY, _AUTH_DOMAIN, _PROJECT_ID, _STORAGE_BUCKET, _MESSAGING_SENDER_ID, _APP_ID (_MEASUREMENT_ID optional)
- Firebase admin: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
- DATABASE_URL (Neon), SESSION_SECRET (32+ random characters), ADMIN_EMAILS
- Optional AI assistant: AI_ENABLED=true, AI_PROVIDER, GROQ_API_KEY or OPENROUTER_API_KEY
- DEMO_PAYMENTS_ENABLED=true keeps the demo payment (no real money). Real payments are not connected.

Never commit `.env.local`.

## Local development

```
npm install
npm run dev
npm run typecheck && npm run lint && npm test
```

### Local end-to-end check

Run the app against a local Postgres with `FIREBASE_ADMIN_PROJECT_ID=demo-shopngo` and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, start `node scripts/fake-auth-emulator.mjs`, then run `npm run e2e` (set `BASE` if the app is not on port 3000). It signs test users in with unsigned tokens and walks through browsing, search, cart, checkout, demo payment, orders, cancel, reviews, seller and moderator flows, admin analytics and the PWA files. It does not test real Firebase sign-in.

## PWA

The app has a web manifest, icons, a service worker with offline page and caching, and an install prompt. On a phone, open the site and choose Install app or Add to Home screen. Browsing pages seen before works offline; cart, checkout and sign-in need a connection.

## Accessibility

Labelled form fields, error and status messages announced to screen readers, skip link, visible focus, and keyboard-friendly controls.

## Other targets

A Dockerfile (set BUILD_STANDALONE=1) and an optional Cloudflare/OpenNext config are included.
