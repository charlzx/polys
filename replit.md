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
- **Email provider**: Resend (`https://api.resend.com/emails`) — no SDK, raw fetch with `RESEND_API_KEY`
- **Send route**: `app/api/alerts/send/route.ts` — POST endpoint; accepts `AlertEmailPayload`; builds styled HTML email; returns `{ ok, emailId }`
- **Check/eval engine**: `app/api/alerts/check/route.ts` — GET endpoint; uses Supabase service role to read ALL active alerts; fetches live market data from `/api/markets`; evaluates odds/volume/new-market conditions; fires email + updates `last_triggered_at` + `trigger_count`; 60-min cooldown guard per alert
- **Alerts CRUD hook**: `hooks/useAlerts.ts` — browser Supabase client; `createAlert`, `toggleAlert`, `deleteAlert`; RLS ensures users only see their own rows
- **Alerts page**: `app/alerts/page.tsx` — fully wired to Supabase; live CRUD; real-time stats (total / active / triggered-today); loading skeletons; graceful error handling
- **Supabase migration**: `supabase/migrations/002_alerts.sql` — `public.alerts` table; RLS policies (user-scoped CRUD + service role override); indexes
- **Resend domain note**: Without domain verification, Resend can only send to the account owner's email. To send to all users, verify a custom domain at resend.com/domains and update `from` in `app/api/alerts/send/route.ts`
- **Sender**: `onboarding@resend.dev` (Resend test domain; works without custom domain setup)
- **Env secrets required**: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **DB migration**: Run `supabase/migrations/002_alerts.sql` in Supabase Dashboard SQL Editor before using alerts

## Running the App
- **Dev**: `pnpm run dev` (runs on port 5000)
- **Build**: `pnpm run build`
- **Start**: `pnpm run start` (runs on port 5000)

## Replit Configuration
- Dev server runs on port 5000 with host `0.0.0.0` for Replit preview pane compatibility
- Workflow: "Start application" → `pnpm run dev`
- Required secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
