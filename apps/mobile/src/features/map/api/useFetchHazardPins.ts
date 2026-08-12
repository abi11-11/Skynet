import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { HazardPin } from '@skynet/types';

export function useFetchHazardPins(plotId: string) {
  return useQuery({
    queryKey: ['hazard_pins', plotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hazard_pins')
        .select('*')
        .eq('plot_id', plotId);

      if (error) {
        throw new Error(error.message);
      }

      return data as HazardPin[];
    },
    enabled: !!plotId,
  });
}
