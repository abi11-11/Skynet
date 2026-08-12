-- Migration: 0012_create_geoai_tables.sql

CREATE TABLE plot_ndvi_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id     uuid NOT NULL REFERENCES farm_plots(id) ON DELETE CASCADE,
  ndvi_value  decimal(5,4) NOT NULL,   -- e.g. 0.3421
  captured_at timestamptz NOT NULL DEFAULT now(),
  source      text NOT NULL DEFAULT 'sentinel'
);

CREATE TABLE plot_risk_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id             uuid NOT NULL REFERENCES farm_plots(id) ON DELETE CASCADE,
  risk_level          text NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  recommended_service text,           -- e.g. 'precision-spray', 'soil-survey'
  confidence          decimal(3,2),   -- e.g. 0.87
  expires_at          timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE plot_ndvi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_ndvi_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE plot_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_risk_scores FORCE ROW LEVEL SECURITY;

-- RLS: Users can read NDVI data for plots they have access to
-- Uses can_access_plot() SECURITY DEFINER function from migration 0003
-- to avoid infinite recursion with farm_plots/farm_plot_assignments RLS
CREATE POLICY select_ndvi_snapshots ON plot_ndvi_snapshots
  FOR SELECT USING (public.can_access_plot(plot_id));

CREATE POLICY select_risk_scores ON plot_risk_scores
  FOR SELECT USING (public.can_access_plot(plot_id));

-- Performance index for 14-day rolling average queries
CREATE INDEX idx_ndvi_snapshots_plot_time ON plot_ndvi_snapshots(plot_id, captured_at DESC);

-- Idempotency guard: one NDVI snapshot per plot per calendar day per source
-- Uses functional index on captured_at::date instead of full timestamptz
CREATE UNIQUE INDEX idx_ndvi_snapshots_daily_unique
  ON plot_ndvi_snapshots(plot_id, (captured_at::date), source);
