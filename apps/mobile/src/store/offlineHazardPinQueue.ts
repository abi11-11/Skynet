/**
 * Offline Hazard Pin Queue
 *
 * Stores hazard pin create requests locally when the device is offline.
 * Namespaced by user ID to prevent cross-user sync collisions, per architecture mandate:
 *   Key format: `offline_queue:hazard_pins:<userId>`
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Architecture-mandated key prefix (see architecture.md — Communication Patterns)
const QUEUE_KEY_PREFIX = 'offline_queue:hazard_pins';

export type QueuedHazardPin = {
  localId: string;         // Client-generated UUID for deduplication
  queuedAt: string;        // ISO-8601 UTC timestamp
  plot_id: string;
  location: [number, number]; // [longitude, latitude] — GeoJSON standard
  description: string | null;
  // Photo cannot be re-uploaded offline (local URI may be transient)
  // Offline pins have no photo — photo upload is online-only in this story
};

const buildKey = (userId: string): string => `${QUEUE_KEY_PREFIX}:${userId}`;

/** Read the full queue for a given user. Returns [] on parse failure (safe default). */
export const getQueuedPins = async (userId: string): Promise<QueuedHazardPin[]> => {
  try {
    const raw = await AsyncStorage.getItem(buildKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Validate it is an array before returning to prevent downstream runtime errors
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Append one pin to the queue. */
export const enqueuePin = async (userId: string, pin: Omit<QueuedHazardPin, 'localId' | 'queuedAt'>): Promise<QueuedHazardPin> => {
  const existing = await getQueuedPins(userId);
  const newEntry: QueuedHazardPin = {
    ...pin,
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    queuedAt: new Date().toISOString(),
  };
  const updated = [...existing, newEntry];
  await AsyncStorage.setItem(buildKey(userId), JSON.stringify(updated));
  return newEntry;
};

/** Remove one pin from the queue by its localId after successful sync. */
export const removeQueuedPin = async (userId: string, localId: string): Promise<void> => {
  const existing = await getQueuedPins(userId);
  const filtered = existing.filter((p) => p.localId !== localId);
  await AsyncStorage.setItem(buildKey(userId), JSON.stringify(filtered));
};

/** Clear the entire queue for a user (use after full sync). */
export const clearQueue = async (userId: string): Promise<void> => {
  await AsyncStorage.removeItem(buildKey(userId));
};
