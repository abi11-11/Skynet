import * as SecureStore from 'expo-secure-store';
import type { FarmPlot } from "@skynet/types";

const CACHE_KEY = "skynet_farm_plots";

export async function saveFarmPlots(plots: FarmPlot[]) {
  try {
    await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(plots));
  } catch (e) {
    console.error("Failed to cache plots", e);
  }
}

export async function getCachedFarmPlots(): Promise<FarmPlot[] | null> {
  try {
    const cached = await SecureStore.getItemAsync(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    console.error("Failed to read cached plots", e);
    return null;
  }
}
