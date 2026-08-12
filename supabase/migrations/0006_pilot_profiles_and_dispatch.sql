-- Migration: 0006_pilot_profiles_and_dispatch.sql

-- 1. Create pilot_profiles table
create table if not exists public.pilot_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'offline' check (status in ('active', 'offline', 'on_job')),
  last_known_location geometry(Point, 4326),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pilot_profiles_location on public.pilot_profiles using gist(last_known_location);

-- Enable RLS
alter table public.pilot_profiles enable row level security;
alter table public.pilot_profiles force row level security;

-- Policies for pilot_profiles
create policy select_pilot_profiles on public.pilot_profiles
  for select
  using (true); -- Farm managers need to see assigned pilots, pilots need to see themselves

create policy update_pilot_profiles on public.pilot_profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy insert_pilot_profiles on public.pilot_profiles
  for insert
  with check (id = auth.uid());

-- Auto-update updated_at on row modification
create trigger pilot_profiles_updated_at
  before update on public.pilot_profiles
  for each row execute procedure public.set_updated_at();

-- 2. Stored Procedure to find the nearest available pilot (using geography for meters)
create or replace function public.get_nearest_available_pilot(p_plot_id uuid)
returns uuid as $$
declare
  plot_geom geometry;
  plot_centroid geometry;
  nearest_pilot_id uuid;
begin
  select area into plot_geom
  from public.farm_plots
  where id = p_plot_id;

  if not found then
    return null;
  end if;

  plot_centroid := st_centroid(plot_geom);

  select id into nearest_pilot_id
  from public.pilot_profiles
  where status = 'active'
    and last_known_location is not null
    and st_dwithin(last_known_location::geography, plot_centroid::geography, 50000)
  order by st_distance(last_known_location::geography, plot_centroid::geography) asc
  limit 1
  for update skip locked;

  return nearest_pilot_id;
end;
$$ language plpgsql security definer;

-- 3. Create the trigger function that fires the Edge Function via HTTP
create or replace function public.trigger_dispatch_pilot()
returns trigger as $$
declare
  req_id   bigint;
  base_url text;
  svc_key  text;
begin
  -- Only fire on insert if pilot_id is not already set
  if new.pilot_id is null then

    base_url := coalesce(
      current_setting('app.supabase_url', true),
      'http://host.docker.internal:54321'
    );

    svc_key := coalesce(
      current_setting('app.service_role_key', true),
      ''
    );

    select
      net.http_post(
        url     := base_url || '/functions/v1/dispatch-pilot',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || svc_key
        ),
        body    := json_build_object(
          'type',       'INSERT',
          'table',      'bookings',
          'schema',     'public',
          'record',     row_to_json(new)
        )::jsonb
      )
    into req_id;

  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists dispatch_pilot_webhook on public.bookings;

create trigger dispatch_pilot_webhook
  after insert on public.bookings
  for each row execute procedure public.trigger_dispatch_pilot();
