-- ============================================================
-- Polys — Combined Database Migration (001–005)
-- Paste this entire file into:
--   Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to run multiple times (all statements are idempotent).
-- ============================================================


-- ============================================================
-- 001 — profiles table + RLS + triggers
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  tier       text not null default 'free' check (tier in ('free', 'pro', 'premium')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles: select own'
  ) then
    create policy "profiles: select own"
      on public.profiles for select
      using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles: update own'
  ) then
    create policy "profiles: update own"
      on public.profiles for update
      using (auth.uid() = id);
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, tier, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    coalesce(new.raw_user_meta_data ->> 'tier', 'free'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 002 — alerts table + RLS
-- ============================================================

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

alter table public.alerts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'alerts: select own') then
    create policy "alerts: select own" on public.alerts for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'alerts: insert own') then
    create policy "alerts: insert own" on public.alerts for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'alerts: update own') then
    create policy "alerts: update own" on public.alerts for update using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'alerts: delete own') then
    create policy "alerts: delete own" on public.alerts for delete using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'alerts: service role select all') then
    create policy "alerts: service role select all" on public.alerts for select using (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'alerts' and policyname = 'alerts: service role update all') then
    create policy "alerts: service role update all" on public.alerts for update using (auth.role() = 'service_role');
  end if;
end $$;

drop trigger if exists alerts_updated_at on public.alerts;
create trigger alerts_updated_at
  before update on public.alerts
  for each row execute procedure public.set_updated_at();

create index if not exists alerts_user_id_idx on public.alerts (user_id);
create index if not exists alerts_status_idx on public.alerts (status) where status = 'active';

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'alerts' and column_name = 'seen_market_ids'
  ) then
    alter table public.alerts add column seen_market_ids text[] not null default '{}';
  end if;
end $$;


-- ============================================================
-- 003 — watchlist table + RLS + email_alerts_enabled on profiles
-- ============================================================

create table if not exists public.watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  market_id   text not null,
  market_name text not null default '',
  category    text not null default '',
  added_at    timestamptz not null default now(),
  unique (user_id, market_id)
);

alter table public.watchlist enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'watchlist' and policyname = 'watchlist: select own') then
    create policy "watchlist: select own" on public.watchlist for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'watchlist' and policyname = 'watchlist: insert own') then
    create policy "watchlist: insert own" on public.watchlist for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'watchlist' and policyname = 'watchlist: delete own') then
    create policy "watchlist: delete own" on public.watchlist for delete using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists watchlist_user_id_idx on public.watchlist (user_id);

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email_alerts_enabled'
  ) then
    alter table public.profiles add column email_alerts_enabled boolean not null default true;
  end if;
end $$;


-- ============================================================
-- 004 — notifications table + RLS + realtime
-- ============================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  alert_id    uuid references public.alerts (id) on delete set null,
  alert_type  text not null,
  market_id   text,
  market_name text,
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications: select own') then
    create policy "notifications: select own" on public.notifications for select using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications: update own') then
    create policy "notifications: update own" on public.notifications for update using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications: service role insert') then
    create policy "notifications: service role insert" on public.notifications for insert with check (auth.role() = 'service_role');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications: service role select') then
    create policy "notifications: service role select" on public.notifications for select using (auth.role() = 'service_role');
  end if;
end $$;

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_user_read_idx on public.notifications (user_id, read) where read = false;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;


-- ============================================================
-- 005 — settings preferences columns on profiles
-- ============================================================

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'timezone'
  ) then
    alter table public.profiles add column timezone text not null default 'UTC';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'portfolio_daily_digest'
  ) then
    alter table public.profiles add column portfolio_daily_digest boolean not null default true;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'weekly_summary'
  ) then
    alter table public.profiles add column weekly_summary boolean not null default true;
  end if;
end $$;
