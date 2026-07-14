import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Database } from '@/integrations/supabase/types';

export type VehicleGroup = Database['public']['Tables']['fleet_vehicle_groups']['Row'];
type VehicleGroupInsert = Database['public']['Tables']['fleet_vehicle_groups']['Insert'];
type VehicleGroupUpdate = Database['public']['Tables']['fleet_vehicle_groups']['Update'];

export const useVehicleGroups = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['vehicle-groups', user?.profile?.company_id],
    queryFn: async (): Promise<VehicleGroup[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('fleet_vehicle_groups')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicle groups:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateVehicleGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (groupData: Omit<VehicleGroupInsert, 'company_id'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('fleet_vehicle_groups')
        .insert({
          ...groupData,
          company_id: user.profile.company_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating vehicle group:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-groups'] });
      toast({
        title: "تم إضافة المجموعة",
        description: "تم إنشاء مجموعة المركبات بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error creating vehicle group:', error);
      toast({
        title: "خطأ في إضافة المجموعة",
        description: "حدث خطأ أثناء إنشاء مجموعة المركبات.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateVehicleGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VehicleGroupUpdate }) => {
      if (!user?.profile?.company_id) throw new Error('Company ID is required');
      const { data: result, error } = await supabase
        .from('fleet_vehicle_groups')
        .update(data)
        .eq('id', id)
        .eq('company_id', user.profile.company_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating vehicle group:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-groups'] });
      toast({
        title: "تم تحديث المجموعة",
        description: "تم تحديث بيانات مجموعة المركبات بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error updating vehicle group:', error);
      toast({
        title: "خطأ في تحديث المجموعة",
        description: "حدث خطأ أثناء تحديث بيانات مجموعة المركبات.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteVehicleGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user?.profile?.company_id) throw new Error('Company ID is required');
      const { error } = await supabase
        .from('fleet_vehicle_groups')
        .update({ is_active: false })
        .eq('id', groupId)
        .eq('company_id', user.profile.company_id);

      if (error) {
        console.error('Error deleting vehicle group:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-groups'] });
      toast({
        title: "تم حذف المجموعة",
        description: "تم حذف مجموعة المركبات بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error deleting vehicle group:', error);
      toast({
        title: "خطأ في حذف المجموعة",
        description: "حدث خطأ أثناء حذف مجموعة المركبات.",
        variant: "destructive",
      });
    },
  });
};
