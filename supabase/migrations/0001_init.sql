-- ============================================================
-- IT OLD Content Factory — Schema
-- Run in Supabase SQL Editor (or `supabase db push`).
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ── config ──────────────────────────────────────────────────
create table if not exists public.config (
  key         text primary key,
  value       text not null default '',
  description text default ''
);

-- ── ai_keys ─────────────────────────────────────────────────
create table if not exists public.ai_keys (
  id          uuid primary key default gen_random_uuid(),
  api_key     text not null,
  models      text not null default '',
  status      text not null default 'active',
  priority    int  not null default 99,
  last_used   timestamptz,
  error_count int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── topics (semantic dedup via pgvector) ────────────────────
create table if not exists public.topics (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,
  hash       text not null,
  embedding  vector(768),
  rule_id    text,
  created_at timestamptz not null default now()
);
create index if not exists topics_hash_idx     on public.topics (hash);
create index if not exists topics_created_idx  on public.topics (created_at desc);
create index if not exists topics_embedding_idx on public.topics
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── posts ───────────────────────────────────────────────────
create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  topic        text not null,
  rule_id      text,
  title        text,
  caption      text,
  keywords     jsonb not null default '[]'::jsonb,
  slides       jsonb not null default '[]'::jsonb,
  image_urls   jsonb not null default '[]'::jsonb,
  score        jsonb,
  status       text not null default 'pending',
  scheduled_at timestamptz,
  posted_at    timestamptz,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists posts_status_idx  on public.posts (status);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- ── post_targets (per platform result) ──────────────────────
create table if not exists public.post_targets (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references public.posts(id) on delete cascade,
  platform         text not null,
  platform_post_id text,
  status           text not null default 'pending',
  error            text,
  posted_at        timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists post_targets_post_idx on public.post_targets (post_id);

-- ── post_metrics (analytics feedback loop) ──────────────────
create table if not exists public.post_metrics (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  platform   text not null,
  views      bigint default 0,
  likes      bigint default 0,
  comments   bigint default 0,
  shares     bigint default 0,
  raw        jsonb,
  fetched_at timestamptz not null default now()
);

-- ── logs ────────────────────────────────────────────────────
create table if not exists public.logs (
  id         bigserial primary key,
  level      text not null default 'info',
  source     text,
  message    text,
  details    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists logs_created_idx on public.logs (created_at desc);

-- ── locks (single-run guarantee) ────────────────────────────
create table if not exists public.locks (
  name       text primary key,
  locked_at  timestamptz not null default now(),
  expires_at timestamptz not null
);

-- ============================================================
-- Functions
-- ============================================================

-- Try to acquire a named lock. Returns true if acquired.
create or replace function public.acquire_lock(p_name text, p_ttl_seconds int default 900)
returns boolean
language plpgsql
as $$
declare
  v_ok boolean;
begin
  insert into public.locks (name, locked_at, expires_at)
  values (p_name, now(), now() + make_interval(secs => p_ttl_seconds))
  on conflict (name) do update
    set locked_at  = now(),
        expires_at = now() + make_interval(secs => p_ttl_seconds)
    where public.locks.expires_at < now()
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

create or replace function public.release_lock(p_name text)
returns void
language sql
as $$ delete from public.locks where name = p_name; $$;

-- Semantic topic similarity search.
create or replace function public.match_topics(
  query_embedding vector(768),
  match_threshold float default 0.85,
  match_count     int   default 5
)
returns table (id uuid, topic text, similarity float)
language sql
as $$
  select t.id, t.topic, 1 - (t.embedding <=> query_embedding) as similarity
  from public.topics t
  where t.embedding is not null
    and 1 - (t.embedding <=> query_embedding) > match_threshold
  order by t.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- Row Level Security
-- The pipeline + admin API use the service_role key (bypasses RLS).
-- Authenticated admins only get read access to dashboards.
-- ============================================================
alter table public.config        enable row level security;
alter table public.ai_keys       enable row level security;
alter table public.topics        enable row level security;
alter table public.posts         enable row level security;
alter table public.post_targets  enable row level security;
alter table public.post_metrics  enable row level security;
alter table public.logs          enable row level security;
alter table public.locks         enable row level security;

drop policy if exists "auth read config"       on public.config;
drop policy if exists "auth read topics"       on public.topics;
drop policy if exists "auth read posts"        on public.posts;
drop policy if exists "auth read targets"      on public.post_targets;
drop policy if exists "auth read metrics"      on public.post_metrics;
drop policy if exists "auth read logs"         on public.logs;

create policy "auth read config"  on public.config       for select to authenticated using (true);
create policy "auth read topics"  on public.topics       for select to authenticated using (true);
create policy "auth read posts"   on public.posts        for select to authenticated using (true);
create policy "auth read targets" on public.post_targets for select to authenticated using (true);
create policy "auth read metrics" on public.post_metrics for select to authenticated using (true);
create policy "auth read logs"    on public.logs         for select to authenticated using (true);

-- Never expose API keys to the anon/authenticated role.
revoke all on public.ai_keys from anon, authenticated;
