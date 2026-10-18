-- Runtime secrets that are written back by the app (e.g. refreshed OAuth
-- tokens). Env vars act as the initial fallback. Never readable by clients.
create table if not exists public.app_secrets (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
