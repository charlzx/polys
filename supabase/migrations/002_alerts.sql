-- Alerts table: stores user-created market alerts
-- Run in Supabase SQL Editor: SQL Editor → New Query → Run

create table if not exists public.alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  alert_type       text not null check (alert_type in ('odds', 'volume', 'new', 'arbitrage')),
  market_id        text,
  market_name      text,
  condition_text   text,
  threshold        numeric not null default 10,
  delivery_email   boolean not null default true,
  status           text not null default 'active' check (status in ('active', 'paused', 'triggered')),
  last_triggered_at timestamptz,
  trigger_count    integer not null default 0,
  seen_market_ids  text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Enable RLS
alter table public.alerts enable row level security;

-- Users can only see their own alerts
create policy "alerts: select own"
  on public.alerts for select
  using (auth.uid() = user_id);

-- Users can insert their own alerts
create policy "alerts: insert own"
  on public.alerts for insert
  with check (auth.uid() = user_id);

-- Users can update their own alerts
create policy "alerts: update own"
  on public.alerts for update
  using (auth.uid() = user_id);

-- Users can delete their own alerts
create policy "alerts: delete own"
  on public.alerts for delete
  using (auth.uid() = user_id);

-- Service role can read all alerts (for the check engine)
create policy "alerts: service role select all"
  on public.alerts for select
  using (auth.role() = 'service_role');

-- Service role can update all alerts (to write last_triggered_at)
create policy "alerts: service role update all"
  on public.alerts for update
  using (auth.role() = 'service_role');

-- Auto-update updated_at
drop trigger if exists alerts_updated_at on public.alerts;
create trigger alerts_updated_at
  before update on public.alerts
  for each row execute procedure public.set_updated_at();

-- Index for fast lookup by user
create index if not exists alerts_user_id_idx on public.alerts (user_id);
-- Index for check engine: active alerts only
create index if not exists alerts_status_idx on public.alerts (status) where status = 'active';

-- Add seen_market_ids column if the table already existed before this migration
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'alerts' and column_name = 'seen_market_ids'
  ) then
    alter table public.alerts add column seen_market_ids text[] not null default '{}';
  end if;
end $$;
