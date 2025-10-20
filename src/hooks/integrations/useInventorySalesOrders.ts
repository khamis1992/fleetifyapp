import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { SalesOrder } from '../useSalesOrders';

/**
 * Integration Hook: Inventory <-> Sales Orders
 * Enables: Sales order creation from inventory, fulfillment, stock allocation
 */

// ============================================================================
// Types
// ============================================================================

export interface SalesOrderFromInventoryData {
  customer_id?: string;
  order_date: string;
  delivery_date?: string;
  warehouse_id: string;
  items: Array<{
    item_id: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface FulfillSalesOrderData {
  order_id: string;
  warehouse_id: string;
  fulfillment_date?: string;
}

export interface InventoryAvailability {
  item_id: string;
  item_name: string;
  item_name_ar?: string;
  quantity_requested: number;
  quantity_available: number;
  quantity_allocated: number;
  is_available: boolean;
  shortage: number;
}

// ============================================================================
// Create sales order from inventory items
// ============================================================================

export const useCreateSalesOrderFromInventory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: SalesOrderFromInventoryData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      try {
        // 1. Check stock availability for all items
        const availabilityChecks = await Promise.all(
          data.items.map(async (item) => {
            const { data: stockLevel, error } = await supabase
              .from('inventory_stock_levels')
              .select('quantity_available')
              .eq('item_id', item.item_id)
              .eq('warehouse_id', data.warehouse_id)
              .eq('company_id', user.profile.company_id)
              .single();

            if (error) throw error;

            return {
              item_id: item.item_id,
              requested: item.quantity,
              available: stockLevel?.quantity_available || 0,
            };
          })
        );

        // 2. Validate availability
        const insufficient = availabilityChecks.filter(
          (check) => check.available < check.requested
        );

        if (insufficient.length > 0) {
          throw new Error(
            `عدة أصناف غير متوفرة بالكمية المطلوبة: ${insufficient.map(i => i.item_id).join(', ')}`
          );
        }

        // 3. Get item details and calculate totals
        let subtotal = 0;
        const orderItems = await Promise.all(
          data.items.map(async (item) => {
            const { data: inventoryItem, error } = await supabase
              .from('inventory_items')
              .select('*')
              .eq('id', item.item_id)
              .eq('company_id', user.profile.company_id)
              .single();

            if (error) throw error;

            const itemTotal = item.quantity * inventoryItem.unit_price;
            subtotal += itemTotal;

            return {
              item_id: item.item_id,
              item_name: inventoryItem.item_name,
              item_code: inventoryItem.item_code,
              quantity: item.quantity,
              unit_price: inventoryItem.unit_price,
              total: itemTotal,
            };
          })
        );

        // 4. Generate order number
        const currentYear = new Date().getFullYear();
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

        const { data: lastOrder } = await supabase
          .from('sales_orders')
          .select('order_number')
          .eq('company_id', user.profile.company_id)
          .order('created_at', { ascending: false })
          .limit(1);

        let orderNumber: string;
        if (lastOrder && lastOrder.length > 0) {
          const numberPart = parseInt(lastOrder[0].order_number.split('-').pop() || '0');
          orderNumber = `SO-${currentYear}${currentMonth}-${String(numberPart + 1).padStart(4, '0')}`;
        } else {
          orderNumber = `SO-${currentYear}${currentMonth}-0001`;
        }

        // 5. Create sales order
        const { data: salesOrder, error: orderError } = await supabase
          .from('sales_orders')
          .insert({
            company_id: user.profile.company_id,
            customer_id: data.customer_id,
            order_number: orderNumber,
            order_date: data.order_date,
            delivery_date: data.delivery_date,
            status: 'pending',
            items: orderItems,
            total: subtotal,
            notes: data.notes,
            is_active: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // 6. Allocate inventory (update quantity_allocated)
        for (const item of data.items) {
          const { error: allocateError } = await supabase.rpc(
            'allocate_inventory_stock',
            {
              p_item_id: item.item_id,
              p_warehouse_id: data.warehouse_id,
              p_quantity: item.quantity,
            }
          );

          if (allocateError) {
            console.error('Allocation error:', allocateError);
            // Continue even if allocation fails - can be done manually
          }
        }

        return salesOrder;
      } catch (error) {
        console.error('Error creating sales order from inventory:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-levels'] });
      toast({
        title: 'تم إنشاء طلبية البيع',
        description: 'تم إنشاء طلبية البيع وتخصيص المخزون بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Sales order creation error:', error);
      toast({
        title: 'خطأ في إنشاء طلبية البيع',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء طلبية البيع.',
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// Fulfill sales order (ship and reduce inventory)
// ============================================================================

export const useFulfillSalesOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: FulfillSalesOrderData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID is required');
      }

      try {
        // 1. Get sales order details
        const { data: order, error: orderError } = await supabase
          .from('sales_orders')
          .select('*')
          .eq('id', data.order_id)
          .eq('company_id', user.profile.company_id)
          .single();

        if (orderError) throw orderError;

        // 2. Create inventory movements (SALE type) for each item
        const items = order.items as Array<{
          item_id: string;
          item_name: string;
          quantity: number;
        }>;

        for (const item of items) {
          const { error: movementError } = await supabase
            .from('inventory_movements')
            .insert({
              company_id: user.profile.company_id,
              item_id: item.item_id,
              warehouse_id: data.warehouse_id,
              movement_type: 'SALE',
              quantity: -item.quantity, // Negative for outbound
              reference_type: 'SALES_ORDER',
              reference_id: data.order_id,
              reference_number: order.order_number,
              movement_date: data.fulfillment_date || new Date().toISOString(),
              notes: `Fulfilled from sales order ${order.order_number}`,
              created_by: user.id,
            });

          if (movementError) throw movementError;
        }

        // 3. Update order status to shipped/delivered
        const { error: updateError } = await supabase
          .from('sales_orders')
          .update({
            status: 'shipped',
            delivery_date: data.fulfillment_date || new Date().toISOString(),
          })
          .eq('id', data.order_id);

        if (updateError) throw updateError;

        return order;
      } catch (error) {
        console.error('Error fulfilling sales order:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-movements'] });
      toast({
        title: 'تم شحن الطلبية',
        description: 'تم شحن الطلبية وتحديث المخزون بنجاح.',
      });
    },
    onError: (error) => {
      console.error('Order fulfillment error:', error);
      toast({
        title: 'خطأ في شحن الطلبية',
        description: 'حدث خطأ أثناء شحن الطلبية.',
        variant: 'destructive',
      });
    },
  });
};

// ============================================================================
// Check inventory availability for order
// ============================================================================

export const useSalesOrderInventoryCheck = (
  items: Array<{ item_id: string; quantity: number }>,
  warehouseId: string
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-availability-check', items, warehouseId, user?.profile?.company_id],
    queryFn: async (): Promise<InventoryAvailability[]> => {
      if (!user?.profile?.company_id || !items || items.length === 0) {
        return [];
      }

      try {
        const availabilityResults = await Promise.all(
          items.map(async (item) => {
            // Get item details
            const { data: inventoryItem, error: itemError } = await supabase
              .from('inventory_items')
              .select('item_name, item_name_ar')
              .eq('id', item.item_id)
              .single();

            if (itemError) throw itemError;

            // Get stock level
            const { data: stockLevel, error: stockError } = await supabase
              .from('inventory_stock_levels')
              .select('quantity_available, quantity_allocated')
              .eq('item_id', item.item_id)
              .eq('warehouse_id', warehouseId)
              .eq('company_id', user.profile.company_id)
              .single();

            if (stockError && stockError.code !== 'PGRST116') {
              throw stockError;
            }

            const quantityAvailable = stockLevel?.quantity_available || 0;
            const quantityAllocated = stockLevel?.quantity_allocated || 0;
            const isAvailable = quantityAvailable >= item.quantity;
            const shortage = isAvailable ? 0 : item.quantity - quantityAvailable;

            return {
              item_id: item.item_id,
              item_name: inventoryItem.item_name,
              item_name_ar: inventoryItem.item_name_ar,
              quantity_requested: item.quantity,
              quantity_available: quantityAvailable,
              quantity_allocated: quantityAllocated,
              is_available: isAvailable,
              shortage,
            };
          })
        );

        return availabilityResults;
      } catch (error) {
        console.error('Error checking inventory availability:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id && !!items && items.length > 0 && !!warehouseId,
  });
};

// ============================================================================
// Get sales history for an inventory item
// ============================================================================

export const useInventorySalesHistory = (itemId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-sales-history', itemId, user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id || !itemId) {
        return [];
      }

      try {
        // Query all sales orders containing this item
        const { data, error } = await supabase
          .from('sales_orders')
          .select('*')
          .eq('company_id', user.profile.company_id)
          .order('order_date', { ascending: false });

        if (error) throw error;

        // Filter orders that contain this item
        const ordersWithItem = data?.filter((order) => {
          const items = order.items as Array<{ item_id: string; quantity: number }>;
          return items.some((item) => item.item_id === itemId);
        });

        // Transform data
        const history = ordersWithItem?.map((order) => {
          const items = order.items as Array<{
            item_id: string;
            item_name: string;
            quantity: number;
            unit_price: number;
            total: number;
          }>;
          const orderItem = items.find((item) => item.item_id === itemId);

          return {
            order_id: order.id,
            order_number: order.order_number,
            order_date: order.order_date,
            delivery_date: order.delivery_date,
            status: order.status,
            customer_id: order.customer_id,
            quantity_sold: orderItem?.quantity || 0,
            unit_price: orderItem?.unit_price || 0,
            total_price: orderItem?.total || 0,
          };
        }) || [];

        return history;
      } catch (error) {
        console.error('Error fetching sales history:', error);
        throw error;
      }
    },
    enabled: !!user?.profile?.company_id && !!itemId,
  });
};
