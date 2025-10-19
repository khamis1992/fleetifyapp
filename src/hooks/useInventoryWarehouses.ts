import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InventoryWarehouse {
  id: string;
  company_id: string;
  warehouse_name: string;
  warehouse_name_ar?: string;
  warehouse_code?: string;
  location_address?: string;
  city?: string;
  country?: string;
  manager_id?: string;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useInventoryWarehouses = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-warehouses', user?.profile?.company_id],
    queryFn: async (): Promise<InventoryWarehouse[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory_warehouses')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching warehouses:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useInventoryWarehouse = (warehouseId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-warehouse', warehouseId],
    queryFn: async (): Promise<InventoryWarehouse | null> => {
      if (!user?.profile?.company_id || !warehouseId) {
        return null;
      }

      const { data, error } = await supabase
        .from('inventory_warehouses')
        .select('*')
        .eq('id', warehouseId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching warehouse:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.profile?.company_id && !!warehouseId,
  });
};

export const useCreateInventoryWarehouse = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (warehouseData: Omit<InventoryWarehouse, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('inventory_warehouses')
        .insert({
          ...warehouseData,
          company_id: user.profile.company_id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating warehouse:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-warehouses'] });
      toast({
        title: 'تم إضافة المستودع',
        description: 'تم إنشاء المستودع بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating warehouse:', error);
      toast({
        title: 'خطأ في إضافة المستودع',
        description: 'حدث خطأ أثناء إنشاء المستودع.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateInventoryWarehouse = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryWarehouse> }) => {
      const { data: result, error } = await supabase
        .from('inventory_warehouses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating warehouse:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-warehouse'] });
      toast({
        title: 'تم تحديث المستودع',
        description: 'تم تحديث بيانات المستودع بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating warehouse:', error);
      toast({
        title: 'خطأ في تحديث المستودع',
        description: 'حدث خطأ أثناء تحديث بيانات المستودع.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteInventoryWarehouse = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (warehouseId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('inventory_warehouses')
        .update({ is_active: false })
        .eq('id', warehouseId);

      if (error) {
        console.error('Error deleting warehouse:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-warehouses'] });
      toast({
        title: 'تم حذف المستودع',
        description: 'تم حذف المستودع بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error deleting warehouse:', error);
      toast({
        title: 'خطأ في حذف المستودع',
        description: 'حدث خطأ أثناء حذف المستودع.',
        variant: 'destructive',
      });
    },
  });
};
