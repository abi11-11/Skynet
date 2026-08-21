-- 0018_enterprise_features.sql
-- Variable Rate Application (VRA) Maps
CREATE TABLE vra_prescriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id         uuid NOT NULL REFERENCES farm_plots(id) ON DELETE CASCADE,
  name            text NOT NULL,
  target_chemical text NOT NULL, -- e.g., 'Urea 46%', 'MOP'
  total_quantity  decimal(10,2), -- total kg required across plot
  export_format   text CHECK (export_format IN ('geojson', 'shapefile', 'isoxml')),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'exported', 'applied')),
  created_at      timestamptz DEFAULT now()
);

-- Management Zones inside a VRA map
CREATE TABLE vra_zones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES vra_prescriptions(id) ON DELETE CASCADE,
  zone_number     int NOT NULL,
  vigor_level     text NOT NULL CHECK (vigor_level IN ('low', 'medium', 'high')),
  target_rate     decimal(8,2) NOT NULL, -- e.g., 100.00
  unit            text NOT NULL DEFAULT 'kg/ha',
  boundary        geography(Polygon, 4326) NOT NULL -- PostGIS polygon representing the zone
);

-- Crop Water Balance Logs
CREATE TABLE crop_water_balance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id         uuid NOT NULL REFERENCES farm_plots(id) ON DELETE CASCADE,
  date            date NOT NULL DEFAULT current_date,
  et0             decimal(5,2) NOT NULL, -- Reference ET (mm)
  etc             decimal(5,2) NOT NULL, -- Crop ET adjusted by stage (mm)
  precipitation   decimal(5,2) DEFAULT 0.00, -- Rain (mm)
  irrigation      decimal(5,2) DEFAULT 0.00, -- Irrigation applied (mm)
  soil_deficit    decimal(5,2) NOT NULL, -- Current water deficit (mm)
  created_at      timestamptz DEFAULT now(),
  UNIQUE(plot_id, date)
);

-- Crop Budget Setup
CREATE TABLE crop_budgets (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id                    uuid NOT NULL REFERENCES farm_plots(id) ON DELETE CASCADE,
  crop_name                  text NOT NULL,
  target_yield_tonnes        decimal(6,2) NOT NULL,
  expected_price_per_tonne   decimal(10,2) NOT NULL,
  budgeted_materials_cost    decimal(10,2) DEFAULT 0.00,
  budgeted_labor_cost        decimal(10,2) DEFAULT 0.00,
  budgeted_machinery_cost    decimal(10,2) DEFAULT 0.00,
  budgeted_other_cost        decimal(10,2) DEFAULT 0.00,
  created_at                 timestamptz DEFAULT now(),
  updated_at                 timestamptz DEFAULT now(),
  CONSTRAINT unique_plot_active_budget UNIQUE(plot_id) -- one active budget per plot
);

-- Transaction/Input Cost Records
CREATE TABLE farm_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id          uuid NOT NULL REFERENCES farm_plots(id) ON DELETE CASCADE,
  type             text NOT NULL CHECK (type IN ('expense', 'revenue')),
  category         text NOT NULL CHECK (category IN (
    'seed', 'fertilizer', 'pesticide', 'water', 'labor', 'machinery', 'fuel', 'harvest_sale', 'other'
  )),
  amount           decimal(12,2) NOT NULL,
  quantity         decimal(8,2), -- e.g., 50.00
  unit             text,         -- e.g., 'kg', 'hours', 'litres'
  description      text,
  transaction_date date NOT NULL DEFAULT current_date,
  created_at       timestamptz DEFAULT now()
);

-- Indexing for quick aggregate calculations
CREATE INDEX idx_transactions_plot_type ON farm_transactions(plot_id, type);

-- Harvest Batches (for QR Traceability)
CREATE TABLE harvest_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id         uuid NOT NULL REFERENCES farm_plots(id) ON DELETE CASCADE,
  batch_number    text NOT NULL UNIQUE,
  harvest_date    date NOT NULL DEFAULT current_date,
  total_yield_kg  decimal(10,2) NOT NULL,
  quality_grade   text,
  qr_code_url     text, -- public URL for the traceability profile
  created_at      timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE vra_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vra_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_water_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_batches ENABLE ROW LEVEL SECURITY;

-- Temporary public access for demonstration / local dev
CREATE POLICY "Public read/write access for vra_prescriptions" ON vra_prescriptions FOR ALL USING (true);
CREATE POLICY "Public read/write access for vra_zones" ON vra_zones FOR ALL USING (true);
CREATE POLICY "Public read/write access for crop_water_balance" ON crop_water_balance FOR ALL USING (true);
CREATE POLICY "Public read/write access for crop_budgets" ON crop_budgets FOR ALL USING (true);
CREATE POLICY "Public read/write access for farm_transactions" ON farm_transactions FOR ALL USING (true);
CREATE POLICY "Public read/write access for harvest_batches" ON harvest_batches FOR ALL USING (true);
