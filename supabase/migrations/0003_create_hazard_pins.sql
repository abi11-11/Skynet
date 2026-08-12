-- Migration: 0003_create_hazard_pins.sql

-- 1. Create a secure function to check overall plot access
--    NOTE: declared security definer to bypass RLS on farm_plots/farm_plot_assignments
--    and avoid infinite recursion (see migration 0002 for the original recursion fix).
create or replace function public.can_access_plot(p_plot_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.farm_plots
    where id = p_plot_id and (owner_id = auth.uid() or manager_id = auth.uid())
  ) or exists (
    select 1 from public.farm_plot_assignments
    where plot_id = p_plot_id and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Create the hazard_pins table
create table if not exists public.hazard_pins (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.farm_plots(id) on delete cascade,
  reported_by uuid references auth.users(id) on delete set null,
  location geometry(Point, 4326) not null,
  image_path text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hazard_pins_location on public.hazard_pins using gist(location);
create index if not exists idx_hazard_pins_plot_id on public.hazard_pins(plot_id);

-- Enable RLS
alter table public.hazard_pins enable row level security;
alter table public.hazard_pins force row level security;

-- Policies for hazard_pins
create policy select_hazard_pins on public.hazard_pins
  for select
  using (public.can_access_plot(plot_id));

create policy insert_hazard_pins on public.hazard_pins
  for insert
  with check (public.can_access_plot(plot_id));

create policy update_hazard_pins on public.hazard_pins
  for update
  using (reported_by = auth.uid() or public.is_plot_owner_or_manager(plot_id))
  with check (reported_by = auth.uid() or public.is_plot_owner_or_manager(plot_id));

create policy delete_hazard_pins on public.hazard_pins
  for delete
  using (reported_by = auth.uid() or public.is_plot_owner_or_manager(plot_id));

-- 3. Provision the hazard_photos storage bucket (private)
insert into storage.buckets (id, name, public)
values ('hazard_photos', 'hazard_photos', false)
on conflict (id) do nothing;

-- 4. Storage Policies for hazard_photos
--    SELECT: users may only read photos they uploaded themselves (owner-scoped)
create policy select_hazard_photos on storage.objects
  for select
  using (
    bucket_id = 'hazard_photos'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
  );

--    INSERT: any authenticated user may upload into this bucket
create policy insert_hazard_photos on storage.objects
  for insert
  with check (
    bucket_id = 'hazard_photos'
    and auth.role() = 'authenticated'
  );

--    DELETE: only the uploader may delete their own photos
create policy delete_hazard_photos on storage.objects
  for delete
  using (
    bucket_id = 'hazard_photos'
    and auth.role() = 'authenticated'
    and owner = auth.uid()
  );
