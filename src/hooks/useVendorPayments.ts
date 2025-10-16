import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface VendorPayment {
  id: string;
  company_id: string;
  vendor_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'credit_card';
  reference_number?: string;
  description?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  bank_id?: string;
  journal_entry_id?: string;
  purchase_order_id?: string;
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
  bank?: {
    bank_name: string;
    account_number: string;
  };
  purchase_order?: {
    order_number: string;
    total_amount: number;
  };
}

export interface CreateVendorPaymentData {
  vendor_id: string;
  payment_date: string;
  amount: number;
  payment_method: VendorPayment['payment_method'];
  reference_number?: string;
  description?: string;
  notes?: string;
  bank_id?: string;
  purchase_order_id?: string;
}

export interface UpdateVendorPaymentData extends Partial<CreateVendorPaymentData> {
  status?: VendorPayment['status'];
}

export const useVendorPayments = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['vendor-payments', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      const { data, error } = await supabase
        .from('vendor_payments')
        .select(`
          *,
          vendor:vendors(
            vendor_name,
            vendor_name_ar,
            contact_person,
            email,
            phone
          ),
          bank:banks(
            bank_name,
            account_number
          ),
          purchase_order:purchase_orders(
            order_number,
            total_amount
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VendorPayment[];
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useVendorPaymentsByVendor = (vendorId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['vendor-payments', companyId, vendorId],
    queryFn: async () => {
      if (!companyId || !vendorId) throw new Error('Company ID and vendor ID are required');

      const { data, error } = await supabase
        .from('vendor_payments')
        .select(`
          *,
          bank:banks(
            bank_name,
            account_number
          ),
          purchase_order:purchase_orders(
            order_number,
            total_amount
          )
        `)
        .eq('company_id', companyId)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VendorPayment[];
    },
    enabled: !!companyId && !!vendorId,
  });
};

export const useCreateVendorPayment = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: CreateVendorPaymentData) => {
      if (!companyId) throw new Error('Company ID is required');

      // Generate payment number
      const { data: paymentNumber, error: numberError } = await supabase
        .rpc('generate_vendor_payment_number', { company_id_param: companyId });

      if (numberError) throw numberError;

      // Create vendor payment
      const { data: payment, error: paymentError } = await supabase
        .from('vendor_payments')
        .insert({
          company_id: companyId,
          vendor_id: data.vendor_id,
          payment_number: paymentNumber,
          payment_date: data.payment_date,
          amount: data.amount,
          payment_method: data.payment_method,
          reference_number: data.reference_number,
          description: data.description,
          notes: data.notes,
          bank_id: data.bank_id,
          purchase_order_id: data.purchase_order_id,
          created_by: '00000000-0000-0000-0000-000000000000', // Will be replaced by auth trigger
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
      toast.success('تم إنشاء دفع المورد بنجاح');
    },
    onError: (error) => {
      console.error('Error creating vendor payment:', error);
      toast.error('حدث خطأ أثناء إنشاء دفع المورد');
    },
  });
};

export const useUpdateVendorPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVendorPaymentData }) => {
      const { error } = await supabase
        .from('vendor_payments')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
      toast.success('تم تحديث دفع المورد بنجاح');
    },
    onError: (error) => {
      console.error('Error updating vendor payment:', error);
      toast.error('حدث خطأ أثناء تحديث دفع المورد');
    },
  });
};

export const useDeleteVendorPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendor_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payments'] });
      toast.success('تم حذف دفع المورد بنجاح');
    },
    onError: (error) => {
      console.error('Error deleting vendor payment:', error);
      toast.error('حدث خطأ أثناء حذف دفع المورد');
    },
  });
};