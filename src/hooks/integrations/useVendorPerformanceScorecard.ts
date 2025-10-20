import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Integration Hook: Vendor Performance Scorecard
 * Queries the vendor_purchase_performance view
 * Vendor performance metrics aggregated from purchase orders
 */

export interface VendorPerformanceScorecard {
  vendor_id: string;
  company_id: string;
  vendor_name: string;
  vendor_name_ar: string;
  vendor_code: string;
  contact_person: string;
  email: string;
  phone: string;
  total_orders: number;
  total_purchase_value: number;
  avg_order_value: number;
  completed_orders: number;
  cancelled_orders: number;
  on_time_deliveries: number;
  total_deliveries: number;
  on_time_delivery_rate: number;
  avg_delivery_days: number;
  first_order_date: string;
  last_order_date: string;
  is_active_vendor: boolean;
}

export interface VendorPerformanceFilters {
  is_active_only?: boolean;
  min_orders?: number;
  min_on_time_rate?: number;
}

/**
 * Hook to fetch vendor performance scorecard
 */
export const useVendorPerformanceScorecard = (filters?: VendorPerformanceFilters) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendor-performance-scorecard', user?.profile?.company_id, filters],
    queryFn: async (): Promise<VendorPerformanceScorecard[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        let query = supabase
          .from('vendor_purchase_performance')
          .select('*')
          .eq('company_id', user.profile.company_id);

        // Apply filters
        if (filters?.is_active_only) {
          query = query.eq('is_active_vendor', true);
        }

        if (filters?.min_orders) {
          query = query.gte('total_orders', filters.min_orders);
        }

        if (filters?.min_on_time_rate) {
          query = query.gte('on_time_delivery_rate', filters.min_on_time_rate);
        }

        const { data, error } = await query.order('total_purchase_value', { ascending: false });

        if (error) throw error;

        return (data || []) as VendorPerformanceScorecard[];
      } catch (error) {
        console.error('Error fetching vendor performance scorecard:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to fetch top vendors by performance
 */
export const useTopVendorsByPerformance = (limit: number = 5) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['top-vendors-by-performance', user?.profile?.company_id, limit],
    queryFn: async (): Promise<VendorPerformanceScorecard[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('vendor_purchase_performance')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .gte('total_orders', 1) // At least 1 order
          .order('on_time_delivery_rate', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return (data || []) as VendorPerformanceScorecard[];
      } catch (error) {
        console.error('Error fetching top vendors:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};

/**
 * Hook to fetch a single vendor's performance metrics
 */
export const useVendorPerformanceMetrics = (vendorId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendor-performance-metrics', vendorId, user?.profile?.company_id],
    queryFn: async (): Promise<VendorPerformanceScorecard | null> => {
      if (!user?.profile?.company_id || !vendorId) {
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('vendor_purchase_performance')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .eq('vendor_id', vendorId)
          .single();

        if (error) throw error;

        return data as VendorPerformanceScorecard;
      } catch (error) {
        console.error('Error fetching vendor performance metrics:', error);
        return null;
      }
    },
    enabled: !!user?.profile?.company_id && !!vendorId,
  });
};

/**
 * Hook to fetch active vendors (ordered in last 6 months)
 */
export const useActiveVendors = () => {
  return useVendorPerformanceScorecard({ is_active_only: true });
};

/**
 * Hook to fetch vendors by purchase value
 */
export const useVendorsByPurchaseValue = (limit?: number) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendors-by-purchase-value', user?.profile?.company_id, limit],
    queryFn: async (): Promise<VendorPerformanceScorecard[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        let query = supabase
          .from('vendor_purchase_performance')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .order('total_purchase_value', { ascending: false });

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []) as VendorPerformanceScorecard[];
      } catch (error) {
        console.error('Error fetching vendors by purchase value:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};
