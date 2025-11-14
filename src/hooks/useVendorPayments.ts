import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { usePermissions } from './usePermissions';
import * as Sentry from '@sentry/react';

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
  const { companyId, user } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (data: CreateVendorPaymentData) => {
      // Permission check
      if (!hasPermission('vendor_payments:create')) {
        const error = new Error('ليس لديك صلاحية لإنشاء دفعات الموردين');
        Sentry.captureException(error, {
          tags: {
            feature: 'vendor_payments',
            action: 'create',
            component: 'useCreateVendorPayment'
          },
          extra: { userId: user?.id, companyId }
        });
        throw error;
      }

      if (!companyId) throw new Error('معرف الشركة مطلوب');

      // Validation
      if (!data.amount || data.amount <= 0) {
        throw new Error('المبلغ يجب أن يكون أكبر من صفر');
      }

      if (!data.vendor_id) {
        throw new Error('معرف المورد مطلوب');
      }

      Sentry.addBreadcrumb({
        category: 'vendor_payments',
        message: 'Creating vendor payment',
        level: 'info',
        data: { vendorId: data.vendor_id, amount: data.amount, companyId }
      });

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

      if (paymentError) {
        Sentry.captureException(paymentError, {
          tags: {
            feature: 'vendor_payments',
            action: 'create',
            component: 'useCreateVendorPayment',
            step: 'insert_payment'
          },
          extra: { userId: user?.id, companyId, paymentData: data }
        });
        throw paymentError;
      }

      Sentry.addBreadcrumb({
        category: 'vendor_payments',
        message: 'Vendor payment created successfully',
        level: 'info',
        data: { paymentId: payment.id, paymentNumber: payment.payment_number }
      });

      // Safe audit logging
      try {
        await supabase.from('audit_log').insert({
          action: 'create_vendor_payment',
          table_name: 'vendor_payments',
          record_id: payment.id,
          new_values: payment,
          user_id: user?.id,
          company_id: companyId
        });
      } catch (auditError) {
        // Log audit error but don't fail the operation
        Sentry.captureException(auditError, {
          tags: {
            feature: 'vendor_payments',
            action: 'audit_log',
            severity: 'low'
          },
          extra: { paymentId: payment.id }
        });
      }

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
  const { companyId, user } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVendorPaymentData }) => {
      // Permission check
      if (!hasPermission('vendor_payments:update')) {
        const error = new Error('ليس لديك صلاحية لتعديل دفعات الموردين');
        Sentry.captureException(error, {
          tags: {
            feature: 'vendor_payments',
            action: 'update',
            component: 'useUpdateVendorPayment'
          },
          extra: { userId: user?.id, companyId, paymentId: id }
        });
        throw error;
      }

      // Validation
      if (data.amount !== undefined && data.amount <= 0) {
        throw new Error('المبلغ يجب أن يكون أكبر من صفر');
      }

      Sentry.addBreadcrumb({
        category: 'vendor_payments',
        message: 'Updating vendor payment',
        level: 'info',
        data: { paymentId: id, updateData: data, companyId }
      });

      const { error } = await supabase
        .from('vendor_payments')
        .update(data)
        .eq('id', id);

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'vendor_payments',
            action: 'update',
            component: 'useUpdateVendorPayment',
            step: 'update_payment'
          },
          extra: { userId: user?.id, companyId, paymentId: id, updateData: data }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'vendor_payments',
        message: 'Vendor payment updated successfully',
        level: 'info',
        data: { paymentId: id }
      });

      // Safe audit logging
      try {
        await supabase.from('audit_log').insert({
          action: 'update_vendor_payment',
          table_name: 'vendor_payments',
          record_id: id,
          new_values: data,
          user_id: user?.id,
          company_id: companyId
        });
      } catch (auditError) {
        Sentry.captureException(auditError, {
          tags: {
            feature: 'vendor_payments',
            action: 'audit_log',
            severity: 'low'
          },
          extra: { paymentId: id }
        });
      }
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
  const { companyId, user } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (id: string) => {
      // Permission check
      if (!hasPermission('vendor_payments:delete')) {
        const error = new Error('ليس لديك صلاحية لحذف دفعات الموردين');
        Sentry.captureException(error, {
          tags: {
            feature: 'vendor_payments',
            action: 'delete',
            component: 'useDeleteVendorPayment'
          },
          extra: { userId: user?.id, companyId, paymentId: id }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'vendor_payments',
        message: 'Deleting vendor payment',
        level: 'info',
        data: { paymentId: id, companyId }
      });

      const { error } = await supabase
        .from('vendor_payments')
        .delete()
        .eq('id', id);

      if (error) {
        Sentry.captureException(error, {
          tags: {
            feature: 'vendor_payments',
            action: 'delete',
            component: 'useDeleteVendorPayment',
            step: 'delete_payment'
          },
          extra: { userId: user?.id, companyId, paymentId: id }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'vendor_payments',
        message: 'Vendor payment deleted successfully',
        level: 'info',
        data: { paymentId: id }
      });

      // Safe audit logging
      try {
        await supabase.from('audit_log').insert({
          action: 'delete_vendor_payment',
          table_name: 'vendor_payments',
          record_id: id,
          user_id: user?.id,
          company_id: companyId
        });
      } catch (auditError) {
        Sentry.captureException(auditError, {
          tags: {
            feature: 'vendor_payments',
            action: 'audit_log',
            severity: 'low'
          },
          extra: { paymentId: id }
        });
      }
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