import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../lib/supabase';

type PhotoType = 'pre_flight' | 'post_flight';

export function useMediaEvidence() {
  const [isUploading, setIsUploading] = useState(false);

  const captureAndUpload = async (bookingId: string, type: PhotoType) => {
    try {
      setIsUploading(true);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        exif: true,
      });

      if (result.canceled) {
        setIsUploading(false);
        return false;
      }

      const asset = result.assets[0];

      // Compress Photo (< 1MB)
      const manipResult = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Read as Base64
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase Storage
      const fileName = `${bookingId}/${type}_${Date.now()}.jpg`;
      const { error: storageError } = await supabase.storage
        .from('mission-media')
        .upload(fileName, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (storageError) throw storageError;

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('mission-media')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Update Database
      const updatePayload = type === 'pre_flight' 
        ? { pre_flight_photo_url: publicUrl }
        : { post_flight_photo_url: publicUrl };

      const { error: dbError } = await supabase
        .from('bookings')
        .update(updatePayload)
        .eq('id', bookingId);

      if (dbError) throw dbError;

      setIsUploading(false);
      return publicUrl;
      
    } catch (e) {
      console.error('Media upload failed', e);
      setIsUploading(false);
      throw e;
    }
  };

  return {
    captureAndUpload,
    isUploading
  };
}
