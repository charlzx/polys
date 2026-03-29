-- Watchlist table: stores user-saved markets
-- Run in Supabase SQL Editor: SQL Editor → New Query → Run

create table if not exists public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  market_id   text not null,
  market_name text not null default '',
  category    text not null default '',
  added_at    timestamptz not null default now(),
  -- One row per user+market
  unique (user_id, market_id)
);

-- Enable RLS
alter table public.watchlist enable row level security;

-- Users can only see their own watchlist
create policy "watchlist: select own"
  on public.watchlist for select
  using (auth.uid() = user_id);

-- Users can add to their own watchlist
create policy "watchlist: insert own"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

-- Users can remove from their own watchlist
create policy "watchlist: delete own"
  on public.watchlist for delete
  using (auth.uid() = user_id);

-- Index for fast lookup by user
create index if not exists watchlist_user_id_idx on public.watchlist (user_id);

-- Add email_alerts_enabled column to profiles if it doesn't exist
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email_alerts_enabled'
  ) then
    alter table public.profiles add column email_alerts_enabled boolean not null default true;
  end if;
end $$;
