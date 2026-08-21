import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OWM_API_KEY = Deno.env.get("VITE_OWM_API_KEY") || "f0b81d5beb4bd166bc86e3a979109a19";

// Default Crop Coefficients
const KC_MAP: Record<string, number> = {
  wheat: 1.15,
  corn: 1.2,
  soybeans: 1.15,
  rice: 1.2,
  cotton: 1.15,
  alfalfa: 1.2,
  sugarcane: 1.25,
  unknown: 1.0,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active farm plots with centroid coordinates
    const { data: plots, error: plotsError } = await supabase.rpc("get_active_plots_bboxes");

    if (plotsError) {
      throw new Error(`Failed to fetch plots: ${plotsError.message}`);
    }

    const today = new Date().toISOString().split("T")[0];
    let processed = 0;

    // Use current day of year for Ra approximation
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    for (const plot of plots || []) {
      // Parse bbox to get approx center (MVP simplification: get center of bbox)
      const bbox = typeof plot.bbox_geojson === 'string' ? JSON.parse(plot.bbox_geojson) : plot.bbox_geojson;
      if (!bbox || !bbox.coordinates || !bbox.coordinates[0]) continue;
      
      const coords = bbox.coordinates[0];
      const lng = (coords[0][0] + coords[2][0]) / 2;
      const lat = (coords[0][1] + coords[2][1]) / 2;

      // Fetch weather from OpenWeatherMap
      const owmUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OWM_API_KEY}&units=metric`;
      const wxRes = await fetch(owmUrl);
      
      if (!wxRes.ok) {
        console.error(`Failed to fetch weather for plot ${plot.id}`);
        continue;
      }
      
      const wxData = await wxRes.json();
      const tMin = wxData.main.temp_min;
      const tMax = wxData.main.temp_max;
      const tMean = wxData.main.temp;
      const precipitation = wxData.rain ? (wxData.rain["1h"] || 0) : 0;

      // Approximate Ra (Extraterrestrial Radiation in mm/day) based on latitude and day of year
      const latRad = (lat * Math.PI) / 180;
      const solarDec = 0.409 * Math.sin(((2 * Math.PI * dayOfYear) / 365) - 1.39);
      const ws = Math.acos(-Math.tan(latRad) * Math.tan(solarDec));
      const Ra = (24 * 60 / Math.PI) * 0.0820 * (
        ws * Math.sin(latRad) * Math.sin(solarDec) +
        Math.cos(latRad) * Math.cos(solarDec) * Math.sin(ws)
      ) * 0.408; // convert MJ/m2/day to mm/day

      // Hargreaves-Samani Equation for ET0 (mm/day)
      // Valid only if Tmax > Tmin
      const tempDiff = Math.max(tMax - tMin, 0.1); 
      const ET0 = 0.0023 * Ra * (tMean + 17.8) * Math.sqrt(tempDiff);

      // Compute ETc
      const kc = KC_MAP[plot.crop_type?.toLowerCase()] || KC_MAP.unknown;
      const ETc = ET0 * kc;

      // Retrieve previous day's soil deficit to calculate current deficit
      const { data: prevRecord } = await supabase
        .from("crop_water_balance")
        .select("soil_deficit")
        .eq("plot_id", plot.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevDeficit = prevRecord ? Number(prevRecord.soil_deficit) : 0;
      
      // Deficit calculation: positive value means the soil lacks water
      let currentDeficit = prevDeficit + ETc - precipitation;
      if (currentDeficit < 0) currentDeficit = 0; // Field capacity

      // Upsert the daily record
      const { error: upsertError } = await supabase
        .from("crop_water_balance")
        .upsert({
          plot_id: plot.id,
          date: today,
          et0: parseFloat(ET0.toFixed(2)),
          etc: parseFloat(ETc.toFixed(2)),
          precipitation: parseFloat(precipitation.toFixed(2)),
          irrigation: 0, // Assume 0 unless logged separately
          soil_deficit: parseFloat(currentDeficit.toFixed(2)),
        }, { onConflict: "plot_id,date" });

      if (upsertError) {
        console.error(`Failed to upsert water balance for plot ${plot.id}`, upsertError);
      } else {
        processed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully computed water balance for ${processed} plots.`,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("compute-water-balance error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
