import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../../lib/supabase';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { enqueuePin } from '../../../store/offlineHazardPinQueue';

const MAX_UPLOAD_BYTES = 1_000_000; // 1 MB — architecture hard limit

export type CreateHazardPinArgs = {
  plot_id: string;
  location: [number, number]; // [longitude, latitude] — GeoJSON standard
  description?: string;
  localImageUri?: string;
  /** Populated by the hook — do not pass manually */
  _userId?: string;
};

export type CreateHazardPinResult =
  | { data: unknown }
  | { error: string }
  | { queued: true; localId: string };

export const useCreateHazardPin = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateHazardPinResult, Error, CreateHazardPinArgs>({
    mutationFn: async (args: CreateHazardPinArgs): Promise<CreateHazardPinResult> => {
      // ── Offline gate ────────────────────────────────────────────────────────
      const netState = await NetInfo.fetch();
      // isInternetReachable can be null initially; fallback to isConnected if so
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;

      if (!isOnline) {
        // Resolve the current user ID for queue namespacing
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? 'anonymous';

        const queued = await enqueuePin(userId, {
          plot_id: args.plot_id,
          location: args.location,
          description: args.description ?? null,
          // Photos cannot be re-uploaded later (local URI is transient)
          // Offline pins are stored without photo; photo can be added when back online
        });

        return { queued: true, localId: queued.localId };
      }

      // ── Online path (unchanged from Story 2.1) ─────────────────────────────
      let image_path = null;

      if (args.localImageUri) {
        const manipResult = await manipulateAsync(
          args.localImageUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );

        const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Guard: enforce < 1MB upload limit (architecture requirement)
        const estimatedBytes = (base64.length * 3) / 4;
        if (estimatedBytes > MAX_UPLOAD_BYTES) {
          return {
            error: `Compressed image exceeds the 1 MB limit (${(estimatedBytes / 1024).toFixed(0)} KB). Please use a shorter focal distance.`,
          };
        }

        const fileName = `${args.plot_id}/${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('hazard_photos')
          .upload(fileName, decode(base64), { contentType: 'image/jpeg' });

        if (uploadError) {
          return { error: `Photo upload failed: ${uploadError.message}` };
        }
        image_path = uploadData.path;
      }

      const locationPoint = { type: 'Point', coordinates: args.location };

      const { data, error } = await supabase
        .from('hazard_pins')
        .insert({
          plot_id: args.plot_id,
          location: locationPoint,
          description: args.description || null,
          image_path,
        })
        .select()
        .single();

      if (error) {
        return { error: `Failed to save hazard pin: ${error.message}` };
      }

      return { data };
    },

    onSuccess: (result, variables) => {
      if ('error' in result && result.error) {
        Alert.alert('Hazard Pin Error', result.error);
        return;
      }
      if ('queued' in result && result.queued) {
        // Offline queued — surface a non-error toast so the user knows it's safe
        Alert.alert(
          '📥 Saved Offline',
          'Hazard pin saved locally. It will sync automatically when you regain connectivity.'
        );
        return;
      }
      // Online success — invalidate cache so the map refreshes
      queryClient.invalidateQueries({ queryKey: ['hazard_pins', variables.plot_id] });
    },

    onError: (err: Error) => {
      Alert.alert('Unexpected Error', err.message ?? 'Something went wrong. Please try again.');
    },
  });
};
