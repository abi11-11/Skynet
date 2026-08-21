import type { FarmPlot, GeoJSONPolygon } from "@skynet/types";
import { updateFarmPlot } from "./farmPlots";

const API_KEY = import.meta.env.VITE_AGROMONITORING_API_KEY;
const BASE_URL = "http://api.agromonitoring.com/agro/1.0";

export interface SatelliteImage {
  dt: number;
  type: string;
  dc: number;
  cl: number;
  image: {
    ndvi: string;
    evi: string;
    truecolor: string;
  };
  bounds?: [number, number, number, number]; // some representation of corners
}

export type VILayerType = "ndvi" | "evi" | "truecolor";

export async function registerPolygon(plot: FarmPlot): Promise<string | null> {
  if (plot.metadata?.agromonitoring_polyid) {
    return plot.metadata.agromonitoring_polyid as string;
  }
  
  if (!API_KEY) return null;
  
  if (!plot.area || typeof plot.area === 'string' || plot.area.type !== 'Polygon') {
    console.error("[Agromonitoring] Invalid plot area for registration");
    return null;
  }
  
  try {
    const res = await fetch(`${BASE_URL}/polygons?appid=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: plot.name || plot.id,
        geo_json: plot.area
      })
    });
    
    if (!res.ok) {
      console.error("[Agromonitoring] Failed to register polygon:", await res.text());
      return null;
    }
    
    const data = await res.json();
    const polyid = data.id;
    
    if (polyid) {
      const newMeta = { ...(plot.metadata || {}), agromonitoring_polyid: polyid };
      await updateFarmPlot(plot.id, { metadata: newMeta });
      return polyid;
    }
  } catch (err) {
    console.error("[Agromonitoring] Error registering polygon:", err);
  }
  return null;
}

export async function getLatestNDVI(plot: FarmPlot, layerType: VILayerType = "ndvi"): Promise<{ url: string; coordinates: number[][] } | null> {
  if (!plot.area || typeof plot.area === 'string' || plot.area.type !== 'Polygon') return null;
  const polygon = plot.area as GeoJSONPolygon;

  // 1. Calculate bounding box for the polygon so we know where to place the raster
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const ring = polygon.coordinates && polygon.coordinates.length > 0 ? polygon.coordinates[0] : [];
  for (const coord of ring) {
    if (Array.isArray(coord) && coord.length >= 2) {
      if (coord[0] < minLng) minLng = coord[0];
      if (coord[0] > maxLng) maxLng = coord[0];
      if (coord[1] < minLat) minLat = coord[1];
      if (coord[1] > maxLat) maxLat = coord[1];
    }
  }
  
  // Mapbox expects [top-left, top-right, bottom-right, bottom-left]
  const coordinates = [
    [minLng, maxLat],
    [maxLng, maxLat],
    [maxLng, minLat],
    [minLng, minLat]
  ];

  if (!API_KEY) {
    console.warn("[Agromonitoring] No API key found. Returning mock NDVI layer.");
    // Return a generic color gradient or mock image for testing
    return {
      url: "https://docs.mapbox.com/mapbox-gl-js/assets/radar.gif",
      coordinates
    };
  }

  const polyId = await registerPolygon(plot);
  if (!polyId) return null;

  try {
    // Search for images in the last 30 days
    const end = Math.floor(Date.now() / 1000);
    const start = end - (30 * 24 * 60 * 60);
    
    const res = await fetch(`${BASE_URL}/image/search?polyid=${polyId}&start=${start}&end=${end}&appid=${API_KEY}`);
    if (!res.ok) {
      console.error("[Agromonitoring] Error from image search API:", await res.text());
      return null;
    }
    const data: SatelliteImage[] = await res.json();
    
    if (data && data.length > 0) {
      // Get the most recent image with lowest cloud cover (cl)
      const bestImage = data.sort((a, b) => a.cl - b.cl)[0];
      const imageUrl = bestImage.image[layerType];
      if (!imageUrl) {
        console.warn(`[Agromonitoring] Layer type ${layerType} not available on this image`);
        return null;
      }
      return {
        url: imageUrl,
        coordinates
      };
    }
    return null;
  } catch (err) {
    console.error("[Agromonitoring] Error fetching imagery:", err);
    return null;
  }
}

export interface WeatherData {
  main: {
    temp: number;
    humidity: number;
    feels_like: number;
  };
  wind: {
    speed: number;
  };
  rain?: {
    "1h"?: number;
    "3h"?: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  sys: {
    sunrise: number;
    sunset: number;
  };
}

export interface ForecastData extends WeatherData {
  dt: number; // Unix timestamp
}

export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
  if (!API_KEY) {
    const now = Math.floor(Date.now() / 1000);
    return {
      main: { temp: 298.15, humidity: 65, feels_like: 300.15 }, // temp is in Kelvin by default (298.15 = 25C)
      wind: { speed: 4.5 },
      weather: [{ main: "Clouds", description: "scattered clouds" }],
      sys: { sunrise: now - 3600, sunset: now + 36000 }
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("[Agromonitoring] Error fetching weather:", err);
    return null;
  }
}

export interface SoilData {
  t0: number; // Surface temp (K)
  t10: number; // 10cm depth temp (K)
  moisture: number; // m3/m3
}

export async function getCurrentSoilData(polyId: string): Promise<SoilData | null> {
  if (!API_KEY) {
    return {
      t0: 299.15,
      t10: 295.15,
      moisture: 0.28
    };
  }
  try {
    const res = await fetch(`${BASE_URL}/soil?polyid=${polyId}&appid=${API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("[Agromonitoring] Error fetching soil data:", err);
    return null;
  }
}

export async function getWeatherForecast(lat: number, lon: number): Promise<ForecastData[] | null> {
  if (!API_KEY) {
    // Mock 5-day / 3-hour forecast (40 items)
    const mockData: ForecastData[] = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 40; i++) {
      // Generate some variance for temp and rain to test risk modeling
      const temp = 290 + Math.sin(i / 2) * 10; // K
      const humidity = 60 + Math.sin(i / 4) * 30;
      const rain3h = (i % 8 === 0) ? Math.random() * 5 : 0; // occasional rain
      mockData.push({
        dt: now + i * 10800, // 3 hours
        main: { temp, humidity, feels_like: temp + 2 },
        wind: { speed: 3 + Math.random() * 4 },
        rain: rain3h > 0 ? { "3h": rain3h } : undefined,
        weather: [{ main: rain3h > 0 ? "Rain" : "Clear", description: rain3h > 0 ? "light rain" : "clear sky" }],
        sys: { sunrise: now - 3600, sunset: now + 36000 }
      });
    }
    return mockData;
  }
  try {
    const res = await fetch(`${BASE_URL}/weather/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("[Agromonitoring] Error fetching weather forecast:", err);
    return null;
  }
}
