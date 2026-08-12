-- Migration: 0004_create_bookings.sql

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.farm_plots(id) on delete cascade,
  pilot_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending', -- 'pending', 'ready_to_fly', 'completed'
  checkout_signature timestamptz,
  acknowledged_hazards uuid[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_plot_id on public.bookings(plot_id);
create index if not exists idx_bookings_pilot_id on public.bookings(pilot_id);

-- Enable RLS
alter table public.bookings enable row level security;
alter table public.bookings force row level security;

-- Policies for bookings
create policy select_bookings on public.bookings
  for select
  using (
    pilot_id = auth.uid() 
    or public.can_access_plot(plot_id)
  );

create policy insert_bookings on public.bookings
  for insert
  with check (public.is_plot_owner_or_manager(plot_id));

create policy update_bookings on public.bookings
  for update
  using (
    pilot_id = auth.uid() 
    or public.is_plot_owner_or_manager(plot_id)
  )
  with check (
    pilot_id = auth.uid() 
    or public.is_plot_owner_or_manager(plot_id)
  );

create policy delete_bookings on public.bookings
  for delete
  using (public.is_plot_owner_or_manager(plot_id));

-- Auto-update updated_at on row modification
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();
