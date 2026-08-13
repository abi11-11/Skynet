import { supabase } from "./supabase";
import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";
import type { PostgrestError } from "@supabase/supabase-js";

type RawPlot = Record<string, unknown>;

function parsePlotArea(area: unknown): GeoJSONPolygon | string | null {
  if (area == null) return null;
  if (typeof area === "string") {
    try {
      const parsed = JSON.parse(area);
      if (parsed?.type === "Polygon" && Array.isArray(parsed.coordinates)) {
        return parsed as GeoJSONPolygon;
      }
    } catch {
      return area;
    }
  }
  return area as GeoJSONPolygon;
}

// ---------------------------------------------------------------------------
// Mock data — used when Supabase is unavailable (e.g. Docker not running)
// Coordinates are real fields near Pune, Maharashtra (lon, lat order per GeoJSON)
// ---------------------------------------------------------------------------
const MOCK_PLOTS: FarmPlot[] = [
  {
    id: "mock-plot-0001-0000-0000-000000000001",
    name: "Kharif Field — Block A",
    description: "Primary rice cultivation block, irrigated, 2.4 acres",
    owner_id: "mock-owner-0000-0000-0000-000000000001",
    manager_id: null,
    created_at: "2025-11-01T08:00:00Z",
    area: {
      type: "Polygon",
      coordinates: [[
        [73.8567, 18.5204],
        [73.8597, 18.5204],
        [73.8597, 18.5234],
        [73.8567, 18.5234],
        [73.8567, 18.5204],
      ]],
    },
  },
  {
    id: "mock-plot-0002-0000-0000-000000000002",
    name: "Rabi Plot — Wheat Field",
    description: "Drip-irrigated wheat plot, 1.8 acres, sandy loam soil",
    owner_id: "mock-owner-0000-0000-0000-000000000001",
    manager_id: "mock-manager-0000-0000-0000-000000000001",
    created_at: "2025-11-15T10:30:00Z",
    area: {
      type: "Polygon",
      coordinates: [[
        [73.8620, 18.5180],
        [73.8660, 18.5180],
        [73.8655, 18.5210],
        [73.8625, 18.5215],
        [73.8610, 18.5200],
        [73.8620, 18.5180],
      ]],
    },
  },
  {
    id: "mock-plot-0003-0000-0000-000000000003",
    name: "Mango Orchard — South",
    description: "Alphonso mango grove, 3.1 acres, established 2019",
    owner_id: "mock-owner-0000-0000-0000-000000000002",
    manager_id: null,
    created_at: "2025-12-01T06:00:00Z",
    area: {
      type: "Polygon",
      coordinates: [[
        [73.8500, 18.5160],
        [73.8540, 18.5155],
        [73.8550, 18.5190],
        [73.8515, 18.5195],
        [73.8495, 18.5175],
        [73.8500, 18.5160],
      ]],
    },
  },
];

export async function getAssignedFarmPlots(): Promise<{ data: FarmPlot[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("farm_plots")
    .select("*");

  if (error || !data) {
    // Backend unavailable — return mock data so the UI can demonstrate plots
    console.warn("[farmPlots] Supabase unavailable, returning mock plot data.", error?.message);
    return { data: MOCK_PLOTS, error: null };
  }

  const normalized = (data as RawPlot[]).map((plot) => ({
    ...(plot as Record<string, unknown>),
    area: parsePlotArea(plot.area),
  }) as FarmPlot);

  return { data: normalized, error: null };
}
