import * as TaskManager from 'expo-task-manager';
import { LocationObject } from 'expo-location';
import { telemetryQueue } from '../services/telemetryQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: LocationObject[] };
    
    try {
      const activeFlightStr = await AsyncStorage.getItem('@active_flight');
      if (!activeFlightStr) return;
      
      const { booking_id, pilot_id } = JSON.parse(activeFlightStr);

      const points = locations.map(loc => ({
        booking_id,
        pilot_id,
        timestamp: new Date(loc.timestamp).toISOString(),
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        altitude: loc.coords.altitude,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
      }));

      await telemetryQueue.enqueue(points);
    } catch (e) {
      console.error('Failed to process background locations', e);
    }
  }
});
