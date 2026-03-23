# Polys - Prediction Market Intelligence

## Project Overview
A Next.js application for tracking odds, detecting arbitrage opportunities, and analyzing market sentiment across Polymarket, Kalshi, and more in real-time.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: TanStack Query
- **Package Manager**: pnpm
- **Animations**: Framer Motion

## Project Structure
- `app/` - Next.js App Router pages (dashboard, markets, portfolio, watchlist, alerts, arbitrage, settings, login, signup, auth, pricing)
- `app/api/markets/` - Server-side proxy for Polymarket Gamma API (bypasses CORS)
- `app/api/price-history/` - Server-side proxy for CLOB price history API
- `components/` - Shared React components and UI primitives
- `services/polymarket.ts` - Real Polymarket Gamma API integration (no more mock data)
- `app/api/orderbook/` - Server-side proxy for CLOB order book API
- `hooks/useMarketWebSocket.ts` - Real-time market updates via CLOB WebSocket (wss); polling fallback
- `hooks/` - Custom React hooks
- `lib/` - Utility functions
- `data/` - Static data files

## API Integration (Task #1 — COMPLETE)
- **Polymarket Gamma API**: `https://gamma-api.polymarket.com/markets` — market listings, prices, volumes
- **Polymarket CLOB API**: `https://clob.polymarket.com` — price history charts, order book
- **Polymarket CLOB WebSocket**: `wss://ws-subscriptions-clob.polymarket.com/ws/market` — real-time order book + price updates
- All REST APIs are proxied server-side via Next.js `/api/` routes to bypass browser CORS restrictions
- **Real-time architecture** (WebSocket-first):
  - When markets have CLOB token IDs (`yesTokenId`), the hook connects to CLOB WebSocket and subscribes
  - Receives `book` events (order book snapshots) → computes mid-price for live odds
  - Receives `price_change` events → accumulates as live trades on market detail page
  - Falls back to Gamma API polling (15s interval) when token IDs are unavailable
  - Reconnects automatically on disconnect (3s backoff)
- Used on: landing page, markets list, dashboard (all via `useMarketWebSocket`), and market detail (`useSingleMarketWebSocket`)
- Category detection uses event tickers (e.g., `cbb-`, `nba-`) + keyword matching with word boundaries
- `TransformedMarket` extended with `yesTokenId`, `noTokenId`, `conditionId`

## Arbitrage Engine (Task #3 — COMPLETE)
- **Kalshi client**: `services/kalshi.ts` — typed client for Kalshi Trade API v2 events endpoint; server-side `fetchKalshiEventsServer()` fetches up to 300 events with nested markets
- **Arbitrage service**: `services/arbitrage.ts` — keyword-based market matching (Jaccard similarity >= 0.18) + binary arbitrage profit math; caps spread at 15pp to filter false matches
- **Arbitrage API**: `app/api/arbitrage/route.ts` — unified server route; fetches Polymarket + Kalshi in parallel, runs detection, returns `{ opportunities, stats }`; 30-second cache
- **Hook**: `hooks/useArbitrage.ts` — React Query; polls `/api/arbitrage` every 30 seconds
- **Page**: `app/arbitrage/page.tsx` — wired to live data; loading skeletons, empty state, filter by min-profit + platform; premium gate controlled by `user.tier` from `useAuth`
- **Arbitrage math**: cost = `1 - |p_poly - p_kalshi|`; profit% = `|spread| / cost × 100`; only valid when 3% ≤ spread ≤ 15%
- **data/arbitrage.ts**: stripped mock data; re-exports types from `services/arbitrage`

## Authentication (Task #2 — COMPLETE)
- **Provider**: Supabase (`@supabase/supabase-js` + `@supabase/ssr`)
- **Client**: `lib/supabase/client.ts` — browser-side `createBrowserClient`
- **Server**: `lib/supabase/server.ts` — server-side `createServerClient` with cookie store
- **Session refresh**: `proxy.ts` (Next.js 16 proxy convention) — refreshes Supabase auth tokens on every request
- **Hook**: `hooks/useAuth.ts` — real `signInWithPassword` / `signUp` / `signOut`; exposes `{ user, isAuthenticated, isLoading, login, signup, logout }`
- **Login**: `app/login/page.tsx` — email+password form wired to `login(email, password)`, shows inline errors
- **Signup**: `app/signup/page.tsx` — name+email+password form wired to `signup(email, password, name)`, handles email confirmation flow
- **AppHeader**: uses real `user` from `useAuth()` — no more hardcoded "Alex Chen"; sign-out redirects to `/login`
- **PublicHeader**: same pattern — `handleSignOut` async logout + redirect
- **Env secrets required**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Email Alerts (Task #5 — COMPLETE)
- **Email provider**: Resend SDK (`resend` npm package) — `new Resend(apiKey).emails.send(...)`; `RESEND_API_KEY` required
- **Send route**: `app/api/alerts/send/route.ts` — POST; requires `Authorization: Bearer $CRON_SECRET` (internal-only, prevents open relay abuse); builds styled HTML email; returns `{ ok, emailId }`
- **Check/eval engine**: `app/api/alerts/check/route.ts` — GET; requires `Authorization: Bearer $CRON_SECRET`; reads active alerts; for each alert with a `market_id` fetches that market directly from Gamma API (so off-top-100 markets are evaluated correctly); also fetches top-200 by volume for name/keyword matching and "new market" detection; fires email; transitions `status` → `'triggered'` to prevent re-firing; 60-min cooldown guard as secondary defense
- **Alert dedup**: After firing, status transitions `active` → `triggered`. Alert stays silent until user manually re-arms it from the UI. This prevents infinite re-triggering while condition remains true.
- **"New market" semantics**: Tracks seen market IDs in `seen_market_ids text[]` column. Only fires on markets NOT previously seen by this alert. Re-arming via UI resets `seen_market_ids = []` so fresh markets can trigger.
- **Status lifecycle**: `active` (watching) → `triggered` (fired, silent) → `active` (re-armed by user); or `active` ↔ `paused` (user paused)
- **Cron entry-point**: `app/api/cron/alerts/route.ts` — GET; requires `Authorization: Bearer $CRON_SECRET`; fires every 5 minutes via either (a) Vercel (vercel.json schedule="*/5 * * * *", set CRON_SECRET in Vercel project settings) or (b) external scheduler: on cron-job.org create a job for `GET https://<deployed-domain>/api/cron/alerts` with header `Authorization: Bearer <CRON_SECRET>` and 5-minute interval
- **vercel.json**: committed `crons` config with `path=/api/cron/alerts` and `schedule="*/5 * * * *"` — Vercel automatically injects CRON_SECRET
- **Alerts CRUD hook**: `hooks/useAlerts.ts` — stable `useMemo` Supabase client; `toggleAlert` handles all 3 status transitions; re-arm clears `seen_market_ids`
- **Alerts page**: `app/alerts/page.tsx` — "Fired" badge + "Re-arm" button for triggered alerts; green border highlight; Switch toggle for active/paused
- **Supabase migration**: `supabase/migrations/002_alerts.sql` — `public.alerts` table with `seen_market_ids text[] default '{}'`; run in Supabase Dashboard SQL Editor; includes idempotent ALTER for existing tables
- **Startup check**: `instrumentation.ts` + `lib/supabase/migrate.ts` — detects missing table at boot and logs the migration URL
- **Sender**: `onboarding@resend.dev` — works without domain verification (Resend sends only to account owner's email until domain is verified at resend.com/domains; update `from` field in send route after verifying)
- **Env secrets required**: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`
- **DB migration**: Run `supabase/migrations/002_alerts.sql` in Supabase Dashboard SQL Editor before using alerts

## Running the App
- **Dev**: `pnpm run dev` (runs on port 5000)
- **Build**: `pnpm run build`
- **Start**: `pnpm run start` (runs on port 5000)

## Replit Configuration
- Dev server runs on port 5000 with host `0.0.0.0` for Replit preview pane compatibility
- Workflow: "Start application" → `pnpm run dev`
- Required secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
