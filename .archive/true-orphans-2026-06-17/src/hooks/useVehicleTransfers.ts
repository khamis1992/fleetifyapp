import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface VehicleTransfer {
  id: string;
  company_id: string;
  vehicle_id: string;
  from_branch_id?: string;
  to_branch_id: string;
  transfer_date: string;
  requested_by?: string;
  approved_by?: string;
  transfer_reason?: string;
  odometer_reading?: number;
  fuel_level?: number;
  condition_notes?: string;
  status: 'pending' | 'approved' | 'in_transit' | 'completed' | 'cancelled';
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

export const useVehicleTransfers = (vehicleId?: string) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['vehicle-transfers', user?.profile?.company_id, vehicleId],
    queryFn: async (): Promise<VehicleTransfer[]> => {
      if (!user?.profile?.company_id) return [];
      
      let query = supabase
        .from('vehicle_transfers')
        .select(`
          *,
          vehicles!vehicle_transfers_vehicle_id_fkey(plate_number, make, model),
          from_branch:branches!vehicle_transfers_from_branch_id_fkey(branch_name),
          to_branch:branches!vehicle_transfers_to_branch_id_fkey(branch_name)
        `)
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false });
      
      if (vehicleId) {
        query = query.eq('vehicle_id', vehicleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateVehicleTransfer = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (transferData: Omit<VehicleTransfer, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) throw new Error('No company ID');
      
      const { data, error } = await supabase
        .from('vehicle_transfers')
        .insert({
          ...transferData,
          company_id: user.profile.company_id,
          requested_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-transfers'] });
      toast({
        title: "تم إنشاء طلب النقل بنجاح",
        description: "تم تسجيل طلب نقل المركبة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إنشاء طلب النقل",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateVehicleTransfer = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleTransfer> }) => {
      const updateData = { ...data };
      
      // Add approved_by if status is being changed to approved
      if (data.status === 'approved') {
        updateData.approved_by = user?.id;
      }
      
      // Add completed_date if status is being changed to completed
      if (data.status === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
      }
      
      const { data: updated, error } = await supabase
        .from('vehicle_transfers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-transfers'] });
      
      let message = "تم تحديث طلب النقل";
      if (data.status === 'approved') message = "تم اعتماد طلب النقل";
      if (data.status === 'completed') message = "تم إكمال عملية النقل";
      if (data.status === 'cancelled') message = "تم إلغاء طلب النقل";
      
      toast({
        title: "تم التحديث بنجاح",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تحديث طلب النقل",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};