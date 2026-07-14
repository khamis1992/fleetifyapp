import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

/**
 * Integration Hook: Inventory <-> Purchase Orders
 * Enables: Auto-PO generation from low stock, PO receiving to inventory
 */

// ============================================================================
// Types
// ============================================================================

export interface PreferredVendor {
  vendor_id: string;
  vendor_name: string;
  vendor_name_ar?: string;
  last_purchase_price: number;
  total_orders: number;
  avg_delivery_days: number;
  on_time_delivery_rate: number;
}

export interface POFromLowStockData {
  item_id: string;
  vendor_id: string;
  quantity: number;
  expected_delivery_date: string;
  notes?: string;
}

export interface ReceivePOData {
  po_id: string;
  warehouse_id: string;
  receipt_date?: string;
  delivery_note_number?: string;
  notes?: string;
  items: Array<{
    purchase_order_item_id: string;
    quantity_received: number;
    notes?: string;
  }>;
}


// ============================================================================
// Auto-generate PO from low stock item
// ============================================================================

export const useCreatePOFromLowStock = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: POFromLowStockData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('id,item_code,item_name,item_name_ar,cost_price,unit_price,unit_of_measure')
        .eq('id', data.item_id)
        .eq('company_id', user.profile.company_id)
        .single();
      if (itemError) throw itemError;

      const unitPrice = Number(item.cost_price || item.unit_price || 0);
      const { data: purchaseOrder, error } = await supabase.rpc(
        'create_purchase_order_v1',
        {
          p_company_id: user.profile.company_id,
          p_vendor_id: data.vendor_id,
          p_order_date: new Date().toISOString().slice(0, 10),
          p_expected_delivery_date: data.expected_delivery_date,
          p_notes:
            data.notes || `Auto-generated from low stock item: ${item.item_name}`,
          p_terms_and_conditions: null,
          p_delivery_address: null,
          p_contact_person: null,
          p_phone: null,
          p_email: null,
          p_items: [
            {
              inventory_item_id: item.id,
              item_code: item.item_code,
              description: item.item_name,
              description_ar: item.item_name_ar,
              quantity: data.quantity,
              unit_price: unitPrice,
              unit_of_measure: item.unit_of_measure || 'PCS',
            },
          ] as unknown as Json,
          p_actor_id: null,
        }
      );
      if (error) throw error;
      return purchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      toast.success('تم إنشاء أمر الشراء بنجاح من الصنف منخفض المخزون');
    },
    onError: (error) => {
      console.error('PO creation error:', error);
      toast.error('خطأ في إنشاء أمر الشراء من المخزون المنخفض');
    },
  });
};

// ============================================================================
// Receive PO and update inventory
// ============================================================================

export const useReceivePOToInventory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: ReceivePOData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }
      const { data: receipt, error } = await supabase.rpc(
        'receive_purchase_order_v1',
        {
          p_company_id: user.profile.company_id,
          p_purchase_order_id: data.po_id,
          p_warehouse_id: data.warehouse_id,
          p_receipt_date: data.receipt_date || new Date().toISOString().slice(0, 10),
          p_delivery_note_number: data.delivery_note_number || null,
          p_notes: data.notes || null,
          p_items: data.items as unknown as Json,
          p_actor_id: null,
        }
      );
      if (error) throw error;
      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-movements'] });
      toast.success('تم استلام أمر الشراء وتحديث المخزون بنجاح');
    },
    onError: (error) => {
      console.error('PO receiving error:', error);
      toast.error('خطأ في استلام أمر الشراء إلى المخزون');
    },
  });
};

// ============================================================================
// Link inventory items to POs - Purchase History
// ============================================================================

export const useInventoryPurchaseHistory = (itemId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-purchase-history', itemId, user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id || !itemId) {
        return [];
      }

      try {
        // Query all POs containing this item
        const { data, error } = await supabase
          .from('purchase_order_items')
          .select(`
            *,
            purchase_order:purchase_orders!inner(
              id,
              order_number,
              order_date,
              delivery_date,
              status,
              vendor:vendors(vendor_name, vendor_name_ar)
            )
          `)
          .eq('item_code', itemId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform data
        const history = data?.map((item: any) => ({
          po_id: item.purchase_order.id,
          po_number: item.purchase_order.order_number,
          po_date: item.purchase_order.order_date,
          delivery_date: item.purchase_order.delivery_date,
          status: item.purchase_order.status,
          vendor_name: item.purchase_order.vendor?.vendor_name,
          vendor_name_ar: item.purchase_order.vendor?.vendor_name_ar,
          quantity_ordered: item.quantity,
          quantity_received: item.received_quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })) || [];

        return history;
      } catch (error) {
        console.error('Error fetching purchase history:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id && !!itemId,
  });
};

// ============================================================================
// Find preferred vendor for item (based on past purchases)
// ============================================================================

export const usePreferredVendorForItem = (itemId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['preferred-vendor-for-item', itemId, user?.profile?.company_id],
    queryFn: async (): Promise<PreferredVendor | null> => {
      if (!user?.profile?.company_id || !itemId) {
        return null;
      }

      try {
        // Query purchase history for this item
        const { data: poItems, error } = await supabase
          .from('purchase_order_items')
          .select(`
            unit_price,
            purchase_order:purchase_orders!inner(
              vendor_id,
              order_date,
              delivery_date,
              expected_delivery_date,
              status,
              vendor:vendors(vendor_name, vendor_name_ar)
            )
          `)
          .eq('item_code', itemId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!poItems || poItems.length === 0) return null;

        // Group by vendor and calculate metrics
        const vendorMetrics = new Map<string, {
          vendor_id: string;
          vendor_name: string;
          vendor_name_ar?: string;
          total_orders: number;
          total_price: number;
          on_time_deliveries: number;
          total_deliveries: number;
        }>();

        poItems.forEach((item: any) => {
          const po = item.purchase_order;
          const vendorId = po.vendor_id;

          if (!vendorMetrics.has(vendorId)) {
            vendorMetrics.set(vendorId, {
              vendor_id: vendorId,
              vendor_name: po.vendor.vendor_name,
              vendor_name_ar: po.vendor.vendor_name_ar,
              total_orders: 0,
              total_price: 0,
              on_time_deliveries: 0,
              total_deliveries: 0,
            });
          }

          const metrics = vendorMetrics.get(vendorId)!;
          metrics.total_orders++;
          metrics.total_price += item.unit_price;

          // Check on-time delivery
          if (po.delivery_date && po.expected_delivery_date) {
            metrics.total_deliveries++;
            if (new Date(po.delivery_date) <= new Date(po.expected_delivery_date)) {
              metrics.on_time_deliveries++;
            }
          }
        });

        // Find best vendor (lowest avg price + highest on-time rate)
        let bestVendor: PreferredVendor | null = null;
        let bestScore = -1;

        vendorMetrics.forEach((metrics) => {
          const avgPrice = metrics.total_price / metrics.total_orders;
          const onTimeRate = metrics.total_deliveries > 0
            ? metrics.on_time_deliveries / metrics.total_deliveries
            : 0;

          // Score: 70% on-time rate + 30% price (normalized)
          const score = (onTimeRate * 0.7) + ((1 / avgPrice) * 0.3);

          if (score > bestScore) {
            bestScore = score;
            bestVendor = {
              vendor_id: metrics.vendor_id,
              vendor_name: metrics.vendor_name,
              vendor_name_ar: metrics.vendor_name_ar,
              last_purchase_price: avgPrice,
              total_orders: metrics.total_orders,
              avg_delivery_days: 0, // Can be calculated from data
              on_time_delivery_rate: onTimeRate * 100,
            };
          }
        });

        return bestVendor;
      } catch (error) {
        console.error('Error finding preferred vendor:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id && !!itemId,
  });
};
