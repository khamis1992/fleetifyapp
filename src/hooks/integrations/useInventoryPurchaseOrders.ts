import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { InventoryItem } from '../useInventoryItems';
import type { PurchaseOrder, PurchaseOrderItem } from '../usePurchaseOrders';

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
  items: Array<{
    item_id: string;
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

      try {
        // 1. Get item details
        const { data: item, error: itemError } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', data.item_id)
          .eq('company_id', user.profile.company_id)
          .single();

        if (itemError) throw itemError;

        // 2. Generate PO number
        const { data: orderNumber, error: numberError } = await supabase
          .rpc('generate_purchase_order_number', {
            company_id_param: user.profile.company_id
          });

        if (numberError) throw numberError;

        // 3. Calculate totals
        const unitPrice = item.cost_price || item.unit_price;
        const subtotal = data.quantity * unitPrice;

        // 4. Create purchase order
        const { data: purchaseOrder, error: orderError } = await supabase
          .from('purchase_orders')
          .insert({
            company_id: user.profile.company_id,
            vendor_id: data.vendor_id,
            order_number: orderNumber,
            order_date: new Date().toISOString(),
            expected_delivery_date: data.expected_delivery_date,
            subtotal,
            total_amount: subtotal,
            tax_amount: 0,
            currency: 'QAR',
            status: 'draft',
            notes: data.notes || `Auto-generated from low stock item: ${item.item_name}`,
            created_by: user.id,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // 5. Create PO items
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert({
            purchase_order_id: purchaseOrder.id,
            item_code: item.item_code,
            description: item.item_name,
            description_ar: item.item_name_ar,
            quantity: data.quantity,
            unit_price: unitPrice,
            total_price: subtotal,
            unit_of_measure: item.unit_of_measure,
            received_quantity: 0,
          });

        if (itemsError) throw itemsError;

        return purchaseOrder;
      } catch (error) {
        console.error('Error creating PO from low stock:', error);
        throw error;
      }
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

      try {
        // 1. Get PO details
        const { data: po, error: poError } = await supabase
          .from('purchase_orders')
          .select('*, purchase_order_items(*)')
          .eq('id', data.po_id)
          .eq('company_id', user.profile.company_id)
          .single();

        if (poError) throw poError;

        // 2. Process each received item
        for (const receivedItem of data.items) {
          // Find corresponding PO item
          const poItem = (po as any).purchase_order_items.find(
            (item: any) => item.id === receivedItem.item_id
          );

          if (!poItem) continue;

          // 3. Create inventory movement (PURCHASE type)
          const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert({
              company_id: user.profile.company_id,
              item_id: receivedItem.item_id,
              warehouse_id: data.warehouse_id,
              movement_type: 'PURCHASE',
              quantity: receivedItem.quantity_received,
              reference_type: 'PURCHASE_ORDER',
              reference_id: data.po_id,
              reference_number: po.order_number,
              movement_date: new Date().toISOString(),
              notes: receivedItem.notes || `Received from PO ${po.order_number}`,
              created_by: user.id,
            });

          if (movementError) throw movementError;

          // 4. Update PO item received quantity
          const newReceivedQty = poItem.received_quantity + receivedItem.quantity_received;
          const { error: updateError } = await supabase
            .from('purchase_order_items')
            .update({ received_quantity: newReceivedQty })
            .eq('id', poItem.id);

          if (updateError) throw updateError;
        }

        // 5. Update PO status
        const allItems = (po as any).purchase_order_items;
        const allReceived = allItems.every(
          (item: any) => item.received_quantity >= item.quantity
        );
        const anyReceived = allItems.some(
          (item: any) => item.received_quantity > 0
        );

        const newStatus = allReceived
          ? 'received'
          : anyReceived
          ? 'partially_received'
          : po.status;

        const { error: statusError } = await supabase
          .from('purchase_orders')
          .update({
            status: newStatus,
            delivery_date: allReceived ? new Date().toISOString() : po.delivery_date
          })
          .eq('id', data.po_id);

        if (statusError) throw statusError;

        return { po, newStatus };
      } catch (error) {
        console.error('Error receiving PO to inventory:', error);
        throw error;
      }
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
