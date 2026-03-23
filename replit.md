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

## Running the App
- **Dev**: `pnpm run dev` (runs on port 5000)
- **Build**: `pnpm run build`
- **Start**: `pnpm run start` (runs on port 5000)

## Replit Configuration
- Dev server runs on port 5000 with host `0.0.0.0` for Replit preview pane compatibility
- Workflow: "Start application" → `pnpm run dev`
- Required secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
