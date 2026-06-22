import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { usePermissions } from './usePermissions';
import * as Sentry from '@sentry/react';

// ============================================================================
// Internal Helper: Create Journal Entry for Vendor Payment
// ============================================================================

async function createVendorPaymentJournalEntryInternal(
  companyId: string,
  paymentId: string,
  paymentNumber: string,
  vendorId: string,
  amount: number,
  paymentMethod: string,
  bankId?: string
): Promise<string | null> {
  try {
    // Get vendor info
    const { data: vendor } = await supabase
      .from('vendors')
      .select('vendor_name, vendor_name_ar')
      .eq('id', vendorId)
      .single();

    const vendorName = vendor?.vendor_name_ar || vendor?.vendor_name || 'مورد';

    // Get account mappings
    const { data: mappings } = await supabase
      .from('account_mappings')
      .select(`
        chart_of_accounts_id,
        default_account_type:default_account_types(type_code)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true);

    let apAccountId: string | null = null;
    let cashAccountId: string | null = null;
    let bankAccountId: string | null = null;

    mappings?.forEach((mapping: any) => {
      const typeCode = mapping.default_account_type?.type_code;
      if (typeCode === 'accounts_payable') {
        apAccountId = mapping.chart_of_accounts_id;
      } else if (typeCode === 'cash') {
        cashAccountId = mapping.chart_of_accounts_id;
      } else if (typeCode === 'bank') {
        bankAccountId = mapping.chart_of_accounts_id;
      }
    });

    // Fallback: Get accounts by code pattern
    if (!apAccountId || !cashAccountId || !bankAccountId) {
      const { data: defaultAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .eq('is_header', false)
        .gte('account_level', 3);

      defaultAccounts?.forEach((acc: any) => {
        if (acc.account_code.startsWith('21') && !apAccountId) {
          apAccountId = acc.id;
        }
        if (acc.account_code.startsWith('1111') && !cashAccountId) {
          cashAccountId = acc.id;
        }
        if (acc.account_code.startsWith('1115') && !bankAccountId) {
          bankAccountId = acc.id;
        }
      });
    }

    if (!apAccountId) {
      console.warn('Could not find AP account for vendor payment journal entry');
      return null;
    }

    // Determine credit account based on payment method
    let creditAccountId: string | null = null;
    let creditAccountName = '';

    if (paymentMethod === 'cash') {
      creditAccountId = cashAccountId;
      creditAccountName = 'الصندوق';
    } else {
      creditAccountId = bankAccountId || bankId;
      creditAccountName = 'البنك';
    }

    if (!creditAccountId) {
      console.warn('Could not find cash/bank account for vendor payment journal entry');
      return null;
    }

    // Generate entry number
    const entryNumber = `JE-VP-${Date.now().toString().slice(-6)}`;

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_number: entryNumber,
        entry_date: new Date().toISOString().split('T')[0],
        description: `دفع للمورد ${vendorName} - دفعة رقم ${paymentNumber}`,
        reference_type: 'VENDOR_PAYMENT',
        reference_id: paymentId,
        total_debit: amount,
        total_credit: amount,
        status: 'posted',
        posted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (entryError) throw entryError;

    // Create journal entry lines
    const lines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: apAccountId,
        line_description: `تسديد ذمم دائنة - ${vendorName}`,
        debit_amount: amount,
        credit_amount: 0,
        line_number: 1,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: creditAccountId,
        line_description: `دفع من ${creditAccountName}`,
        debit_amount: 0,
        credit_amount: amount,
        line_number: 2,
      },
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) throw linesError;

    console.log(`Journal entry ${journalEntry.entry_number} created for vendor payment ${paymentNumber}`);
    return journalEntry.id;
  } catch (error) {
    console.error('Error creating vendor payment journal entry:', error);
    return null;
  }
}

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
      Sentry.addBreadcrumb({ category: 'vendor_payments', message: 'Fetching vendor payments', level: 'info', data: { companyId } });
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

      if (error) {
        Sentry.captureException(error, { tags: { feature: 'vendor_payments', action: 'fetch_payments', component: 'useVendorPayments' }, extra: { companyId } });
        throw error;
      }
      Sentry.addBreadcrumb({ category: 'vendor_payments', message: 'Vendor payments fetched', level: 'info', data: { count: data?.length || 0 } });
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
      Sentry.addBreadcrumb({ category: 'vendor_payments', message: 'Fetching vendor payments by vendor', level: 'info', data: { companyId, vendorId } });
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
      if (error) {
        Sentry.captureException(error, { tags: { feature: 'vendor_payments', action: 'fetch_payments_by_vendor', component: 'useVendorPaymentsByVendor' }, extra: { companyId, vendorId } });
        throw error;
      }
      Sentry.addBreadcrumb({ category: 'vendor_payments', message: 'Vendor payments by vendor fetched', level: 'info', data: { count: data?.length || 0 } });
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

      // Create journal entry for the payment (financial integration)
      try {
        const journalEntryId = await createVendorPaymentJournalEntryInternal(
          companyId,
          payment.id,
          payment.payment_number,
          data.vendor_id,
          data.amount,
          data.payment_method,
          data.bank_id
        );

        // Update payment with journal entry reference
        if (journalEntryId) {
          await supabase
            .from('vendor_payments')
            .update({ journal_entry_id: journalEntryId })
            .eq('id', payment.id);

          Sentry.addBreadcrumb({
            category: 'vendor_payments',
            message: 'Journal entry created for vendor payment',
            level: 'info',
            data: { paymentId: payment.id, journalEntryId }
          });
        }
      } catch (journalError) {
        // Log journal entry error but don't fail the operation
        console.error('Error creating journal entry for vendor payment:', journalError);
        Sentry.captureException(journalError, {
          tags: {
            feature: 'vendor_payments',
            action: 'create_journal_entry',
            severity: 'medium'
          },
          extra: { paymentId: payment.id }
        });
      }

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