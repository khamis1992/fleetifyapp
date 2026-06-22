import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FleetVehicleGroup {
  id: string;
  company_id: string;
  group_name: string;
  group_name_ar?: string;
  description?: string;
  manager_id?: string;
  parent_group_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFleetVehicleGroups = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['fleet-vehicle-groups', user?.profile?.company_id],
    queryFn: async (): Promise<FleetVehicleGroup[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('fleet_vehicle_groups')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('group_name');

      if (error) {
        console.error('Error fetching fleet vehicle groups:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateFleetVehicleGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (groupData: Omit<FleetVehicleGroup, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'is_active'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('fleet_vehicle_groups')
        .insert([{
          ...groupData,
          company_id: user.profile.company_id,
          is_active: true,
        }])
        .select();

      if (error) {
        console.error('Error creating fleet vehicle group:', error);
        throw error;
      }

      return data[0];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicle-groups'] });
      toast({
        title: "تم إضافة المجموعة",
        description: "تم إنشاء مجموعة المركبات بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error creating fleet vehicle group:', error);
      toast({
        title: "خطأ في إضافة المجموعة",
        description: "حدث خطأ أثناء إنشاء مجموعة المركبات.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateFleetVehicleGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FleetVehicleGroup> }) => {
      const { data: result, error } = await supabase
        .from('fleet_vehicle_groups')
        .update(data)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating fleet vehicle group:', error);
        throw error;
      }

      return result[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicle-groups'] });
      toast({
        title: "تم تحديث المجموعة",
        description: "تم تحديث بيانات مجموعة المركبات بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error updating fleet vehicle group:', error);
      toast({
        title: "خطأ في تحديث المجموعة",
        description: "حدث خطأ أثناء تحديث بيانات مجموعة المركبات.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteFleetVehicleGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('fleet_vehicle_groups')
        .update({ is_active: false })
        .eq('id', groupId);

      if (error) {
        console.error('Error deleting fleet vehicle group:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicle-groups'] });
      toast({
        title: "تم حذف المجموعة",
        description: "تم حذف مجموعة المركبات بنجاح.",
      });
    },
    onError: (error) => {
      console.error('Error deleting fleet vehicle group:', error);
      toast({
        title: "خطأ في حذف المجموعة",
        description: "حدث خطأ أثناء حذف مجموعة المركبات.",
        variant: "destructive",
      });
    },
  });
};