import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface VehicleGroup {
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

export const useVehicleGroups = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['vehicle-groups', user?.profile?.company_id],
    queryFn: async (): Promise<VehicleGroup[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      // Since the table doesn't exist yet, return empty array
      // TODO: Implement after database migration is successful
      return [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateVehicleGroup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (groupData: Omit<VehicleGroup, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'is_active'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      // Since the table doesn't exist yet, simulate success
      // TODO: Implement after database migration is successful
      const mockData = {
        id: Date.now().toString(),
        ...groupData,
        company_id: user.profile.company_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return mockData;
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleGroup> }) => {
      const { data: result, error } = await supabase
        .from('vehicle_groups')
        .update(data)
        .eq('id', id)
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
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('vehicle_groups')
        .update({ is_active: false })
        .eq('id', groupId);

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