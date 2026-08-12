-- Migration: 0009_report_trigger.sql

create extension if not exists "pg_net" with schema "extensions";

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

create policy "Reports accessible by Farm Managers"
  on storage.objects for select
  using (bucket_id = 'reports');

create policy "Edge Functions can insert reports"
  on storage.objects for insert
  with check (bucket_id = 'reports');

create or replace function public.trigger_coverage_report()
returns trigger as $$
declare
  req_id bigint;
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    select
      net.http_post(
          url:='http://host.docker.internal:54321/functions/v1/generate-report',
          headers:='{"Content-Type": "application/json"}'::jsonb,
          body:=json_build_object(
            'type', 'UPDATE',
            'table', 'bookings',
            'record', row_to_json(new)
          )::jsonb
      ) into req_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_completed on public.bookings;
create trigger on_booking_completed
  after update on public.bookings
  for each row execute function public.trigger_coverage_report();
