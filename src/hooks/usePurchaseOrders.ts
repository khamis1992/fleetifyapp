import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface PurchaseOrder {
  id: string;
  company_id: string;
  vendor_id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date?: string;
  delivery_date?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent_to_vendor' | 'received' | 'partially_received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  terms_and_conditions?: string;
  delivery_address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  vendor?: {
    vendor_name: string;
    vendor_name_ar?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
  };
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_code?: string;
  description: string;
  description_ar?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_of_measure: string;
  received_quantity: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderData {
  vendor_id: string;
  order_date: string;
  expected_delivery_date?: string;
  notes?: string;
  terms_and_conditions?: string;
  delivery_address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  items: Array<{
    item_code?: string;
    description: string;
    description_ar?: string;
    quantity: number;
    unit_price: number;
    unit_of_measure?: string;
    notes?: string;
  }>;
}

export interface UpdatePurchaseOrderData extends Partial<CreatePurchaseOrderData> {
  status?: PurchaseOrder['status'];
  delivery_date?: string;
}

export const usePurchaseOrders = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['purchase-orders', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendor:vendors(
            vendor_name,
            vendor_name_ar,
            contact_person,
            email,
            phone
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const usePurchaseOrderItems = (purchaseOrderId?: string) => {
  return useQuery({
    queryKey: ['purchase-order-items', purchaseOrderId],
    queryFn: async () => {
      if (!purchaseOrderId) throw new Error('Purchase order ID is required');

      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: !!purchaseOrderId,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderData) => {
      if (!companyId) throw new Error('Company ID is required');

      // Generate purchase order number
      const { data: orderNumber, error: numberError } = await supabase
        .rpc('generate_purchase_order_number', { company_id_param: companyId });

      if (numberError) throw numberError;

      // Calculate totals
      const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const total_amount = subtotal; // Add tax calculation if needed

      // Create purchase order
      const { data: purchaseOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: companyId,
          vendor_id: data.vendor_id,
          order_number: orderNumber,
          order_date: data.order_date,
          expected_delivery_date: data.expected_delivery_date,
          subtotal,
          total_amount,
          notes: data.notes,
          terms_and_conditions: data.terms_and_conditions,
          delivery_address: data.delivery_address,
          contact_person: data.contact_person,
          phone: data.phone,
          email: data.email,
          created_by: '00000000-0000-0000-0000-000000000000', // Will be replaced by auth trigger
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create purchase order items
      const items = data.items.map(item => ({
        purchase_order_id: purchaseOrder.id,
        item_code: item.item_code,
        description: item.description,
        description_ar: item.description_ar,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        unit_of_measure: item.unit_of_measure || 'PCS',
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return purchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('تم إنشاء أمر الشراء بنجاح');
    },
    onError: (error) => {
      console.error('Error creating purchase order:', error);
      toast.error('حدث خطأ أثناء إنشاء أمر الشراء');
    },
  });
};

export const useUpdatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseOrderData }) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('تم تحديث أمر الشراء بنجاح');
    },
    onError: (error) => {
      console.error('Error updating purchase order:', error);
      toast.error('حدث خطأ أثناء تحديث أمر الشراء');
    },
  });
};

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete items
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', id);

      if (itemsError) throw itemsError;

      // Then delete the purchase order
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('تم حذف أمر الشراء بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting purchase order:', error);
      toast.error('حدث خطأ أثناء حذف أمر الشراء');
    },
  });
};