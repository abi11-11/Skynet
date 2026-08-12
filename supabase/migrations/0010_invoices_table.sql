-- Migration: 0010_invoices_table.sql

-- 1. Create a service_catalog to hold pricing
create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate_per_acre numeric not null default 10.00
);

-- Seed a default service if none exists
insert into public.service_catalog (name, rate_per_acre) 
values ('Standard Drone Spraying', 15.00);

-- 2. Create invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric not null,
  status text not null default 'pending', -- pending, paid
  upi_link text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.invoices enable row level security;
alter table public.invoices force row level security;

-- Invoice access policy (Farm Managers/Owners of the plot)
create policy select_invoices on public.invoices
  for select
  using (
    public.can_access_plot((select plot_id from public.bookings where id = invoices.booking_id))
  );

-- 3. Trigger to calculate and generate invoice
create or replace function public.generate_invoice_on_completion()
returns trigger as $$
declare
  plot_area geometry;
  acreage numeric;
  base_rate numeric;
  total_amount numeric;
  upi_str text;
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    
    -- [Patch] Prevent Duplicate Invoices
    if exists (select 1 from public.invoices where booking_id = new.id) then
      return new;
    end if;

    -- Get plot area
    select area into plot_area from public.farm_plots where id = new.plot_id;
    
    -- Calculate acreage
    acreage := ST_Area(plot_area::geography) * 0.000247105;
    
    if acreage < 1 then
      acreage := 1;
    end if;

    -- Get base rate from catalog
    select rate_per_acre into base_rate from public.service_catalog limit 1;

    -- [Patch] Fallback for Null Rate
    if base_rate is null then
      base_rate := 15.00;
    end if;

    -- Calculate total
    total_amount := round((acreage * base_rate)::numeric, 2);

    -- Generate UPI Link
    upi_str := 'upi://pay?pa=skynet@bank&pn=Skynet%20AgriServices&am=' || total_amount || '&cu=INR';

    -- Insert Invoice
    insert into public.invoices (booking_id, amount, upi_link)
    values (new.id, total_amount, upi_str);

  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_completed_invoice on public.bookings;
create trigger on_booking_completed_invoice
  after update on public.bookings
  for each row execute function public.generate_invoice_on_completion();
