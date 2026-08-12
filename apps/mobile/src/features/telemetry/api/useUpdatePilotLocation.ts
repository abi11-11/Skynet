import { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { GeoJSONPoint } from '@skynet/types';

/**
 * Hook to periodically update the pilot's location in the database.
 * Real implementation would tie into Expo Location tracking.
 */
export function useUpdatePilotLocation(pilotId: string, isActive: boolean) {
  useEffect(() => {
    if (!pilotId || !isActive) return;

    // Dummy mock location update logic for demonstration
    // A real app uses `expo-location` and background tasks.
    const interval = setInterval(async () => {
      // Mock coordinates near a farm
      const mockLocation: GeoJSONPoint = {
        type: 'Point',
        coordinates: [78.0, 21.0], // Long, Lat
      };

      const { error } = await supabase
        .from('pilot_profiles')
        .update({
          last_known_location: mockLocation,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pilotId);

      if (error) {
        console.error("Failed to update pilot location:", error);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [pilotId, isActive]);
}
