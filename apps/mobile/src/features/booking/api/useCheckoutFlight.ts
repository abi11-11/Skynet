import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { Booking } from '@skynet/types';

type CheckoutPayload = {
  bookingId: string;
  acknowledgedHazards: string[];
};

export function useCheckoutFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, acknowledgedHazards }: CheckoutPayload) => {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'ready_to_fly',
          checkout_signature: new Date().toISOString(),
          acknowledged_hazards: acknowledgedHazards,
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Booking;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['booking', data.id], data);
    },
  });
}
