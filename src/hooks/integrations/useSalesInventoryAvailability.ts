import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

/**
 * Integration Hook: Sales → Inventory Availability
 * Queries the sales_inventory_availability view
 * Real-time stock availability for sales operations
 */

export interface SalesInventoryAvailability {
  item_id: string;
  company_id: string;
  item_name: string;
  item_name_ar: string;
  item_code: string;
  sku: string;
  barcode: string;
  unit_of_measure: string;
  unit_price: number;
  cost_price: number;
  category_id: string;
  category_name: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_name_ar: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available: number;
  last_movement_at: string | null;
  stock_status: 'available' | 'low_stock' | 'out_of_stock';
  min_stock_level: number;
  reorder_point: number;
}

export interface InventoryAvailabilityCheckParams {
  item_id: string;
  quantity_needed: number;
  warehouse_id?: string;
}

export interface InventoryAvailabilityResult {
  available: boolean;
  shortage: number;
  quantity_available: number;
  quantity_allocated: number;
  warehouses: Array<{
    warehouse_id: string;
    warehouse_name: string;
    quantity_available: number;
  }>;
}

type AvailabilityRow = Database['public']['Views']['sales_inventory_availability']['Row'];

const mapAvailability = (row: AvailabilityRow): SalesInventoryAvailability => ({
  item_id: row.item_id ?? '',
  company_id: row.company_id ?? '',
  item_name: row.item_name ?? '',
  item_name_ar: row.item_name_ar ?? '',
  item_code: row.item_code ?? '',
  sku: row.sku ?? '',
  barcode: row.barcode ?? '',
  unit_of_measure: row.unit_of_measure ?? '',
  unit_price: row.unit_price ?? 0,
  cost_price: row.cost_price ?? 0,
  category_id: row.category_id ?? '',
  category_name: row.category_name ?? '',
  warehouse_id: row.warehouse_id ?? '',
  warehouse_name: row.warehouse_name ?? '',
  warehouse_name_ar: row.warehouse_name_ar ?? '',
  quantity_on_hand: row.quantity_on_hand ?? 0,
  quantity_allocated: row.quantity_reserved ?? 0,
  quantity_available: row.quantity_available ?? 0,
  last_movement_at: row.last_movement_at,
  stock_status: row.stock_status === 'low_stock' || row.stock_status === 'out_of_stock'
    ? row.stock_status
    : 'available',
  min_stock_level: row.min_stock_level ?? 0,
  reorder_point: row.reorder_point ?? 0,
});

/**
 * Hook to fetch all sales inventory availability
 */
export const useSalesInventoryAvailability = (warehouseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-inventory-availability', user?.profile?.company_id, warehouseId],
    queryFn: async (): Promise<SalesInventoryAvailability[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        let query = supabase
          .from('sales_inventory_availability')
          .select('*')
          .eq('company_id', user.profile.company_id);

        if (warehouseId) {
          query = query.eq('warehouse_id', warehouseId);
        }

        const { data, error } = await query.order('item_name');

        if (error) throw error;

        return (data || []).map(mapAvailability);
      } catch (error) {
        console.error('Error fetching sales inventory availability:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to check inventory availability for a specific item and quantity
 */
export const useInventoryAvailabilityCheck = (params: InventoryAvailabilityCheckParams) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'inventory-availability-check',
      params.item_id,
      params.quantity_needed,
      params.warehouse_id,
      user?.profile?.company_id,
    ],
    queryFn: async (): Promise<InventoryAvailabilityResult> => {
      if (!user?.profile?.company_id) {
        return {
          available: false,
          shortage: params.quantity_needed,
          quantity_available: 0,
          quantity_allocated: 0,
          warehouses: [],
        };
      }

      try {
        let query = supabase
          .from('sales_inventory_availability')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .eq('item_id', params.item_id);

        if (params.warehouse_id) {
          query = query.eq('warehouse_id', params.warehouse_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        const inventoryData = (data || []).map(mapAvailability);

        // Calculate totals
        const totalAvailable = inventoryData.reduce(
          (sum, item) => sum + item.quantity_available,
          0
        );
        const totalAllocated = inventoryData.reduce(
          (sum, item) => sum + item.quantity_allocated,
          0
        );

        const available = totalAvailable >= params.quantity_needed;
        const shortage = available ? 0 : params.quantity_needed - totalAvailable;

        const warehouses = inventoryData.map((item) => ({
          warehouse_id: item.warehouse_id,
          warehouse_name: item.warehouse_name,
          quantity_available: item.quantity_available,
        }));

        return {
          available,
          shortage,
          quantity_available: totalAvailable,
          quantity_allocated: totalAllocated,
          warehouses,
        };
      } catch (error) {
        console.error('Error checking inventory availability:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id && !!params.item_id,
  });
};

/**
 * Hook to fetch available items (in stock)
 */
export const useAvailableItems = (warehouseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-items', user?.profile?.company_id, warehouseId],
    queryFn: async (): Promise<SalesInventoryAvailability[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        let query = supabase
          .from('sales_inventory_availability')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .eq('stock_status', 'available');

        if (warehouseId) {
          query = query.eq('warehouse_id', warehouseId);
        }

        const { data, error } = await query.order('item_name');

        if (error) throw error;

        return (data || []).map(mapAvailability);
      } catch (error) {
        console.error('Error fetching available items:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to fetch low stock items
 */
export const useLowStockItems = (warehouseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['low-stock-items', user?.profile?.company_id, warehouseId],
    queryFn: async (): Promise<SalesInventoryAvailability[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        let query = supabase
          .from('sales_inventory_availability')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .eq('stock_status', 'low_stock');

        if (warehouseId) {
          query = query.eq('warehouse_id', warehouseId);
        }

        const { data, error } = await query.order('item_name');

        if (error) throw error;

        return (data || []).map(mapAvailability);
      } catch (error) {
        console.error('Error fetching low stock items:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to fetch out of stock items
 */
export const useOutOfStockItems = (warehouseId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['out-of-stock-items', user?.profile?.company_id, warehouseId],
    queryFn: async (): Promise<SalesInventoryAvailability[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        let query = supabase
          .from('sales_inventory_availability')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .eq('stock_status', 'out_of_stock');

        if (warehouseId) {
          query = query.eq('warehouse_id', warehouseId);
        }

        const { data, error } = await query.order('item_name');

        if (error) throw error;

        return (data || []).map(mapAvailability);
      } catch (error) {
        console.error('Error fetching out of stock items:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};
