create extension if not exists pgcrypto;

create type public.project_status as enum (
  'draft', 'uploading', 'preview_queued', 'preview_generating', 'preview_ready',
  'awaiting_payment', 'paid', 'full_queued', 'full_generating', 'completed',
  'failed', 'deletion_requested', 'deleted'
);
create type public.payment_status as enum ('unpaid', 'created', 'paid', 'refunded');
create type public.generation_kind as enum ('preview', 'full');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  status public.project_status not null default 'draft',
  recipient_name text not null check (char_length(recipient_name) between 1 and 60),
  occasion text not null check (occasion in ('birthday','anniversary','friendship','just_because')),
  memory text not null check (char_length(memory) between 10 and 1500),
  message text check (message is null or char_length(message) <= 500),
  music_style text not null check (music_style in ('warm_pop','acoustic','playful_rap','dreamy')),
  customer_email text not null,
  consent_version text not null,
  access_token_hash text not null unique,
  access_token_ciphertext text not null,
  voice_path text,
  voice_verified_at timestamptz,
  preview_audio_path text,
  full_audio_path text,
  video_path text,
  lyrics text,
  share_slug text unique,
  share_enabled boolean not null default false,
  payment_status public.payment_status not null default 'unpaid',
  paypal_order_id text unique,
  paypal_capture_id text unique,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index projects_status_idx on public.projects(status, created_at desc);
create index projects_email_idx on public.projects(lower(customer_email), created_at desc);
create index projects_expiry_idx on public.projects(expires_at) where status <> 'deleted';

create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind public.generation_kind not null,
  stage text not null check (stage in ('lyrics','music','voice','video','complete')),
  status text not null check (status in ('queued','running','succeeded','failed')),
  provider_job_id text unique,
  output_path text,
  error_message text,
  attempt integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generation_project_idx on public.generation_jobs(project_id, created_at desc);

create table public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  request_text text not null check (char_length(request_text) between 5 and 500),
  status text not null default 'requested' check (status in ('requested','in_progress','completed','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_project_idx on public.audit_events(project_id, created_at desc);

create table public.rate_limits (
  key text primary key,
  count integer not null,
  window_started_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.rate_limits(key, count, window_started_at)
  values (p_key, 1, now())
  on conflict (key) do update
  set count = case
      when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
      then 1 else public.rate_limits.count + 1 end,
      window_started_at = case
      when public.rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
      then now() else public.rate_limits.window_started_at end,
      updated_at = now()
  returning count into current_count;
  return current_count <= p_limit;
end;
$$;

create or replace function public.claim_generation(
  p_project_id uuid,
  p_kind public.generation_kind
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if p_kind = 'preview' then
    update public.projects
    set status = 'preview_generating', error_code = null, error_message = null
    where id = p_project_id and status in ('preview_queued', 'failed');
  else
    update public.projects
    set status = 'full_generating', error_code = null, error_message = null
    where id = p_project_id
      and payment_status = 'paid'
      and status in ('paid', 'full_queued', 'failed');
  end if;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

alter table public.projects enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.revision_requests enable row level security;
alter table public.audit_events enable row level security;
alter table public.rate_limits enable row level security;

-- All customer project access goes through server routes using the secret key.
-- Only authenticated administrators listed in ADMIN_EMAILS can use the dashboard,
-- and its data access also happens server-side.
revoke all on public.projects from anon, authenticated;
revoke all on public.generation_jobs from anon, authenticated;
revoke all on public.revision_requests from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.claim_generation(uuid, public.generation_kind) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voicegift-private',
  'voicegift-private',
  false,
  104857600,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg','video/mp4']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No direct object policies are intentionally created. Signed upload URLs and
-- signed read URLs are minted by server routes using the Supabase secret key.

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

create trigger generation_jobs_touch_updated_at
before update on public.generation_jobs
for each row execute function public.touch_updated_at();

create trigger revision_requests_touch_updated_at
before update on public.revision_requests
for each row execute function public.touch_updated_at();
