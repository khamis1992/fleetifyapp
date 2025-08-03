import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useContractVehicle = (vehicleId?: string) => {
  return useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, model, make, year')
        .eq('id', vehicleId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching vehicle:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!vehicleId
  });
};