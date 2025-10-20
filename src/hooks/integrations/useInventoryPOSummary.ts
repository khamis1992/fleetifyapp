import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Integration Hook: Inventory → Purchase Orders Summary
 * Queries the inventory_purchase_order_summary view
 * Shows items with pending/received PO quantities for reorder planning
 */

export interface InventoryPOSummary {
  item_id: string;
  item_name: string;
  item_name_ar: string;
  item_code: string;
  sku: string;
  unit_of_measure: string;
  cost_price: number;
  unit_price: number;
  min_stock_level: number;
  reorder_point: number;
  reorder_quantity: number;
  po_status: string;
  total_pos: number;
  total_ordered_quantity: number;
  total_received_quantity: number;
  pending_quantity: number;
  total_po_value: number;
  last_po_date: string | null;
  next_expected_delivery: string | null;
}

export interface InventoryPOSummaryFilters {
  warehouse_id?: string;
  category_id?: string;
  has_pending_po?: boolean;
  min_pending_quantity?: number;
}

/**
 * Hook to fetch inventory items with their PO summary
 * @param filters Optional filters for warehouse, category, etc.
 */
export const useInventoryPOSummary = (filters?: InventoryPOSummaryFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-po-summary', user?.profile?.company_id, filters],
    queryFn: async (): Promise<InventoryPOSummary[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        // Build query
        let query = supabase
          .from('inventory_purchase_order_summary')
          .select('*');

        // Apply filters
        if (filters?.has_pending_po) {
          query = query.gt('pending_quantity', 0);
        }

        if (filters?.min_pending_quantity) {
          query = query.gte('pending_quantity', filters.min_pending_quantity);
        }

        // Execute query
        const { data, error } = await query;

        if (error) throw error;

        return (data || []) as InventoryPOSummary[];
      } catch (error) {
        console.error('Error fetching inventory PO summary:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to fetch items with pending POs
 */
export const useItemsWithPendingPOs = () => {
  return useInventoryPOSummary({ has_pending_po: true });
};

/**
 * Hook to fetch a single item's PO summary
 */
export const useItemPOSummary = (itemId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-po-summary', 'item', itemId, user?.profile?.company_id],
    queryFn: async (): Promise<InventoryPOSummary | null> => {
      if (!user?.profile?.company_id || !itemId) {
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('inventory_purchase_order_summary')
          .select('*')
          .eq('item_id', itemId)
          .single();

        if (error) throw error;

        return data as InventoryPOSummary;
      } catch (error) {
        console.error('Error fetching item PO summary:', error);
        return null;
      }
    },
    enabled: !!user?.profile?.company_id && !!itemId,
  });
};
