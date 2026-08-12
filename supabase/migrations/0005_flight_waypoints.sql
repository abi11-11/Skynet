-- Migration: 0005_flight_waypoints.sql

-- 1. Add new columns to bookings table
alter table public.bookings
add column if not exists flight_waypoints jsonb,
add column if not exists waypoint_status text default 'pending_pilot_review'
  check (waypoint_status in ('pending_pilot_review', 'approved'));

-- 2. Enable pg_net for outbound HTTP calls from Postgres triggers
create extension if not exists "pg_net";

-- 3. Create the trigger function that fires the Edge Function via HTTP
--    SECURITY DEFINER: runs with the privileges of the function owner (postgres),
--    not the calling user, allowing net.http_post access from within RLS-restricted contexts.
--    The service_role key is read from Supabase Vault at trigger time via current_setting().
--    Set it once via: SELECT vault.create_secret('<key>', 'service_role_key');
create or replace function public.trigger_flight_optimizer()
returns trigger as $$
declare
  req_id   bigint;
  base_url text;
  svc_key  text;
begin
  -- Only fire when status transitions TO 'confirmed'
  if new.status = 'confirmed' and (old.status is distinct from new.status) then

    -- Read configurable values from Supabase Vault / GUC settings.
    -- In local dev these can be set via: ALTER DATABASE postgres SET app.supabase_url = '...';
    -- In production, Supabase automatically exposes these as connection-level settings.
    base_url := coalesce(
      current_setting('app.supabase_url', true),
      'http://host.docker.internal:54321'  -- local Docker fallback only
    );

    svc_key := coalesce(
      current_setting('app.service_role_key', true),
      ''
    );

    select
      net.http_post(
        url     := base_url || '/functions/v1/flight-path-optimizer',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || svc_key
        ),
        body    := json_build_object(
          'type',       'UPDATE',
          'table',      'bookings',
          'schema',     'public',
          'record',     row_to_json(new),
          'old_record', row_to_json(old)
        )::jsonb
      )
    into req_id;

  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to allow idempotent re-runs (e.g., rollback & replay)
drop trigger if exists flight_optimizer_webhook on public.bookings;

create trigger flight_optimizer_webhook
  after update on public.bookings
  for each row execute procedure public.trigger_flight_optimizer();
