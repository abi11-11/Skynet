-- Supabase migration: create tenant-aware farm plots and assignment policy schema

create extension if not exists postgis;

-- Tenant-aware farm plots table with PostGIS polygon boundaries.
create table if not exists public.farm_plots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  manager_id uuid references auth.users(id) on delete set null,
  parent_plot_id uuid references public.farm_plots(id) on delete set null,
  name text not null,
  description text,
  area geometry(Polygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_farm_plots_area on public.farm_plots using gist(area);

-- Explicit assignment table for user-level plot access.
create table if not exists public.farm_plot_assignments (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.farm_plots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(plot_id, user_id)
);

-- Enable Row Level Security on tenant-aware tables.
alter table public.farm_plots enable row level security;
alter table public.farm_plots force row level security;
alter table public.farm_plot_assignments enable row level security;
alter table public.farm_plot_assignments force row level security;

create policy select_farm_plots_assigned on public.farm_plots
  for select
  using (
    auth.uid() = owner_id
    or auth.uid() = manager_id
    or auth.uid() in (
      select user_id
      from public.farm_plot_assignments
      where plot_id = public.farm_plots.id
    )
  );

create policy insert_farm_plots_owner on public.farm_plots
  for insert
  with check (auth.uid() = owner_id);

create policy update_farm_plots_owner on public.farm_plots
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy delete_farm_plots_owner on public.farm_plots
  for delete
  using (auth.uid() = owner_id);

create policy select_farm_plot_assignments on public.farm_plot_assignments
  for select
  using (
    auth.uid() = user_id
    or auth.uid() = (
      select owner_id from public.farm_plots where id = public.farm_plot_assignments.plot_id
    )
    or auth.uid() = (
      select manager_id from public.farm_plots where id = public.farm_plot_assignments.plot_id
    )
  );

create policy insert_farm_plot_assignments on public.farm_plot_assignments
  for insert
  with check (
    auth.uid() = (
      select owner_id from public.farm_plots where id = public.farm_plot_assignments.plot_id
    )
    or auth.uid() = (
      select manager_id from public.farm_plots where id = public.farm_plot_assignments.plot_id
    )
  );

create policy update_farm_plot_assignments_owner on public.farm_plot_assignments
  for update
  using (
    auth.uid() = (
      select owner_id from public.farm_plots where id = public.farm_plot_assignments.plot_id
    )
  )
  with check (
    auth.uid() = (
      select owner_id from public.farm_plots where id = public.farm_plot_assignments.plot_id
    )
  );

create policy delete_farm_plot_assignments_owner on public.farm_plot_assignments
  for delete
  using (
    auth.uid() = (
      select owner_id from public.farm_plots where id = public.farm_plot_assignments.plot_id
    )
  );
