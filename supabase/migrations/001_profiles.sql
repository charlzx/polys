-- Run this in your Supabase project: SQL Editor → New Query → Run
-- Creates the public.profiles table, RLS policies, and a trigger that
-- automatically creates a profile row whenever a new user signs up —
-- including when email confirmation is required (no active session yet).

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  tier       text not null default 'free' check (tier in ('free', 'pro', 'premium')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row-Level Security
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-update updated_at on row change
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

-- Trigger: automatically create a profile row when auth.users gets a new row.
-- Runs as SECURITY DEFINER so it bypasses RLS (no session required).
-- This handles both normal signups and email-confirmation flows.
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
