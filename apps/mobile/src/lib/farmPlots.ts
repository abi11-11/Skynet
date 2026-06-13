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

export async function fetchAssignedFarmPlots(): Promise<{ data: FarmPlot[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("farm_plots")
    .select("*");

  const normalized = error || !data
    ? null
    : (data as RawPlot[]).map((plot) => ({
        ...(plot as Record<string, unknown>),
        area: parsePlotArea(plot.area),
      }) as FarmPlot);

  return { data: normalized, error };
}
