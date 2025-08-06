import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ContractVehicle } from "@/types/vehicle-installments";

export const useContractVehicles = (installmentId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['contract-vehicles', installmentId, user?.id],
    queryFn: async (): Promise<ContractVehicle[]> => {
      if (!user?.id || !installmentId) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('contract_vehicles')
        .select(`
          *,
          vehicles:vehicle_id (
            id,
            plate_number,
            model,
            make,
            year
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('vehicle_installment_id', installmentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as ContractVehicle[];
    },
    enabled: !!user?.id && !!installmentId,
  });
};