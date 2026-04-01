-- Notifications table: persistent log of every triggered alert
-- Run in Supabase SQL Editor: SQL Editor → New Query → Run

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

-- Enable RLS
alter table public.notifications enable row level security;

-- Users can only see their own notifications
create policy "notifications: select own"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
create policy "notifications: update own"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Service role can insert notifications (from the check engine)
create policy "notifications: service role insert"
  on public.notifications for insert
  with check (auth.role() = 'service_role');

-- Service role can read all notifications
create policy "notifications: service role select"
  on public.notifications for select
  using (auth.role() = 'service_role');

-- Index for fast lookup by user and read status
create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_user_read_idx on public.notifications (user_id, read) where read = false;

-- Enable Realtime for the notifications table (required for live subscriptions)
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
