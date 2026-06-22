
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';

export const useContractVehicle = (vehicleId?: string) => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['vehicle', vehicleId, companyId],
    queryFn: async () => {
      if (!vehicleId || !companyId) return null;
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, model, make, year')
        .eq('id', vehicleId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching vehicle:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!vehicleId && !!companyId
  });
};
