import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  company_id: string;
  item_name: string;
  item_name_ar?: string;
  item_code?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  description?: string;
  unit_of_measure: string;
  unit_price: number;
  cost_price: number;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  is_active: boolean;
  is_tracked: boolean;
  item_type: string;
  image_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemFilters {
  category_id?: string;
  is_active?: boolean;
  is_tracked?: boolean;
  item_type?: string;
  search?: string;
}

export const useInventoryItems = (filters?: InventoryItemFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-items', user?.profile?.company_id, filters],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.is_tracked !== undefined) {
        query = query.eq('is_tracked', filters.is_tracked);
      }

      if (filters?.item_type) {
        query = query.eq('item_type', filters.item_type);
      }

      if (filters?.search) {
        query = query.or(`item_name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.eq.${filters.search}`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching inventory items:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useInventoryItem = (itemId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-item', itemId],
    queryFn: async (): Promise<InventoryItem | null> => {
      if (!user?.profile?.company_id || !itemId) {
        return null;
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId)
        .eq('company_id', user.profile.company_id)
        .single();

      if (error) {
        console.error('Error fetching inventory item:', error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.profile?.company_id && !!itemId,
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          ...itemData,
          company_id: user.profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating inventory item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'تم إضافة الصنف',
        description: 'تم إضافة الصنف إلى المخزون بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating inventory item:', error);
      toast({
        title: 'خطأ في إضافة الصنف',
        description: 'حدث خطأ أثناء إضافة الصنف إلى المخزون.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryItem> }) => {
      const { data: result, error } = await supabase
        .from('inventory_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating inventory item:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-item'] });
      toast({
        title: 'تم تحديث الصنف',
        description: 'تم تحديث بيانات الصنف بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error updating inventory item:', error);
      toast({
        title: 'خطأ في تحديث الصنف',
        description: 'حدث خطأ أثناء تحديث بيانات الصنف.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (itemId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting inventory item:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'تم حذف الصنف',
        description: 'تم حذف الصنف من المخزون بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error deleting inventory item:', error);
      toast({
        title: 'خطأ في حذف الصنف',
        description: 'حدث خطأ أثناء حذف الصنف من المخزون.',
        variant: 'destructive',
      });
    },
  });
};

// Hook for low stock items
export const useLowStockItems = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-low-stock', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory_low_stock_items')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('shortage', { ascending: false });

      if (error) {
        console.error('Error fetching low stock items:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};
