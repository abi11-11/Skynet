-- Migration: 0014_crop_types_and_thresholds.sql

-- 1. Add crop_type to farm_plots
ALTER TABLE public.farm_plots 
ADD COLUMN crop_type text NOT NULL DEFAULT 'unknown';

-- 2. Update get_active_plots_bboxes to include crop_type
DROP FUNCTION IF EXISTS public.get_active_plots_bboxes();
CREATE OR REPLACE FUNCTION public.get_active_plots_bboxes()
RETURNS TABLE(id uuid, bbox_geojson jsonb, crop_type text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    ST_AsGeoJSON(ST_Envelope(area))::jsonb AS bbox_geojson,
    crop_type
  FROM public.farm_plots;
$$;

-- 3. Add index for risk scores query
CREATE INDEX IF NOT EXISTS idx_risk_scores_plot_expires 
ON plot_risk_scores(plot_id, expires_at);
