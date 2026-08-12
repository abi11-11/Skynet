import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BACKGROUND_LOCATION_TASK } from '../tasks/locationTask';
import { telemetryQueue } from '../services/telemetryQueue';

export function useFlightTelemetry() {
  const [isTracking, setIsTracking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        telemetryQueue.flush();
      }
    });

    return () => unsubscribe();
  }, []);

  const startTracking = useCallback(async (bookingId: string, pilotId: string) => {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        setErrorMsg('Foreground location permission denied');
        return;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        setErrorMsg('Background location permission denied');
        return;
      }

      await AsyncStorage.setItem('@active_flight', JSON.stringify({
        booking_id: bookingId,
        pilot_id: pilotId,
      }));

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 1,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Skynet Flight Tracking',
          notificationBody: 'Recording live flight telemetry...',
          notificationColor: '#10b981',
        },
      });

      setIsTracking(true);
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to start tracking');
      console.error(e);
    }
  }, []);

  const stopTracking = useCallback(async () => {
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      await AsyncStorage.removeItem('@active_flight');
      setIsTracking(false);
      
      // Attempt a final flush
      await telemetryQueue.flush();
    } catch (e: any) {
      console.error('Failed to stop tracking', e);
    }
  }, []);

  return {
    isTracking,
    startTracking,
    stopTracking,
    errorMsg,
  };
}
