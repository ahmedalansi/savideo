-- savideo MVP: durable data (Postgres 16).
-- Hot, short-lived state (quota counters, media-info cache, download tokens,
-- rate limits) lives in Redis, see architecture.md "Redis keys".
-- There are no user accounts. Only the API service connects to this database;
-- access rules are data-layer checks in the API (public routes can only insert
-- takedown requests; everything else needs the admin token).

create extension if not exists pgcrypto;

-- Platforms we accept links from. Lets us switch one off without a deploy
-- (e.g. when its extractor breaks or after a legal notice).
create table platforms (
  id text primary key,                         -- 'youtube', 'facebook', 'x', ...
  display_name text not null,
  enabled boolean not null default true,
  audio_supported boolean not null default true,
  max_height int not null default 2160 check (max_height > 0),
  use_proxy boolean not null default false,    -- route through residential proxy
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into platforms (id, display_name, audio_supported, use_proxy) values
  ('youtube',     'YouTube',     true,  true),
  ('facebook',    'Facebook',    true,  false),
  ('x',           'X',           false, false),
  ('reddit',      'Reddit',      true,  false),
  ('twitch',      'Twitch',      true,  false),
  ('bilibili',    'Bilibili',    true,  false),
  ('dailymotion', 'Dailymotion', true,  false);

-- Takedown / DMCA notices sent through the /copyright form.
create table takedown_requests (
  id uuid primary key default gen_random_uuid(),
  claimant_name text not null,
  claimant_email text not null,
  claimant_org text,
  work_description text not null,
  urls text[] not null check (cardinality(urls) between 1 and 50),
  statement_good_faith boolean not null check (statement_good_faith),
  statement_accuracy boolean not null check (statement_accuracy),
  signature text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'accepted', 'rejected')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on takedown_requests (status, created_at desc);

-- Media we refuse to process. Matched by platform + the platform's own id
-- (e.g. a YouTube video id), so every link shape for the same video is caught.
create table blocked_media (
  id uuid primary key default gen_random_uuid(),
  platform_id text not null references platforms(id) on delete restrict,
  media_key text not null,                     -- platform's video/channel id
  scope text not null default 'video' check (scope in ('video', 'channel')),
  reason text not null,
  takedown_request_id uuid references takedown_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform_id, scope, media_key)
);
create index on blocked_media (takedown_request_id);

-- Anonymous usage log for capacity and cost planning. No IP, no cookie id,
-- no title: only what we need to size servers and proxy spend.
create table download_events (
  id uuid primary key default gen_random_uuid(),
  platform_id text not null references platforms(id) on delete restrict,
  kind text not null check (kind in ('video', 'audio')),
  height int check (height is null or height > 0),
  trimmed boolean not null default false,
  merged boolean not null default false,
  via_proxy boolean not null default false,
  status text not null check (status in ('completed', 'failed', 'aborted')),
  error_code text,
  bytes_sent bigint not null default 0 check (bytes_sent >= 0),
  duration_ms int not null default 0 check (duration_ms >= 0),
  created_at timestamptz not null default now()
);
create index on download_events (created_at desc);
create index on download_events (platform_id, created_at desc);

-- keep updated_at honest
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger platforms_touch before update on platforms
  for each row execute function touch_updated_at();
create trigger takedown_requests_touch before update on takedown_requests
  for each row execute function touch_updated_at();
create trigger blocked_media_touch before update on blocked_media
  for each row execute function touch_updated_at();
