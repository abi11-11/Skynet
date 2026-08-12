import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

type EmergencyCallParams = {
  bookingId: string;
  hazardId: string;
};

export function useEmergencyCall() {
  return useMutation({
    mutationFn: async ({ bookingId, hazardId }: EmergencyCallParams) => {
      const { data, error } = await supabase.functions.invoke('emergency-call', {
        body: { bookingId, hazardId },
      });

      if (error) {
        throw new Error(error.message ?? String(error));
      }

      return data;
    },
  });
}
