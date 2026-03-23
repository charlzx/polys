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
- `components/` - Shared React components and UI primitives
- `services/` - External service integrations (e.g., polymarket.ts)
- `hooks/` - Custom React hooks
- `lib/` - Utility functions
- `data/` - Static data files

## Running the App
- **Dev**: `pnpm run dev` (runs on port 5000)
- **Build**: `pnpm run build`
- **Start**: `pnpm run start` (runs on port 5000)

## Replit Configuration
- Dev server runs on port 5000 with host `0.0.0.0` for Replit preview pane compatibility
- Workflow: "Start application" → `pnpm run dev`
- No external environment variables required
