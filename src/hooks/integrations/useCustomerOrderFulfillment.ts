import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Integration Hook: Customer Order Fulfillment Status
 * Queries the sales_order_fulfillment_status view
 * Track order status across modules
 */

export interface CustomerOrderFulfillment {
  order_id: string;
  company_id: string;
  order_number: string;
  order_date: string;
  delivery_date: string | null;
  status: string;
  customer_id: string;
  order_total: number;
  notes: string;
  total_items: number;
  fulfillment_status: 'fulfilled' | 'pending' | 'cancelled';
}

export interface OrderFulfillmentFilters {
  fulfillment_status?: 'fulfilled' | 'pending' | 'cancelled';
  customer_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface FulfillmentSummary {
  total_orders: number;
  fulfilled_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  fulfillment_rate: number;
  total_value: number;
}

/**
 * Hook to fetch customer order fulfillment status
 */
export const useCustomerOrderFulfillment = (filters?: OrderFulfillmentFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-order-fulfillment', user?.profile?.company_id, filters],
    queryFn: async (): Promise<CustomerOrderFulfillment[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        let query = supabase
          .from('sales_order_fulfillment_status')
          .select('*')
          .eq('company_id', user.profile.company_id);

        // Apply filters
        if (filters?.fulfillment_status) {
          query = query.eq('fulfillment_status', filters.fulfillment_status);
        }

        if (filters?.customer_id) {
          query = query.eq('customer_id', filters.customer_id);
        }

        if (filters?.date_from) {
          query = query.gte('order_date', filters.date_from);
        }

        if (filters?.date_to) {
          query = query.lte('order_date', filters.date_to);
        }

        const { data, error } = await query.order('order_date', { ascending: false });

        if (error) throw error;

        return (data || []) as CustomerOrderFulfillment[];
      } catch (error) {
        console.error('Error fetching customer order fulfillment:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to fetch pending orders
 */
export const usePendingOrders = () => {
  return useCustomerOrderFulfillment({ fulfillment_status: 'pending' });
};

/**
 * Hook to fetch fulfilled orders
 */
export const useFulfilledOrders = () => {
  return useCustomerOrderFulfillment({ fulfillment_status: 'fulfilled' });
};

/**
 * Hook to fetch cancelled orders
 */
export const useCancelledOrders = () => {
  return useCustomerOrderFulfillment({ fulfillment_status: 'cancelled' });
};

/**
 * Hook to fetch orders for a specific customer
 */
export const useCustomerOrders = (customerId: string) => {
  return useCustomerOrderFulfillment({ customer_id: customerId });
};

/**
 * Hook to fetch fulfillment summary statistics
 */
export const useFulfillmentSummary = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fulfillment-summary', user?.profile?.company_id],
    queryFn: async (): Promise<FulfillmentSummary> => {
      if (!user?.profile?.company_id) {
        return {
          total_orders: 0,
          fulfilled_orders: 0,
          pending_orders: 0,
          cancelled_orders: 0,
          fulfillment_rate: 0,
          total_value: 0,
        };
      }

      try {
        const { data, error } = await supabase
          .from('sales_order_fulfillment_status')
          .select('*')
          .eq('company_id', user.profile.company_id);

        if (error) throw error;

        const orders = (data || []) as CustomerOrderFulfillment[];

        const total_orders = orders.length;
        const fulfilled_orders = orders.filter((o) => o.fulfillment_status === 'fulfilled').length;
        const pending_orders = orders.filter((o) => o.fulfillment_status === 'pending').length;
        const cancelled_orders = orders.filter((o) => o.fulfillment_status === 'cancelled').length;
        const fulfillment_rate = total_orders > 0 ? (fulfilled_orders / total_orders) * 100 : 0;
        const total_value = orders.reduce((sum, order) => sum + order.order_total, 0);

        return {
          total_orders,
          fulfilled_orders,
          pending_orders,
          cancelled_orders,
          fulfillment_rate,
          total_value,
        };
      } catch (error) {
        console.error('Error fetching fulfillment summary:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to fetch delayed orders (past delivery date but not fulfilled)
 */
export const useDelayedOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['delayed-orders', user?.profile?.company_id],
    queryFn: async (): Promise<CustomerOrderFulfillment[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('sales_order_fulfillment_status')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .eq('fulfillment_status', 'pending')
          .not('delivery_date', 'is', null)
          .lt('delivery_date', today)
          .order('delivery_date', { ascending: true });

        if (error) throw error;

        return (data || []) as CustomerOrderFulfillment[];
      } catch (error) {
        console.error('Error fetching delayed orders:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};
