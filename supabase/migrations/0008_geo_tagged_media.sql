-- Migration: 0008_geo_tagged_media.sql

-- 1. Add image tracking columns to bookings
alter table public.bookings
  add column pre_flight_photo_url text,
  add column post_flight_photo_url text;

-- 2. Create mission-media bucket if not exists
insert into storage.buckets (id, name, public)
values ('mission-media', 'mission-media', true)
on conflict (id) do nothing;

-- 3. Set RLS on the bucket objects
create policy "Public Access to Mission Media"
  on storage.objects for select
  using (bucket_id = 'mission-media');

create policy "Authenticated Users can Upload Media"
  on storage.objects for insert
  with check (bucket_id = 'mission-media' and auth.role() = 'authenticated');
