-- Migration: 0013_schedule_ndvi_cron.sql

-- Task 2.3: Helper function to get bounding boxes of active plots
-- Using ST_Envelope to extract the bounding box, then casting to GeoJSON
create or replace function public.get_active_plots_bboxes()
returns table(id uuid, bbox_geojson jsonb)
language sql
security definer -- Needs to bypass RLS to process all plots in the background
as $$
  select 
    id,
    ST_AsGeoJSON(ST_Envelope(area))::jsonb as bbox_geojson
  from public.farm_plots;
$$;

-- Enable pg_cron extension if not already enabled
create extension if not exists pg_cron;

-- Enable pg_net extension to make HTTP requests from Postgres
create extension if not exists pg_net;

-- Task 3: Schedule the nightly cron job
-- Run at 02:00 IST (20:30 UTC) every day
select cron.schedule(
  'invoke_crop_stress_predictor',
  '30 20 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1) || '/functions/v1/crop-stress-predictor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
      ),
      body := '{"source": "pg_cron", "trigger": "nightly"}'::jsonb
    );
  $$
);
