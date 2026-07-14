import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import type { Json } from '@/integrations/supabase/types';

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
  inventory_item_id?: string | null;
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
    inventory_item_id?: string;
    item_code?: string;
    description: string;
    description_ar?: string;
    quantity: number;
    unit_price: number;
    unit_of_measure?: string;
    notes?: string;
  }>;
}

export interface UpdatePurchaseOrderData extends Omit<Partial<CreatePurchaseOrderData>, 'items'> {
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
      const { data: purchaseOrder, error } = await supabase.rpc(
        'create_purchase_order_v1',
        {
          p_company_id: companyId,
          p_vendor_id: data.vendor_id,
          p_order_date: data.order_date,
          p_expected_delivery_date: data.expected_delivery_date || null,
          p_notes: data.notes || null,
          p_terms_and_conditions: data.terms_and_conditions || null,
          p_delivery_address: data.delivery_address || null,
          p_contact_person: data.contact_person || null,
          p_phone: data.phone || null,
          p_email: data.email || null,
          p_items: data.items as unknown as Json,
          p_actor_id: null,
        }
      );
      if (error) throw error;
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
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseOrderData }) => {
      if (!companyId) throw new Error('Company ID is required');
      if (data.status) {
        if (Object.keys(data).length !== 1) {
          throw new Error('Status transitions cannot be combined with purchase order edits');
        }
        const { error } = await supabase.rpc('transition_purchase_order_status_v1', {
          p_company_id: companyId,
          p_purchase_order_id: id,
          p_target_status: data.status,
          p_actor_id: null,
        });
        if (error) throw error;
        return;
      }
      const { data: existing, error: existingError } = await supabase
        .from('purchase_orders')
        .select('status')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();
      if (existingError || !existing) throw existingError || new Error('Purchase order not found');
      if (!['draft', 'pending_approval'].includes(existing.status)) {
        throw new Error('لا يمكن تعديل أمر شراء معتمد أو مستلم');
      }
      const { error } = await supabase
        .from('purchase_orders')
        .update(data)
        .eq('id', id)
        .eq('company_id', companyId)
        .eq('status', existing.status);

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
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error('Company ID is required');
      const { error } = await supabase.rpc('transition_purchase_order_status_v1', {
        p_company_id: companyId,
        p_purchase_order_id: id,
        p_target_status: 'cancelled',
        p_actor_id: null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('تم إلغاء أمر الشراء بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting purchase order:', error);
      toast.error('حدث خطأ أثناء إلغاء أمر الشراء');
    },
  });
};
