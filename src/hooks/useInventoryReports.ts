import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Types for inventory reports
 */

export interface InventoryValuationData {
  warehouse_id: string;
  warehouse_name: string;
  category_id: string | null;
  category_name: string;
  total_items: number;
  total_quantity: number;
  total_cost_value: number;
  total_selling_value: number;
  potential_profit: number;
}

export interface InventoryAgingData {
  item_id: string;
  company_id: string;
  item_name: string;
  item_code: string | null;
  sku: string | null;
  category_name: string | null;
  warehouse_id: string;
  warehouse_name: string;
  quantity_on_hand: number;
  quantity_available: number;
  last_movement_at: string | null;
  days_since_last_movement: number;
  aging_category: string;
  tied_up_value: number;
}

export interface InventoryTurnoverData {
  item_id: string;
  company_id: string;
  item_name: string;
  item_code: string | null;
  sku: string | null;
  category_name: string | null;
  warehouse_id: string;
  warehouse_name: string;
  current_stock: number;
  quantity_available: number;
  movements_last_90_days: number;
  sales_quantity_last_90_days: number;
  purchase_quantity_last_90_days: number;
  turnover_ratio: number;
  turnover_category: string;
  first_movement_date: string | null;
  last_movement_date: string | null;
}

export interface StockAlertData {
  item_id: string;
  company_id: string;
  item_name: string;
  item_code: string | null;
  sku: string | null;
  category_name: string | null;
  warehouse_id: string;
  warehouse_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  min_stock_level: number;
  max_stock_level: number | null;
  reorder_point: number | null;
  reorder_quantity: number | null;
  alert_type: string;
  alert_priority: number;
  shortage_quantity: number;
  suggested_order_quantity: number;
  last_movement_at: string | null;
}

/**
 * Hook for inventory valuation report
 * Uses the stored procedure to calculate valuation by warehouse and category
 */
export const useInventoryValuationReport = (
  warehouseId?: string,
  categoryId?: string
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-valuation-report', user?.profile?.company_id, warehouseId, categoryId],
    queryFn: async (): Promise<InventoryValuationData[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase.rpc('calculate_inventory_valuation', {
        p_company_id: user.profile.company_id,
        p_warehouse_id: warehouseId || null,
        p_category_id: categoryId || null,
      });

      if (error) {
        console.error('Error fetching inventory valuation report:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook for inventory aging report
 * Shows items by days since last movement
 */
export const useInventoryAgingReport = (warehouseId?: string, categoryId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-aging-report', user?.profile?.company_id, warehouseId, categoryId],
    queryFn: async (): Promise<InventoryAgingData[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('inventory_aging_analysis')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      if (categoryId) {
        query = query.eq('category_name', categoryId);
      }

      query = query.order('days_since_last_movement', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching inventory aging report:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook for inventory turnover report
 * Analyzes movement frequency and turnover rates
 */
export const useInventoryTurnoverReport = (warehouseId?: string, categoryId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-turnover-report', user?.profile?.company_id, warehouseId, categoryId],
    queryFn: async (): Promise<InventoryTurnoverData[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('inventory_turnover_analysis')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      if (categoryId) {
        query = query.eq('category_name', categoryId);
      }

      query = query.order('turnover_ratio', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching inventory turnover report:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook for stock level alerts
 * Shows all items with low stock, out of stock, or overstock conditions
 */
export const useStockLevelAlerts = (warehouseId?: string, categoryId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-stock-alerts', user?.profile?.company_id, warehouseId, categoryId],
    queryFn: async (): Promise<StockAlertData[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      let query = supabase
        .from('inventory_stock_alerts')
        .select('*')
        .eq('company_id', user.profile.company_id);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      if (categoryId) {
        query = query.eq('category_name', categoryId);
      }

      query = query.order('alert_priority', { ascending: true })
        .order('shortage_quantity', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stock level alerts:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to get aggregated valuation summary
 */
export const useInventoryValuationSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-valuation-summary', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return null;
      }

      const { data, error } = await supabase.rpc('calculate_inventory_valuation', {
        p_company_id: user.profile.company_id,
        p_warehouse_id: null,
        p_category_id: null,
      });

      if (error) {
        console.error('Error fetching inventory valuation summary:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          total_items: 0,
          total_quantity: 0,
          total_cost_value: 0,
          total_selling_value: 0,
          potential_profit: 0,
          profit_margin: 0,
        };
      }

      const summary = data.reduce(
        (acc, row) => ({
          total_items: acc.total_items + (row.total_items || 0),
          total_quantity: acc.total_quantity + (row.total_quantity || 0),
          total_cost_value: acc.total_cost_value + (row.total_cost_value || 0),
          total_selling_value: acc.total_selling_value + (row.total_selling_value || 0),
          potential_profit: acc.potential_profit + (row.potential_profit || 0),
          profit_margin: 0,
        }),
        {
          total_items: 0,
          total_quantity: 0,
          total_cost_value: 0,
          total_selling_value: 0,
          potential_profit: 0,
          profit_margin: 0,
        }
      );

      summary.profit_margin =
        summary.total_selling_value > 0
          ? (summary.potential_profit / summary.total_selling_value) * 100
          : 0;

      return summary;
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to get aging summary by category
 */
export const useInventoryAgingSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-aging-summary', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory_aging_analysis')
        .select('aging_category, tied_up_value')
        .eq('company_id', user.profile.company_id);

      if (error) {
        console.error('Error fetching inventory aging summary:', error);
        throw error;
      }

      const summary = (data || []).reduce((acc: Record<string, number>, row) => {
        const category = row.aging_category || 'غير محدد';
        acc[category] = (acc[category] || 0) + (row.tied_up_value || 0);
        return acc;
      }, {});

      return Object.entries(summary).map(([category, value]) => ({
        category,
        tied_up_value: value,
      }));
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to get turnover summary by category
 */
export const useInventoryTurnoverSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-turnover-summary', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory_turnover_analysis')
        .select('turnover_category, current_stock')
        .eq('company_id', user.profile.company_id);

      if (error) {
        console.error('Error fetching inventory turnover summary:', error);
        throw error;
      }

      const summary = (data || []).reduce((acc: Record<string, number>, row) => {
        const category = row.turnover_category || 'غير محدد';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(summary).map(([category, count]) => ({
        category,
        item_count: count,
      }));
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to get alert summary by type
 */
export const useStockAlertSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-alert-summary', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory_stock_alerts')
        .select('alert_type, alert_priority')
        .eq('company_id', user.profile.company_id);

      if (error) {
        console.error('Error fetching stock alert summary:', error);
        throw error;
      }

      const summary = (data || []).reduce((acc: Record<string, number>, row) => {
        const type = row.alert_type || 'غير محدد';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(summary).map(([alert_type, count]) => ({
        alert_type,
        count,
      }));
    },
    enabled: !!user?.profile?.company_id,
  });
};
