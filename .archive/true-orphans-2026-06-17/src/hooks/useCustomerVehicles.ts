import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerVehicle {
  id: string;
  plate_number: string;
  vehicle_name?: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
  year?: number;
  status: string;
  contract_id?: string;
}

/**
 * Hook لجلب المركبات المرتبطة بالعميل
 * يستخدم في Side Panel
 */
export function useCustomerVehicles(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-vehicles', customerId],
    queryFn: async (): Promise<CustomerVehicle[]> => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, vehicle_name, vehicle_type, make, model, year, status, contract_id')
        .in('status', ['active', 'assigned'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  });
}

