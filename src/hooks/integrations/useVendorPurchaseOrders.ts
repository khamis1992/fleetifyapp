import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PurchaseOrder } from '../usePurchaseOrders';

/**
 * Integration Hook: Vendors <-> Purchase Orders
 * Enables: Vendor purchase history, performance tracking, preferred vendor selection
 */

// ============================================================================
// Types
// ============================================================================

export interface VendorPurchaseHistory {
  po_id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date?: string;
  delivery_date?: string;
  status: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  items_count: number;
  is_on_time: boolean;
  delivery_days?: number;
}

export interface VendorPerformanceMetrics {
  vendor_id: string;
  vendor_name: string;
  vendor_name_ar?: string;
  total_orders: number;
  total_amount: number;
  on_time_delivery_count: number;
  late_delivery_count: number;
  on_time_delivery_rate: number;
  avg_delivery_days: number;
  quality_score: number;
  last_order_date?: string;
}

export interface UpdateVendorPerformanceData {
  po_id: string;
  delivered_on_time: boolean;
  quality_rating: number; // 1-5 stars
  notes?: string;
}

// ============================================================================
// Get all POs for a vendor
// ============================================================================

export const useVendorPurchaseHistory = (vendorId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendor-purchase-history', vendorId, user?.profile?.company_id],
    queryFn: async (): Promise<VendorPurchaseHistory[]> => {
      if (!user?.profile?.company_id || !vendorId) {
        return [];
      }

      try {
        // Query purchase orders with items
        const { data, error } = await supabase
          .from('purchase_orders')
          .select(`
            id,
            order_number,
            order_date,
            expected_delivery_date,
            delivery_date,
            status,
            subtotal,
            total_amount,
            currency,
            purchase_order_items(id)
          `)
          .eq('vendor_id', vendorId)
          .eq('company_id', user.profile.company_id)
          .order('order_date', { ascending: false });

        if (error) throw error;

        // Transform data and calculate metrics
        const history: VendorPurchaseHistory[] = (data || []).map((po: any) => {
          const isOnTime = po.delivery_date && po.expected_delivery_date
            ? new Date(po.delivery_date) <= new Date(po.expected_delivery_date)
            : true;

          const deliveryDays = po.delivery_date && po.order_date
            ? Math.ceil((new Date(po.delivery_date).getTime() - new Date(po.order_date).getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

          return {
            po_id: po.id,
            order_number: po.order_number,
            order_date: po.order_date,
            expected_delivery_date: po.expected_delivery_date,
            delivery_date: po.delivery_date,
            status: po.status,
            subtotal: po.subtotal,
            total_amount: po.total_amount,
            currency: po.currency,
            items_count: po.purchase_order_items?.length || 0,
            is_on_time: isOnTime,
            delivery_days: deliveryDays,
          };
        });

        return history;
      } catch (error) {
        console.error('Error fetching vendor purchase history:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id && !!vendorId,
  });
};

// ============================================================================
// Get vendor performance metrics
// ============================================================================

export const useVendorPerformanceMetrics = (vendorId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendor-performance-metrics', vendorId, user?.profile?.company_id],
    queryFn: async (): Promise<VendorPerformanceMetrics | null> => {
      if (!user?.profile?.company_id || !vendorId) {
        return null;
      }

      try {
        // Get vendor details
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('vendor_name, vendor_name_ar')
          .eq('id', vendorId)
          .single();

        if (vendorError) throw vendorError;

        // Get all purchase orders for this vendor
        const { data: orders, error: ordersError } = await supabase
          .from('purchase_orders')
          .select('*')
          .eq('vendor_id', vendorId)
          .eq('company_id', user.profile.company_id);

        if (ordersError) throw ordersError;

        if (!orders || orders.length === 0) {
          return {
            vendor_id: vendorId,
            vendor_name: vendor.vendor_name,
            vendor_name_ar: vendor.vendor_name_ar,
            total_orders: 0,
            total_amount: 0,
            on_time_delivery_count: 0,
            late_delivery_count: 0,
            on_time_delivery_rate: 0,
            avg_delivery_days: 0,
            quality_score: 0,
          };
        }

        // Calculate metrics
        let totalAmount = 0;
        let onTimeCount = 0;
        let lateCount = 0;
        let totalDeliveryDays = 0;
        let deliveredOrdersCount = 0;

        orders.forEach((po) => {
          totalAmount += po.total_amount || 0;

          if (po.delivery_date && po.expected_delivery_date) {
            deliveredOrdersCount++;
            const deliveryDate = new Date(po.delivery_date);
            const expectedDate = new Date(po.expected_delivery_date);
            const orderDate = new Date(po.order_date);

            const deliveryDays = Math.ceil(
              (deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            totalDeliveryDays += deliveryDays;

            if (deliveryDate <= expectedDate) {
              onTimeCount++;
            } else {
              lateCount++;
            }
          }
        });

        const onTimeRate = deliveredOrdersCount > 0
          ? (onTimeCount / deliveredOrdersCount) * 100
          : 0;

        const avgDeliveryDays = deliveredOrdersCount > 0
          ? totalDeliveryDays / deliveredOrdersCount
          : 0;

        // Quality score based on on-time delivery rate (simplified)
        const qualityScore = (onTimeRate / 100) * 5;

        // Get last order date
        const lastOrder = orders.sort((a, b) =>
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        )[0];

        return {
          vendor_id: vendorId,
          vendor_name: vendor.vendor_name,
          vendor_name_ar: vendor.vendor_name_ar,
          total_orders: orders.length,
          total_amount: totalAmount,
          on_time_delivery_count: onTimeCount,
          late_delivery_count: lateCount,
          on_time_delivery_rate: onTimeRate,
          avg_delivery_days: avgDeliveryDays,
          quality_score: qualityScore,
          last_order_date: lastOrder?.order_date,
        };
      } catch (error) {
        console.error('Error fetching vendor performance:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id && !!vendorId,
  });
};

// ============================================================================
// Update vendor performance from PO delivery
// ============================================================================

export const useUpdateVendorPerformanceFromPO = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateVendorPerformanceData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      try {
        // Get PO details
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .select('vendor_id')
          .eq('id', data.po_id)
          .eq('company_id', user.profile.company_id)
          .single();

        if (poError) throw poError;

        // Check if vendor_performance table exists, if not, just update vendor record
        const { error: perfError } = await supabase
          .from('vendor_performance')
          .insert({
            company_id: user.profile.company_id,
            vendor_id: po.vendor_id,
            purchase_order_id: data.po_id,
            delivered_on_time: data.delivered_on_time,
            quality_rating: data.quality_rating,
            performance_date: new Date().toISOString(),
            notes: data.notes,
            created_by: user.id,
          });

        // If vendor_performance table doesn't exist, update vendor directly
        if (perfError && perfError.code === '42P01') {
          // Table doesn't exist, update vendor record instead
          const metrics = await queryClient.fetchQuery({
            queryKey: ['vendor-performance-metrics', po.vendor_id, user.profile.company_id],
          });

          if (metrics) {
            const { error: vendorError } = await supabase
              .from('vendors')
              .update({
                on_time_delivery_rate: (metrics as VendorPerformanceMetrics).on_time_delivery_rate,
                quality_score: data.quality_rating,
              })
              .eq('id', po.vendor_id);

            if (vendorError) throw vendorError;
          }
        } else if (perfError) {
          throw perfError;
        }

        return { vendor_id: po.vendor_id };
      } catch (error) {
        console.error('Error updating vendor performance:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-performance-metrics', result.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-purchase-history'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('تم تحديث أداء المورد بنجاح');
    },
    onError: (error) => {
      console.error('Vendor performance update error:', error);
      toast.error('خطأ في تحديث أداء المورد');
    },
  });
};

// ============================================================================
// Find preferred vendor for item (cross-reference with purchase history)
// ============================================================================

export const usePreferredVendorsForItem = (itemCode: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['preferred-vendors-for-item', itemCode, user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id || !itemCode) {
        return [];
      }

      try {
        // Query all POs that contain this item
        const { data: poItems, error } = await supabase
          .from('purchase_order_items')
          .select(`
            unit_price,
            quantity,
            received_quantity,
            purchase_order:purchase_orders!inner(
              vendor_id,
              order_date,
              delivery_date,
              expected_delivery_date,
              status,
              vendor:vendors(
                id,
                vendor_name,
                vendor_name_ar,
                contact_person,
                email,
                phone
              )
            )
          `)
          .eq('item_code', itemCode)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!poItems || poItems.length === 0) {
          return [];
        }

        // Group by vendor and rank
        const vendorStats = new Map<string, {
          vendor_id: string;
          vendor_name: string;
          vendor_name_ar?: string;
          contact_person?: string;
          email?: string;
          phone?: string;
          total_orders: number;
          avg_price: number;
          total_price: number;
          on_time_deliveries: number;
          total_deliveries: number;
          last_order_date: string;
        }>();

        poItems.forEach((item: any) => {
          const po = item.purchase_order;
          const vendor = po.vendor;
          const vendorId = vendor.id;

          if (!vendorStats.has(vendorId)) {
            vendorStats.set(vendorId, {
              vendor_id: vendorId,
              vendor_name: vendor.vendor_name,
              vendor_name_ar: vendor.vendor_name_ar,
              contact_person: vendor.contact_person,
              email: vendor.email,
              phone: vendor.phone,
              total_orders: 0,
              avg_price: 0,
              total_price: 0,
              on_time_deliveries: 0,
              total_deliveries: 0,
              last_order_date: po.order_date,
            });
          }

          const stats = vendorStats.get(vendorId)!;
          stats.total_orders++;
          stats.total_price += item.unit_price;

          if (po.delivery_date && po.expected_delivery_date) {
            stats.total_deliveries++;
            if (new Date(po.delivery_date) <= new Date(po.expected_delivery_date)) {
              stats.on_time_deliveries++;
            }
          }

          // Update last order date
          if (new Date(po.order_date) > new Date(stats.last_order_date)) {
            stats.last_order_date = po.order_date;
          }
        });

        // Calculate averages and rank
        const rankedVendors = Array.from(vendorStats.values()).map((stats) => {
          const avgPrice = stats.total_price / stats.total_orders;
          const onTimeRate = stats.total_deliveries > 0
            ? (stats.on_time_deliveries / stats.total_deliveries) * 100
            : 0;

          return {
            ...stats,
            avg_price: avgPrice,
            on_time_delivery_rate: onTimeRate,
            // Ranking score: 60% on-time + 40% price competitiveness
            score: (onTimeRate * 0.6) + ((1 / avgPrice) * 1000 * 0.4),
          };
        });

        // Sort by score (descending)
        rankedVendors.sort((a, b) => b.score - a.score);

        return rankedVendors;
      } catch (error) {
        console.error('Error finding preferred vendors:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id && !!itemCode,
  });
};

// ============================================================================
// Get all vendors ranked by performance
// ============================================================================

export const useVendorsRankedByPerformance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['vendors-ranked-by-performance', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return [];
      }

      try {
        // Get all vendors
        const { data: vendors, error: vendorsError } = await supabase
          .from('vendors')
          .select('id, vendor_name, vendor_name_ar')
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true);

        if (vendorsError) throw vendorsError;

        if (!vendors || vendors.length === 0) {
          return [];
        }

        // Get performance metrics for each vendor
        const vendorsWithMetrics = await Promise.all(
          vendors.map(async (vendor) => {
            const { data: orders } = await supabase
              .from('purchase_orders')
              .select('*')
              .eq('vendor_id', vendor.id)
              .eq('company_id', user.profile.company_id);

            if (!orders || orders.length === 0) {
              return {
                ...vendor,
                total_orders: 0,
                on_time_delivery_rate: 0,
                avg_delivery_days: 0,
                total_amount: 0,
                score: 0,
              };
            }

            let onTimeCount = 0;
            let totalDeliveryDays = 0;
            let deliveredCount = 0;
            let totalAmount = 0;

            orders.forEach((po) => {
              totalAmount += po.total_amount || 0;

              if (po.delivery_date && po.expected_delivery_date) {
                deliveredCount++;
                const deliveryDate = new Date(po.delivery_date);
                const expectedDate = new Date(po.expected_delivery_date);
                const orderDate = new Date(po.order_date);

                const deliveryDays = Math.ceil(
                  (deliveryDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                totalDeliveryDays += deliveryDays;

                if (deliveryDate <= expectedDate) {
                  onTimeCount++;
                }
              }
            });

            const onTimeRate = deliveredCount > 0 ? (onTimeCount / deliveredCount) * 100 : 0;
            const avgDeliveryDays = deliveredCount > 0 ? totalDeliveryDays / deliveredCount : 0;

            // Performance score: 70% on-time + 30% delivery speed
            const score = (onTimeRate * 0.7) + ((30 - Math.min(avgDeliveryDays, 30)) * 0.3);

            return {
              ...vendor,
              total_orders: orders.length,
              on_time_delivery_rate: onTimeRate,
              avg_delivery_days: avgDeliveryDays,
              total_amount: totalAmount,
              score,
            };
          })
        );

        // Sort by score (descending)
        vendorsWithMetrics.sort((a, b) => b.score - a.score);

        return vendorsWithMetrics;
      } catch (error) {
        console.error('Error ranking vendors by performance:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id,
  });
};
