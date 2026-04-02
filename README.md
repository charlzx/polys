# Polys

Polys is a prediction market intelligence app that unifies market data from Polymarket and Kalshi, adds AI-assisted analysis, tracks whale behavior, detects arbitrage spreads, and runs user alerts with in-app + email notifications.

## What the project does

- Unified market browsing across providers (Polymarket + Kalshi)
- Market detail pages with odds and historical price data
- Arbitrage detection between platforms
- Whale leaderboard, wallet activity feed, and wallet profile views
- User auth and personalization (watchlist, alerts, preferences)
- AI market summary, market intelligence, and watchlist suggestions
- Scheduled alert checks every 5 minutes via GitHub Actions cron

## Architecture summary

### App framework

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 + Radix UI
- React Query for client data fetching/caching

### State and auth

- Supabase SSR auth session refresh in [proxy.ts](proxy.ts)
- Browser and server Supabase clients in [lib/supabase/client.ts](lib/supabase/client.ts) and [lib/supabase/server.ts](lib/supabase/server.ts)
- App-level providers in [components/providers.tsx](components/providers.tsx)

### Startup behavior

- [instrumentation.ts](instrumentation.ts) runs startup migration checks in Node runtime
- [lib/supabase/migrate.ts](lib/supabase/migrate.ts) validates required tables and logs missing migration warnings

### Data sources

- Polymarket Gamma API for market metadata
- Polymarket CLOB API for price history/orderbook
- Polymarket Data API for whale activity/profile aggregation
- Kalshi Trade API v2 for events/markets/candlesticks
- Google Gemini API for AI outputs
- Guardian API and Reddit OAuth API for news
- Resend API for email delivery

## Tech stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Supabase (auth + Postgres)
- @tanstack/react-query
- Resend
- GitHub Actions

## Local development

### Prerequisites

- Node.js 20+
- npm 10+

### Install and run

```bash
npm install
npm run dev
```

Server starts on `http://localhost:5000`.

## Environment variables

Create `.env.local` in the project root:

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:5000
INTERNAL_API_BASE_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GEMINI_API_KEY=

# Email and cron
RESEND_API_KEY=
ALERTS_FROM_EMAIL=alerts@yourdomain.com
CRON_SECRET=
CRON_SECRETS=

# External providers
KALSHI_API_KEY=
GUARDIAN_API_KEY=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
```

### Env notes

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for server auth paths; [lib/supabase/server.ts](lib/supabase/server.ts) throws if missing.
- `SUPABASE_SERVICE_ROLE_KEY` is required for alert-check cron processing.
- `CRON_SECRET` protects cron-only routes.
- `CRON_SECRETS` is optional, comma-separated, for key rotation.
- `INTERNAL_API_BASE_URL` is optional, recommended in production for internal cron callbacks.
- `ALERTS_FROM_EMAIL` should be a Resend-verified sender domain.
- If `GEMINI_API_KEY` is missing, AI endpoints return 503.
- If Guardian/Reddit/Kalshi credentials are missing, those features degrade gracefully (empty data) instead of hard failure.

## Available scripts

- `npm run dev` - run dev server on `0.0.0.0:5000`
- `npm run build` - build production app
- `npm run start` - start production server on `0.0.0.0:5000`
- `npm run lint` - run ESLint
- `npm run type-check` - run TypeScript checks

## API surface

### Market data

- `GET /api/markets` - proxy to Gamma markets with cache headers
- `GET /api/markets/[id]` - single market proxy
- `GET /api/price-history` - CLOB price history proxy
- `GET /api/orderbook` - CLOB orderbook proxy

### AI (authenticated + rate-limited)

- `POST /api/ai/intelligence`
- `POST /api/ai/suggestions`
- `GET /api/ai/market-summary`

Auth is enforced via [lib/ai-auth.ts](lib/ai-auth.ts). Rate limits are in-memory via [lib/rate-limit.ts](lib/rate-limit.ts).

### Alerts and cron

- `GET /api/cron/alerts` - cron entrypoint, protected by cron secret
- `GET /api/alerts/check` - evaluates active alerts, inserts notifications, sends emails
- `POST /api/alerts/send` - internal-only email send route, cron-authorized

Cron auth and key rotation are implemented in [lib/cron-auth.ts](lib/cron-auth.ts).

### External intelligence

- `GET /api/arbitrage` - cross-platform spread detection
- `GET /api/kalshi` - Kalshi market list
- `GET /api/kalshi/candlesticks` - Kalshi candlestick data
- `GET /api/news/guardian` - Guardian articles by query
- `GET /api/news/reddit` - Reddit posts by query
- `GET /api/whales` - whale leaderboard
- `GET /api/whales/activity` - aggregated whale activity or address-specific activity
- `GET /api/whales/profile` - wallet profile data

## Security and abuse controls

- Contact route abuse protection in [app/api/contact/route.ts](app/api/contact/route.ts):
  - IP-based rate limit (`5 requests / 10 min`)
  - honeypot field (`website`)
  - strict payload validation
- AI routes:
  - authenticated user required
  - user + IP rate limiting
- Cron routes:
  - bearer token or `x-cron-secret` accepted
  - supports secret rotation via `CRON_SECRETS`

Note: rate limits are process-local memory, not distributed. For multi-instance deployments, move to shared storage (Redis/Upstash) if strict global limits are required.

## Database and migrations

SQL migrations are in [supabase/migrations](supabase/migrations):

- `001_profiles.sql`
- `002_alerts.sql`
- `003_watchlist.sql`
- `004_notifications.sql`
- `005_settings_preferences.sql`
- `run_all.sql` (idempotent combined migration)

### Core tables

- `profiles`
- `alerts`
- `watchlist`
- `notifications`

### RLS model (high level)

- User tables enforce ownership checks (`auth.uid() = user_id` or profile id)
- Service role policies allow cron alert engine to read/update alerts and insert notifications
- Notifications are added to realtime publication in idempotent migration logic

## Automation

### Scheduled alerts

Workflow: [.github/workflows/alerts-cron.yml](.github/workflows/alerts-cron.yml)

- Trigger: every 5 minutes
- Calls `CRON_URL` with both:
  - `Authorization: Bearer <CRON_SECRET>`
  - `X-Cron-Secret: <CRON_SECRET>`
- Includes retries for transient failures

Required GitHub repository secrets:

- `CRON_URL` - full URL to `/api/cron/alerts`
- `CRON_SECRET` - must match one configured app cron secret

### CI

Workflow: [.github/workflows/ci.yml](.github/workflows/ci.yml)

- Runs on pull requests and pushes to `master`
- Steps: `npm ci`, `npm run lint`, `npm run type-check`, `npm run build`

## Project structure

- [app](app) - App Router pages and route handlers
- [components](components) - reusable UI/layout components
- [hooks](hooks) - data hooks and state helpers
- [services](services) - provider adapters and domain logic
- [lib](lib) - auth, cron auth, utilities, rate limiting, Supabase clients
- [emails](emails) - email templates
- [supabase/migrations](supabase/migrations) - schema and policies
- [.github/workflows](.github/workflows) - CI and cron workflows

## Troubleshooting

### Cron returns 401 Unauthorized

- Ensure GitHub secret `CRON_SECRET` matches one of app secrets (`CRON_SECRET` or entry in `CRON_SECRETS`).
- Verify scheduler sends either `Authorization` bearer header or `X-Cron-Secret`.

### Alerts do not send emails

- Check `RESEND_API_KEY` and `ALERTS_FROM_EMAIL`.
- If using `onboarding@resend.dev`, delivery is restricted to account owner.

### AI endpoints fail

- Confirm user is authenticated.
- Confirm `GEMINI_API_KEY` is set.
- If receiving 429, wait for rate-limit window reset.

### Supabase errors on startup/auth

- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.
- Run migrations (prefer `run_all.sql`) if tables are missing.

---