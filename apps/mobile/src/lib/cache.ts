import * as SecureStore from 'expo-secure-store';
import type { FarmPlot } from "@skynet/types";

const CACHE_KEY = "skynet_farm_plots";

export async function saveFarmPlots(plots: FarmPlot[]) {
  try {
    const serialized = JSON.stringify(plots);
    await SecureStore.setItemAsync(CACHE_KEY, serialized);
  } catch (e) {
    console.error("Failed to cache plots - serialization or storage error", e);
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

export async function clearFarmPlotsCache() {
  try {
    await SecureStore.deleteItemAsync(CACHE_KEY);
  } catch (e) {
    console.error("Failed to clear plots cache", e);
  }
}
