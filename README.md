# Polys

Polys is a Next.js prediction market intelligence platform for tracking markets, monitoring whale activity, evaluating arbitrage signals, and managing personalized alerts.

The app combines market data across providers (including Polymarket and Kalshi), AI-assisted summaries, and a Supabase-backed user data layer (profiles, watchlists, notifications, and preferences).

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4 + Radix UI components
- Supabase (auth + database)
- React Query for client data fetching
- Resend for email delivery
- GitHub Actions for scheduled alert checks

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+

### Install and run

```bash
npm install
npm run dev
```

The dev server runs on http://localhost:5000.

## Environment Variables

Create a `.env.local` file in the project root:

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:5000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GEMINI_API_KEY=

# Email / alerts
RESEND_API_KEY=
ALERTS_FROM_EMAIL=alerts@yourdomain.com
CRON_SECRET=

# External data
KALSHI_API_KEY=
GUARDIAN_API_KEY=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=

```

### Variable notes

- `SUPABASE_SERVICE_ROLE_KEY` is server-only and required for alert checks/migrations.
- `CRON_SECRET` is required for protected cron endpoints.
- `RESEND_API_KEY` and `ALERTS_FROM_EMAIL` are required to send alert emails.
- AI endpoints are disabled unless `GEMINI_API_KEY` is set.

## Available Scripts

- `npm run dev` starts Next.js on `0.0.0.0:5000`.
- `npm run build` creates the production build.
- `npm run start` runs the production server on `0.0.0.0:5000`.
- `npm run lint` runs ESLint.
- `npm run type-check` runs TypeScript checks.

## Database Migrations (Supabase)

SQL migrations are in `supabase/migrations`:

- `001_profiles.sql`
- `002_alerts.sql`
- `003_watchlist.sql`
- `004_notifications.sql`
- `005_settings_preferences.sql`
- `run_all.sql`

Run these in the Supabase SQL editor (or your migration workflow) in order.

## Scheduled Alerts (GitHub Actions)

The workflow at `.github/workflows/alerts-cron.yml` triggers every 5 minutes and calls `/api/cron/alerts`.

Configure these repository secrets:

- `CRON_URL` (full URL to `/api/cron/alerts`)
- `CRON_SECRET` (must match your server-side `CRON_SECRET` env var)

## Project Structure

- `app/`: App Router pages and API route handlers.
- `components/`: Shared UI and layout components.
- `hooks/`: Data and state hooks.
- `services/`: Provider integrations and business logic.
- `lib/`: Auth and Supabase helpers.
- `supabase/migrations/`: Database schema SQL.
- `emails/`: Transactional email templates.

## Deployment Notes

- Ensure all required environment variables are configured in your hosting platform.
- Keep service-role keys server-only and never expose them to the client.
- If you use a scheduled job outside GitHub Actions, call `/api/cron/alerts` with `Authorization: Bearer <CRON_SECRET>`.
