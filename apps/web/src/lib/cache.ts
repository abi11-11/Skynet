import type { FarmPlot } from "@skynet/types";

const CACHE_KEY = "skynet_farm_plots";

export function saveFarmPlots(plots: FarmPlot[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(plots));
  } catch (e) {
    console.error("Failed to cache plots", e);
  }
}

export function getCachedFarmPlots(): FarmPlot[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    console.error("Failed to read cached plots", e);
    return null;
  }
}
