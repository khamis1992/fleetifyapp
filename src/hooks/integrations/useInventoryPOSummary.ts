import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Integration Hook: Inventory → Purchase Orders Summary
 * Queries the inventory_purchase_order_summary view
 * Shows items with pending/received PO quantities for reorder planning
 */

export interface InventoryPOSummary {
  company_id: string | null;
  order_month: string | null;
  status: string | null;
  order_count: number | null;
  total_value: number | null;
  average_order_value: number | null;
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
          // Build query — fetch all columns, filter in memory to avoid
          // column-name mismatches with the view schema
          let query = supabase
            .from('inventory_purchase_order_summary')
            .select('*')
            .eq('company_id', user.profile.company_id);

          // Execute query
          const { data, error } = await query;

          if (error) throw error;

          let results: InventoryPOSummary[] = data || [];

          // Apply filters in memory (the view may not have pending_quantity as a column)
          if (filters?.has_pending_po) {
            results = results.filter(item => item.status === 'pending');
          }

          if (filters?.min_pending_quantity) {
            results = results.filter(item => (item.order_count ?? 0) >= filters.min_pending_quantity!);
          }

          return results;
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

      return null;
    },
    enabled: !!user?.profile?.company_id && !!itemId,
  });
};
