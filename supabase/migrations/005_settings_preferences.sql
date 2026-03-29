-- Settings preferences: adds timezone, digest, and summary columns to profiles
-- Run in Supabase SQL Editor: SQL Editor → New Query → Run

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
