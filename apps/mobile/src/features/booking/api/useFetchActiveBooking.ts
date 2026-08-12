import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

export function useFetchActiveBooking(plotId: string) {
  return useQuery({
    queryKey: ['activeBooking', plotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('plot_id', plotId)
        .in('status', ['pending', 'ready_to_fly'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!plotId,
  });
}
