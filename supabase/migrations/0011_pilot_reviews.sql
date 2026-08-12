-- Migration: 0011_pilot_reviews.sql

-- 1. Alter pilot_profiles to include aggregates
alter table public.pilot_profiles
  add column average_rating numeric(3, 2) not null default 0.00,
  add column total_reviews int not null default 0;

-- 2. Create pilot_reviews table
create table if not exists public.pilot_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  pilot_id uuid not null references public.pilot_profiles(id) on delete cascade,
  farm_manager_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(booking_id)
);

-- Enable RLS
alter table public.pilot_reviews enable row level security;
alter table public.pilot_reviews force row level security;

create policy insert_pilot_reviews on public.pilot_reviews
  for insert
  with check (
    auth.uid() = farm_manager_id 
    and public.can_access_plot((select plot_id from public.bookings where id = booking_id))
  );

create policy select_pilot_reviews on public.pilot_reviews
  for select
  using (true);

-- 3. Trigger to aggregate pilot ratings
create or replace function public.update_pilot_rating()
returns trigger as $$
declare
  target_pilot_id uuid;
begin
  target_pilot_id := coalesce(new.pilot_id, old.pilot_id);

  update public.pilot_profiles
  set 
    total_reviews = (
      select count(*)
      from public.pilot_reviews
      where pilot_id = target_pilot_id
    ),
    average_rating = (
      select coalesce(avg(rating)::numeric(3,2), 0.00)
      from public.pilot_reviews
      where pilot_id = target_pilot_id
    )
  where id = target_pilot_id;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

drop trigger if exists on_pilot_review on public.pilot_reviews;
create trigger on_pilot_review
  after insert or update or delete on public.pilot_reviews
  for each row execute function public.update_pilot_rating();

-- 4. View for flagged pilots
create or replace view public.flagged_pilots_view as
select id, average_rating, total_reviews
from public.pilot_profiles
where average_rating < 3.5 and total_reviews >= 3;
