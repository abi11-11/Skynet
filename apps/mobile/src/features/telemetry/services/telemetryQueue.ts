import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';

const QUEUE_KEY = '@telemetry_queue';
const MAX_QUEUE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TelemetryPoint {
  booking_id: string;
  pilot_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
}

export const telemetryQueue = {
  async enqueue(points: TelemetryPoint[]) {
    try {
      const existingStr = await AsyncStorage.getItem(QUEUE_KEY);
      let queue: TelemetryPoint[] = [];
      if (existingStr) {
        try {
          queue = JSON.parse(existingStr);
        } catch (parseError) {
          console.warn('Telemetry queue parse error in enqueue, resetting queue', parseError);
        }
      }
      
      queue = [...queue, ...points];
      
      // Prune old entries (TTL)
      const now = Date.now();
      queue = queue.filter(p => now - new Date(p.timestamp).getTime() < TTL_MS);
      
      const newStr = JSON.stringify(queue);
      
      // Enforce 50MB hard cap
      if (newStr.length * 2 > MAX_QUEUE_SIZE_BYTES) {
        console.warn('Telemetry queue exceeded 50MB, dropping oldest points');
        queue = queue.slice(Math.floor(queue.length / 2));
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      } else {
        await AsyncStorage.setItem(QUEUE_KEY, newStr);
      }
    } catch (e) {
      console.error('Failed to enqueue telemetry', e);
    }
  },

  async flush() {
    try {
      const existingStr = await AsyncStorage.getItem(QUEUE_KEY);
      if (!existingStr) return;
      
      let queue: TelemetryPoint[] = [];
      try {
        queue = JSON.parse(existingStr);
      } catch (parseError) {
        console.warn('Telemetry queue parse error in flush, clearing corrupted queue', parseError);
        await AsyncStorage.removeItem(QUEUE_KEY);
        return;
      }
      
      if (queue.length === 0) return;

      // ... existing code ...
      const payloads = queue.map(p => ({
        booking_id: p.booking_id,
        pilot_id: p.pilot_id,
        timestamp: p.timestamp,
        location: `SRID=4326;POINT(${p.longitude} ${p.latitude})`,
        accuracy: p.accuracy,
        altitude: p.altitude,
        speed: p.speed,
        heading: p.heading,
      }));

      // Insert in chunks of 100
      const CHUNK_SIZE = 100;
      let totalFlushed = 0;
      
      for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
        const chunk = payloads.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('flight_telemetry')
          .insert(chunk);
          
        if (error) {
          console.error('Failed to sync telemetry chunk', error);
          throw error;
        }
        
        const latestStr = await AsyncStorage.getItem(QUEUE_KEY);
        if (latestStr) {
          try {
            let currentQueue: TelemetryPoint[] = JSON.parse(latestStr);
            const chunkTimestamps = new Set(chunk.map(p => p.timestamp));
            currentQueue = currentQueue.filter(p => !chunkTimestamps.has(p.timestamp));
            
            if (currentQueue.length > 0) {
              await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
            } else {
              await AsyncStorage.removeItem(QUEUE_KEY);
            }
          } catch(parseError) {
             console.warn('Failed to parse latest queue during incremental flush update', parseError);
          }
        }
      }

      console.log(`Flushed ${totalFlushed} telemetry points to cloud.`);
    } catch (e) {
      console.error('Telemetry flush error', e);
    }
  }
};
