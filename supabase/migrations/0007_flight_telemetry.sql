-- Migration: 0007_flight_telemetry.sql

create table if not exists public.flight_telemetry (
  id uuid default gen_random_uuid(),
  booking_id uuid not null,
  pilot_id uuid not null,
  timestamp timestamptz not null default now(),
  location geometry(Point, 4326) not null,
  accuracy numeric,
  altitude numeric,
  speed numeric,
  heading numeric,
  created_at timestamptz default now(),
  primary key (id, timestamp)
) partition by range (timestamp);

-- Foreign keys on partitioned tables (Postgres 12+)
alter table public.flight_telemetry add foreign key (booking_id) references public.bookings(id) on delete cascade;
alter table public.flight_telemetry add foreign key (pilot_id) references auth.users(id) on delete cascade;

-- Initial partitions
create table if not exists public.flight_telemetry_2026_06 partition of public.flight_telemetry for values from ('2026-06-01') to ('2026-07-01');
create table if not exists public.flight_telemetry_2026_07 partition of public.flight_telemetry for values from ('2026-07-01') to ('2026-08-01');
create table if not exists public.flight_telemetry_default partition of public.flight_telemetry default;

-- Index for spatial and time queries
create index if not exists idx_telemetry_location on public.flight_telemetry using gist(location);
create index if not exists idx_telemetry_booking on public.flight_telemetry(booking_id, timestamp desc);

-- Enable RLS
alter table public.flight_telemetry enable row level security;
alter table public.flight_telemetry force row level security;

-- Policies
create policy insert_flight_telemetry on public.flight_telemetry
  for insert
  with check (pilot_id = auth.uid());

create policy select_flight_telemetry on public.flight_telemetry
  for select
  using (
    pilot_id = auth.uid()
    or 
    exists (
      select 1 from public.bookings b
      join public.farm_plots p on b.plot_id = p.id
      where b.id = flight_telemetry.booking_id
    )
  );
