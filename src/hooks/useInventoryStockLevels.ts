import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface InventoryStockLevel {
  id: string;
  company_id: string;
  item_id: string;
  warehouse_id: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available: number;
  last_movement_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  item_name?: string;
  warehouse_name?: string;
}

export interface StockMovement {
  id: string;
  company_id: string;
  item_id: string;
  warehouse_id: string;
  movement_type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  movement_date: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export const useInventoryStockLevels = (warehouseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-stock-levels', user?.profile?.company_id, warehouseId],
    queryFn: async (): Promise<InventoryStockLevel[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('inventory_stock_levels')
        .select(`
          *,
          inventory_items!inner(item_name),
          inventory_warehouses!inner(warehouse_name)
        `)
        .eq('company_id', user.profile.company_id);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      query = query.order('last_movement_at', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stock levels:', error);
        throw error;
      }

      // Map joined data to flat structure
      const mapped = data?.map((item: any) => ({
        ...item,
        item_name: item.inventory_items?.item_name,
        warehouse_name: item.inventory_warehouses?.warehouse_name,
      })) || [];

      return mapped;
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useItemStockLevels = (itemId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['item-stock-levels', itemId],
    queryFn: async (): Promise<InventoryStockLevel[]> => {
      if (!user?.profile?.company_id || !itemId) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory_stock_levels')
        .select(`
          *,
          inventory_warehouses!inner(warehouse_name)
        `)
        .eq('item_id', itemId)
        .eq('company_id', user.profile.company_id)
        .order('warehouse_name', { ascending: true });

      if (error) {
        console.error('Error fetching item stock levels:', error);
        throw error;
      }

      const mapped = data?.map((item: any) => ({
        ...item,
        warehouse_name: item.inventory_warehouses?.warehouse_name,
      })) || [];

      return mapped;
    },
    enabled: !!user?.profile?.company_id && !!itemId,
  });
};

export const useStockMovements = (itemId?: string, warehouseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-stock-movements', user?.profile?.company_id, itemId, warehouseId],
    queryFn: async (): Promise<StockMovement[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('inventory_movements')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      query = query.order('movement_date', { ascending: false }).limit(100);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stock movements:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (movementData: Omit<StockMovement, 'id' | 'created_at' | 'company_id' | 'created_by'>) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
          ...movementData,
          company_id: user.profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating stock movement:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['item-stock-levels'] });
      toast({
        title: 'تم تسجيل الحركة',
        description: 'تم تسجيل حركة المخزون بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error creating stock movement:', error);
      toast({
        title: 'خطأ في تسجيل الحركة',
        description: 'حدث خطأ أثناء تسجيل حركة المخزون.',
        variant: 'destructive',
      });
    },
  });
};

export const useStockAdjustment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      itemId,
      warehouseId,
      newQuantity,
      notes,
    }: {
      itemId: string;
      warehouseId: string;
      newQuantity: number;
      notes?: string;
    }) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      // Get current stock level
      const { data: currentStock, error: stockError } = await supabase
        .from('inventory_stock_levels')
        .select('quantity_on_hand')
        .eq('item_id', itemId)
        .eq('warehouse_id', warehouseId)
        .single();

      if (stockError) {
        throw stockError;
      }

      const currentQty = currentStock?.quantity_on_hand || 0;
      const adjustmentQty = newQuantity - currentQty;

      // Create adjustment movement
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
          company_id: user.profile.company_id,
          item_id: itemId,
          warehouse_id: warehouseId,
          movement_type: 'ADJUSTMENT',
          quantity: adjustmentQty,
          movement_date: new Date().toISOString(),
          notes: notes || `Stock adjustment from ${currentQty} to ${newQuantity}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-movements'] });
      toast({
        title: 'تم تعديل الكمية',
        description: 'تم تعديل كمية المخزون بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error adjusting stock:', error);
      toast({
        title: 'خطأ في تعديل الكمية',
        description: 'حدث خطأ أثناء تعديل كمية المخزون.',
        variant: 'destructive',
      });
    },
  });
};

export const useStockTransfer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      itemId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      notes,
    }: {
      itemId: string;
      fromWarehouseId: string;
      toWarehouseId: string;
      quantity: number;
      notes?: string;
    }) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      // Create TRANSFER_OUT movement (trigger will auto-create TRANSFER_IN)
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
          company_id: user.profile.company_id,
          item_id: itemId,
          warehouse_id: fromWarehouseId,
          movement_type: 'TRANSFER_OUT',
          quantity: -quantity,
          reference_type: 'TRANSFER',
          reference_id: toWarehouseId,
          movement_date: new Date().toISOString(),
          notes: notes || `Transfer to warehouse ${toWarehouseId}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-movements'] });
      toast({
        title: 'تم نقل المخزون',
        description: 'تم نقل المخزون بين المستودعات بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Error transferring stock:', error);
      toast({
        title: 'خطأ في نقل المخزون',
        description: 'حدث خطأ أثناء نقل المخزون.',
        variant: 'destructive',
      });
    },
  });
};
