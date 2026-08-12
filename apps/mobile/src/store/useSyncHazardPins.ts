/**
 * useSyncHazardPins
 *
 * Mounts a NetInfo connectivity listener. When the device transitions from
 * offline → online, it drains the per-user offline hazard pin queue and
 * replays each queued insert to Supabase.
 *
 * Returns the current pending-queue count so the UI can surface a banner.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  getQueuedPins,
  removeQueuedPin,
  type QueuedHazardPin,
} from '../store/offlineHazardPinQueue';

export const useSyncHazardPins = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncing = useRef(false);

  // Helper: resolve the current user ID from Supabase auth
  const getUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  };

  // Refresh the pending count badge (called after each sync attempt)
  const refreshCount = useCallback(async () => {
    const userId = await getUserId();
    if (!userId) {
      setPendingCount(0);
      return;
    }
    const queue = await getQueuedPins(userId);
    setPendingCount(queue.length);
  }, []);

  // Replay a single queued pin against Supabase
  const syncPin = async (userId: string, pin: QueuedHazardPin): Promise<boolean> => {
    const locationPoint = {
      type: 'Point',
      coordinates: pin.location,
    };

    const { error } = await supabase
      .from('hazard_pins')
      .insert({
        id: pin.localId, // Idempotency key from the offline queue
        plot_id: pin.plot_id,
        location: locationPoint,
        description: pin.description,
        image_path: null, // Offline pins cannot include photos (local URI is transient)
      });

    if (error) {
      // Deterministic PostgREST errors (e.g., constraint violations) have a 'code'.
      // If we encounter a DB error, drop the poison pill to prevent indefinite queue blockage.
      // Network failures lack a 'code' and will be left in the queue for the next retry.
      if (error.code) {
        console.warn(`[HazardSync] Deterministic error dropping pin ${pin.localId}:`, error.message);
        await removeQueuedPin(userId, pin.localId);
      }
      return false;
    }

    await removeQueuedPin(userId, pin.localId);
    return true;
  };

  // Drain the full queue: attempt each item, leave failures for next reconnect
  const drainQueue = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      const userId = await getUserId();
      if (!userId) return;

      const queue = await getQueuedPins(userId);
      if (queue.length === 0) return;

      let successCount = 0;
      for (const pin of queue) {
        const ok = await syncPin(userId, pin);
        if (ok) successCount++;
      }

      await refreshCount();

      if (successCount > 0) {
        Alert.alert(
          '✅ Hazards Synced',
          `${successCount} offline hazard pin${successCount > 1 ? 's' : ''} uploaded successfully.`
        );
      }
    } finally {
      isSyncing.current = false;
    }
  }, [refreshCount]);

  // Subscribe to connectivity changes
  useEffect(() => {
    // Populate initial pending count
    refreshCount();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        drainQueue();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [drainQueue, refreshCount]);

  return { pendingCount, drainQueue };
};
