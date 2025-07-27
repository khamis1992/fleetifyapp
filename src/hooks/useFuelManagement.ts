import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface FuelRecord {
  id: string;
  company_id: string;
  vehicle_id: string;
  fuel_date: string;
  fuel_station?: string;
  fuel_type: string;
  quantity_liters: number;
  cost_per_liter: number;
  total_cost: number;
  odometer_reading?: number;
  receipt_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FuelEfficiency {
  total_fuel_liters: number;
  total_distance_km: number;
  fuel_efficiency_km_per_liter: number;
  average_cost_per_liter: number;
  total_fuel_cost: number;
}

export const useFuelRecords = (vehicleId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['fuel-records', user?.profile?.company_id, vehicleId],
    queryFn: async (): Promise<FuelRecord[]> => {
      let query = supabase
        .from('fuel_records')
        .select('*')
        .eq('company_id', user?.profile?.company_id!)
        .order('fuel_date', { ascending: false });
      
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useFuelEfficiency = (vehicleId: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['fuel-efficiency', vehicleId, startDate, endDate],
    queryFn: async (): Promise<FuelEfficiency> => {
      const { data, error } = await supabase.rpc('calculate_fuel_efficiency', {
        vehicle_id_param: vehicleId,
        start_date: startDate || null,
        end_date: endDate || null
      });
      
      if (error) throw error;
      return data?.[0] || {
        total_fuel_liters: 0,
        total_distance_km: 0,
        fuel_efficiency_km_per_liter: 0,
        average_cost_per_liter: 0,
        total_fuel_cost: 0
      };
    },
    enabled: !!vehicleId,
  });
};

export const useCreateFuelRecord = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (fuelRecord: Omit<FuelRecord, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      const { data, error } = await supabase
        .from('fuel_records')
        .insert({
          ...fuelRecord,
          company_id: user?.profile?.company_id!,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-records'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-efficiency'] });
      toast({
        title: "تم إضافة سجل الوقود",
        description: "تم حفظ سجل التعبئة بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إضافة سجل الوقود",
        description: "حدث خطأ أثناء حفظ البيانات",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateFuelRecord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('fuel_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-records'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-efficiency'] });
      toast({
        title: "تم تحديث سجل الوقود",
        description: "تم حفظ التغييرات بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في تحديث سجل الوقود",
        description: "حدث خطأ أثناء حفظ التغييرات",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteFuelRecord = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_records')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-records'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-efficiency'] });
      toast({
        title: "تم حذف سجل الوقود",
        description: "تم حذف السجل بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في حذف سجل الوقود",
        description: "حدث خطأ أثناء حذف السجل",
        variant: "destructive",
      });
    },
  });
};