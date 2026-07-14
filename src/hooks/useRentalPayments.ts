import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import * as Sentry from '@sentry/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { usePaymentOperations } from '@/hooks/business/usePaymentOperations';

type RentalReceiptUpdate = Database['public']['Tables']['rental_payment_receipts']['Update'];
type OutstandingBalanceRow = Database['public']['Functions']['get_all_customers_outstanding_balance']['Returns'][number];
type SupportedPaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'debit_card';

const normalizePaymentMethod = (method: string | null | undefined): SupportedPaymentMethod => {
  const supported: SupportedPaymentMethod[] = ['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card'];
  return supported.includes(method as SupportedPaymentMethod) ? method as SupportedPaymentMethod : 'cash';
};

const getRentalReceiptPaymentKey = (receiptId: string): string => `legacy-rental-receipt:${receiptId}`;

const assertRentalReceiptHasNoFinancialEffect = async (receiptId: string, companyId: string): Promise<void> => {
  const [{ data: canonicalPayment, error: paymentError }, { data: legacyJournal, error: journalError }] = await Promise.all([
    supabase
      .from('payments')
      .select('id')
      .eq('company_id', companyId)
      .eq('reference_number', getRentalReceiptPaymentKey(receiptId))
      .neq('payment_status', 'cancelled')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('journal_entries')
      .select('id')
      .eq('company_id', companyId)
      .eq('reference_type', 'rental_payment')
      .eq('reference_id', receiptId)
      .neq('status', 'reversed')
      .limit(1)
      .maybeSingle(),
  ]);

  if (paymentError) throw paymentError;
  if (journalError) throw journalError;
  if (canonicalPayment || legacyJournal) {
    throw new Error('لا يمكن تعديل أو حذف إيصال له أثر مالي. ألغِ الدفعة أو اعكس القيد من المسار المالي المعتمد.');
  }
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const details = error as { message?: unknown; hint?: unknown; details?: unknown };
    return [details.message, details.hint, details.details]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' - ') || 'خطأ غير معروف';
  }
  return 'خطأ غير معروف';
};

export const toRentalReceiptUpdate = (updates: Partial<RentalPaymentReceipt>): RentalReceiptUpdate => ({
  ...(updates.customer_id !== undefined && { customer_id: updates.customer_id }),
  ...(updates.customer_name !== undefined && { customer_name: updates.customer_name }),
  ...(updates.month !== undefined && { month: updates.month }),
  ...(updates.rent_amount !== undefined && { rent_amount: updates.rent_amount }),
  ...(updates.payment_date !== undefined && { payment_date: updates.payment_date }),
  ...(updates.fine !== undefined && { fine: updates.fine }),
  ...(updates.total_paid !== undefined && { total_paid: updates.total_paid }),
  ...(updates.amount_due !== undefined && { amount_due: updates.amount_due }),
  ...(updates.pending_balance !== undefined && { pending_balance: updates.pending_balance }),
  ...(updates.payment_status !== undefined && { payment_status: updates.payment_status }),
  ...(updates.notes !== undefined && { notes: updates.notes }),
  ...(updates.vehicle_id !== undefined && { vehicle_id: updates.vehicle_id }),
  ...(updates.contract_id !== undefined && { contract_id: updates.contract_id }),
});

export const mapOutstandingBalanceSummary = (row: OutstandingBalanceRow): CustomerBalanceSummary => {
  const monthsPaid = row.monthly_rent > 0
    ? Math.max(0, Math.floor(row.total_paid / row.monthly_rent))
    : 0;
  const unpaidMonthCount = Math.max(0, row.months_behind);

  return {
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    expected_total: row.total_paid + row.outstanding_balance,
    total_paid: row.total_paid,
    outstanding_balance: row.outstanding_balance,
    months_expected: monthsPaid + unpaidMonthCount,
    months_paid: monthsPaid,
    unpaid_month_count: unpaidMonthCount,
    last_payment_date: row.last_payment_date || null,
    monthly_rent: row.monthly_rent,
    payment_status: unpaidMonthCount > 2 ? 'overdue' : unpaidMonthCount > 0 ? 'late' : 'current'
  };
};

/**
 * Vehicle info for payment receipts
 */
export interface VehicleInfo {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year?: number;
  color_ar?: string;
}

/**
 * Rental Payment Receipt Interface
 */
export interface RentalPaymentReceipt {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  vehicle_number?: string; // رقم المركبة
  month: string;
  rent_amount: number;
  payment_date: string;
  fine: number;
  total_paid: number;
  amount_due: number;
  pending_balance: number;
  payment_status: 'paid' | 'partial' | 'pending';
  payment_method?: string;
  receipt_number?: string;
  reference_number?: string;
  month_number?: number;
  fiscal_year?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  vehicle_id?: string;
  contract_id?: string;
  invoice_id?: string;
  vehicle?: VehicleInfo;
  customer?: {
    id: string;
    first_name?: string;
    last_name?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    phone?: string;
  };
  contract?: {
    id: string;
    contract_number?: string;
    vehicle_number?: string;
  };
}

/**
 * Customer with rental info
 */
export interface CustomerWithRental {
  id: string;
  name: string;
  monthly_rent: number;
}

/**
 * Payment totals for a customer
 */
export interface CustomerPaymentTotals {
  total_payments: number;
  total_fines: number;
  total_rent: number;
  total_pending: number;
  total_due: number;
  receipt_count: number;
  last_payment_date: string | null;
  partial_payment_count: number;
}

/**
 * Outstanding balance for a customer
 */
export interface CustomerOutstandingBalance {
  expected_total: number;
  total_paid: number;
  outstanding_balance: number;
  months_expected: number;
  months_paid: number;
  unpaid_month_count: number;
  last_payment_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_rent: number;
}

/**
 * Unpaid month information
 */
export interface UnpaidMonth {
  month_number: number;
  month_name: string;
  expected_date: string;
  is_overdue: boolean;
  days_overdue: number;
}

/**
 * Customer with outstanding balance summary
 */
export interface CustomerBalanceSummary {
  customer_id: string;
  customer_name: string;
  expected_total: number;
  total_paid: number;
  outstanding_balance: number;
  months_expected: number;
  months_paid: number;
  unpaid_month_count: number;
  last_payment_date: string | null;
  monthly_rent: number;
  payment_status: 'current' | 'late' | 'overdue';
}

/**
 * Fine calculation result
 */
export interface FineCalculation {
  fine: number;
  days_late: number;
  month: string;
  rent_amount: number;
}

const DELAY_FINE_PER_DAY = 120; // QAR
const MAX_FINE_PER_MONTH = 3000; // QAR

/**
 * Calculate delay fine based on payment date
 */
export const calculateDelayFine = (
  paymentDateStr: string,
  monthlyRent: number
): FineCalculation => {
  // Validate input
  if (!paymentDateStr) {
    return {
      fine: 0,
      days_late: 0,
      month: '',
      rent_amount: monthlyRent
    };
  }

  const paymentDate = new Date(paymentDateStr);
  
  // Check if date is valid
  if (isNaN(paymentDate.getTime())) {
    console.error('Invalid date string provided to calculateDelayFine:', paymentDateStr);
    return {
      fine: 0,
      days_late: 0,
      month: '',
      rent_amount: monthlyRent
    };
  }
  
  const paymentDay = paymentDate.getDate();
  
  let fine = 0;
  let daysLate = 0;
  
  // If payment is made after the 1st, calculate delay
  if (paymentDay > 1) {
    daysLate = paymentDay - 1;
    fine = Math.min(daysLate * DELAY_FINE_PER_DAY, MAX_FINE_PER_MONTH);
  }
  
  const month = format(paymentDate, 'MMMM yyyy', { locale: ar });
  
  return {
    fine,
    days_late: daysLate,
    month,
    rent_amount: monthlyRent
  };
};

/**
 * Hook to fetch rental payment receipts for a specific customer
 */
export const useRentalPaymentReceipts = (customerId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['rental-receipts', companyId, customerId],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'rental_payments',
        message: 'Fetching rental payment receipts',
        level: 'info',
        data: { companyId, customerId }
      });

      if (!companyId) {
        throw new Error('Company ID is required');
      }

      let query = supabase
        .from('rental_payment_receipts')
        .select(`
          *,
          customer:customers!customer_id(
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            phone
          ),
          contract:contracts!contract_id(
            id,
            contract_number,
            contract_amount,
            status
          ),
          vehicle:vehicles!vehicle_id(
            id,
            plate_number,
            make,
            model,
            year
          )
        `)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      // Map vehicle_number and customer_phone from related objects
      const mappedData = (data || []).map(receipt => ({
        ...receipt,
        vehicle_number: receipt.vehicle?.plate_number || '',
        customer_phone: receipt.customer?.phone || ''
      }));

      if (error) {
        console.error('❌ Error fetching rental receipts:', error);
        Sentry.captureException(error, {
          tags: {
            feature: 'rental_payments',
            action: 'fetch_receipts',
            component: 'useRentalPaymentReceipts'
          },
          extra: { companyId, customerId }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'rental_payments',
        message: 'Rental payment receipts fetched successfully',
        level: 'info',
        data: { count: mappedData?.length || 0 }
      });

      return mappedData as RentalPaymentReceipt[];
    },
    enabled: !!companyId,
    staleTime: 5 * 1000, // 5 seconds for real-time updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch ALL rental payment receipts for the company (for monthly summaries)
 */
export const useAllRentalPaymentReceipts = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['all-rental-receipts', companyId],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'rental_payments',
        message: 'Fetching all rental payment receipts',
        level: 'info',
        data: { companyId }
      });

      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .from('rental_payment_receipts')
        .select(`
          *,
          customer:customers!customer_id(
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            phone
          ),
          contract:contracts!contract_id(
            id,
            contract_number,
            contract_amount,
            status
          ),
          vehicle:vehicles!vehicle_id(
            id,
            plate_number,
            make,
            model,
            year
          )
        `)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all rental receipts:', error);
        Sentry.captureException(error, {
          tags: {
            feature: 'rental_payments',
            action: 'fetch_all_receipts',
            component: 'useAllRentalPaymentReceipts'
          },
          extra: { companyId }
        });
        throw error;
      }

      // Map vehicle_number and customer_phone from related objects
      const mappedData = (data || []).map(receipt => ({
        ...receipt,
        vehicle_number: receipt.vehicle?.plate_number || '',
        customer_phone: receipt.customer?.phone || ''
      }));

      Sentry.addBreadcrumb({
        category: 'rental_payments',
        message: 'All rental payment receipts fetched successfully',
        level: 'info',
        data: { count: mappedData?.length || 0 }
      });

      return mappedData as RentalPaymentReceipt[];
    },
    enabled: !!companyId,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch customers with their monthly rent
 * Uses existing customers table with contracts
 */
export const useCustomersWithRental = (searchTerm?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customers-with-rental', companyId, searchTerm],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'rental_payments',
        message: 'Fetching customers with rental',
        level: 'info',
        data: { companyId, hasSearch: !!searchTerm }
      });

      if (!companyId) {
        throw new Error('Company ID is required');
      }

      let query = supabase
        .from('customers')
        .select(`
          id,
          first_name,
          last_name,
          company_name,
          customer_type,
          contracts!inner (
            monthly_amount
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (searchTerm?.trim()) {
        const search = searchTerm.trim();
        query = query.or(
          `first_name.ilike.%${search}%,` +
          `last_name.ilike.%${search}%,` +
          `company_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching customers with rental:', error);
        Sentry.captureException(error, {
          tags: {
            feature: 'rental_payments',
            action: 'fetch_customers_with_rental',
            component: 'useCustomersWithRental'
          },
          extra: { companyId, searchTerm }
        });
        throw error;
      }

      // Transform data to include name and monthly_rent
      const customers: CustomerWithRental[] = (data || []).map((customer) => {
        const name = customer.customer_type === 'individual'
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : customer.company_name || '';
        
        // Get the first active contract's monthly amount
        const monthlyRent = customer.contracts?.[0]?.monthly_amount || 0;

        return {
          id: customer.id,
          name,
          monthly_rent: monthlyRent
        };
      });

      Sentry.addBreadcrumb({
        category: 'rental_payments',
        message: 'Customers with rental fetched successfully',
        level: 'info',
        data: { count: customers.length }
      });

      return customers;
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to get customer payment totals
 */
export const useCustomerPaymentTotals = (customerId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-payment-totals', companyId, customerId],
    queryFn: async () => {
      Sentry.addBreadcrumb({
        category: 'rental_payments',
        message: 'Fetching customer payment totals',
        level: 'info',
        data: { companyId, customerId }
      });

      if (!companyId || !customerId) {
        return null;
      }

      const { data, error } = await supabase
        .rpc('get_customer_rental_payment_totals', {
          customer_id_param: customerId,
          company_id_param: companyId
        });

      if (error) {
        console.error('❌ Error fetching customer totals:', error);
        Sentry.captureException(error, {
          tags: {
            feature: 'rental_payments',
            action: 'fetch_payment_totals',
            component: 'useCustomerPaymentTotals'
          },
          extra: { companyId, customerId }
        });
        throw error;
      }

      Sentry.addBreadcrumb({
        category: 'rental_payments',
        message: 'Customer payment totals fetched successfully',
        level: 'info'
      });

      return data?.[0] as CustomerPaymentTotals;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 10 * 1000, // 10 seconds
  });
};

/**
 * Hook to create a new rental payment receipt
 */
export const useCreateRentalReceipt = () => {
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();
  const { createPayment } = usePaymentOperations({
    autoCreateJournalEntry: true,
    autoUpdateBankBalance: true,
    enableNotifications: false,
  });

  return useMutation({
    mutationFn: async (receipt: Omit<RentalPaymentReceipt, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>) => {
      // Permission check
      if (!hasPermission('rental_payments:create')) {
        const error = new Error('ليس لديك صلاحية لإنشاء إيصالات الإيجار');
        Sentry.captureException(error, {
          tags: { feature: 'rental_payments', action: 'create' },
        });
        throw error;
      }

      if (!companyId) {
        throw new Error('Company ID is required');
      }

      try {
        Sentry.addBreadcrumb({
          category: 'rental_payments',
          message: 'Creating rental receipt',
          level: 'info',
          data: { companyId, customerId: receipt.customer_id },
        });

      console.log('Creating rental receipt with notes support...');
      
      // Direct insert with notes field (bypassing RPC for now to support notes)
      const { data, error } = await supabase
        .from('rental_payment_receipts')
        .insert({
          customer_id: receipt.customer_id,
          customer_name: receipt.customer_name,
          contract_id: receipt.contract_id || null,
          invoice_id: receipt.invoice_id || null,
          vehicle_id: receipt.vehicle_id || null,
          month: receipt.month,
          month_number: receipt.month_number || null,
          fiscal_year: receipt.fiscal_year || null,
          payment_date: receipt.payment_date,
          payment_method: receipt.payment_method || 'cash',
          receipt_number: receipt.receipt_number || null,
          reference_number: receipt.reference_number || null,
          rent_amount: receipt.rent_amount,
          fine: receipt.fine,
          total_paid: receipt.total_paid,
          amount_due: receipt.amount_due,
          pending_balance: receipt.pending_balance,
          payment_status: receipt.payment_status,
          notes: receipt.notes || null,
          company_id: companyId,
          created_by: user?.id || null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating receipt:', error);
        throw error;
      }

        if (data.total_paid > 0) {
          const idempotencyKey = getRentalReceiptPaymentKey(data.id);
          try {
            await createPayment.mutateAsync({
              contract_id: data.contract_id || undefined,
              customer_id: data.customer_id,
              invoice_id: data.invoice_id || undefined,
              amount: data.total_paid,
              payment_date: data.payment_date,
              payment_method: normalizePaymentMethod(data.payment_method),
              notes: [
                `إيصال إيجار ${data.receipt_number || data.id}`,
                data.notes,
              ].filter(Boolean).join(' - '),
              type: 'receipt',
              transaction_type: 'customer_payment',
              payment_status: 'completed',
              currency: 'QAR',
              idempotencyKey,
              registrationMetadata: {
                monthly_amount: data.rent_amount,
                amount_paid: data.total_paid,
                remaining_amount: data.pending_balance,
                payment_month: data.month,
                due_date: data.payment_date,
                late_fee_amount: data.fine,
              },
            });
          } catch (paymentError) {
            const { data: persistedPayment } = await supabase
              .from('payments')
              .select('id')
              .eq('company_id', companyId)
              .eq('reference_number', idempotencyKey)
              .neq('payment_status', 'cancelled')
              .limit(1)
              .maybeSingle();

            if (!persistedPayment) {
              const { error: cleanupError } = await supabase
                .from('rental_payment_receipts')
                .delete()
                .eq('id', data.id)
                .eq('company_id', companyId);
              if (cleanupError) {
                console.error('Failed to rollback rental receipt after payment error:', cleanupError);
              }
              throw paymentError;
            }
          }
        }

        console.log('✅ Receipt and canonical payment created successfully');
        
        Sentry.addBreadcrumb({
          category: 'rental_payments',
          message: 'Rental receipt created successfully',
          level: 'info',
          data: { receiptId: data.id },
        });
        
        return data as RentalPaymentReceipt;
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: 'rental_payments', action: 'create' },
          extra: { receipt },
        });
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Invalidate relevant queries with correct keys
      queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId] });
      queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId, data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', companyId, data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['customer-outstanding-balance', companyId, data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['customer-unpaid-months', companyId, data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['all-rental-receipts', companyId] });
      
      queryClient.invalidateQueries({ queryKey: ['payments', companyId] });
      queryClient.invalidateQueries({ queryKey: ['enhancedJournalEntries', companyId] });
      queryClient.invalidateQueries({ queryKey: ['accountBalances', companyId] });
      queryClient.invalidateQueries({ queryKey: ['trialBalance', companyId] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary', companyId] });
      
      toast.success(
        data.fine > 0
          ? `تم حفظ الإيصال والدفعة وقيدها. غرامة التأخير: ${data.fine.toLocaleString('en-US')} ر.ق`
          : 'تم حفظ الإيصال والدفعة وقيدها المحاسبي بنجاح'
      );
    },
    onError: (error: unknown) => {
      console.error('❌ Error creating receipt:', error);
      const errorMessage = getErrorMessage(error);
      toast.error(`فشل في إضافة الإيصال: ${errorMessage}`);
    }
  });
};

/**
 * Hook to update a rental payment receipt
 */
export const useUpdateRentalReceipt = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentalPaymentReceipt> }) => {
      // Permission check
      if (!hasPermission('rental_payments:update')) {
        const error = new Error('ليس لديك صلاحية لتحديث إيصالات الإيجار');
        Sentry.captureException(error, {
          tags: { feature: 'rental_payments', action: 'update' },
        });
        throw error;
      }
      if (!companyId) throw new Error('Company ID is required');

      try {
        Sentry.addBreadcrumb({
          category: 'rental_payments',
          message: 'Updating rental receipt',
          level: 'info',
          data: { companyId, receiptId: id },
        });

      await assertRentalReceiptHasNoFinancialEffect(id, companyId);
      const { data, error } = await supabase
        .from('rental_payment_receipts')
        .update(toRentalReceiptUpdate(updates))
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating rental receipt:', error);
        throw error;
      }

        Sentry.addBreadcrumb({
          category: 'rental_payments',
          message: 'Rental receipt updated successfully',
          level: 'info',
        });

      return data as RentalPaymentReceipt;
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: 'rental_payments', action: 'update' },
          extra: { receiptId: id, updates },
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId] });
      queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId, data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', companyId, data.customer_id] });
      toast.success('تم تحديث الإيصال بنجاح');
    },
    onError: (error: unknown) => {
      console.error('❌ Error updating receipt:', error);
      toast.error(`فشل في تحديث الإيصال: ${getErrorMessage(error)}`);
    }
  });
};

/**
 * Hook to delete a rental payment receipt
 */
export const useDeleteRentalReceipt = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useMutation({
    mutationFn: async (id: string) => {
      // Permission check
      if (!hasPermission('rental_payments:delete')) {
        const error = new Error('ليس لديك صلاحية لحذف إيصالات الإيجار');
        Sentry.captureException(error, {
          tags: { feature: 'rental_payments', action: 'delete' },
        });
        throw error;
      }
      if (!companyId) throw new Error('Company ID is required');

      try {
        Sentry.addBreadcrumb({
          category: 'rental_payments',
          message: 'Deleting rental receipt',
          level: 'info',
          data: { companyId, receiptId: id },
        });

      await assertRentalReceiptHasNoFinancialEffect(id, companyId);
      const { error } = await supabase
        .from('rental_payment_receipts')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error deleting rental receipt:', error);
        throw error;
      }

        Sentry.addBreadcrumb({
          category: 'rental_payments',
          message: 'Rental receipt deleted successfully',
          level: 'info',
        });

      return id;
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: 'rental_payments', action: 'delete' },
          extra: { receiptId: id },
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-outstanding-balance', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-unpaid-months', companyId] });
      queryClient.invalidateQueries({ queryKey: ['all-rental-receipts', companyId] });
      
      toast.success('تم حذف الإيصال بنجاح');
    },
    onError: (error: unknown) => {
      console.error('❌ Error deleting receipt:', error);
      toast.error(`فشل في حذف الإيصال: ${getErrorMessage(error)}`);
    }
  });
};

/**
 * Hook to get customer outstanding balance
 */
export const useCustomerOutstandingBalance = (customerId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-outstanding-balance', companyId, customerId],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'Fetching customer outstanding balance', level: 'info', data: { companyId, customerId } });
      if (!companyId || !customerId) {
        return null;
      }

      const { data, error } = await supabase
        .rpc('get_customer_outstanding_balance', {
          customer_id_param: customerId,
          company_id_param: companyId
        });

      if (error) {
        console.error('❌ Error fetching outstanding balance:', error);
        Sentry.captureException(error, { tags: { feature: 'rental_payments', action: 'fetch_outstanding_balance', component: 'useCustomerOutstandingBalance' }, extra: { companyId, customerId } });
        throw error;
      }
      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'Outstanding balance fetched', level: 'info' });
      return data?.[0] as CustomerOutstandingBalance;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 10 * 1000, // 10 seconds
  });
};

/**
 * Hook to get customer unpaid months list
 */
export const useCustomerUnpaidMonths = (customerId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-unpaid-months', companyId, customerId],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'Fetching customer unpaid months', level: 'info', data: { companyId, customerId } });
      if (!companyId || !customerId) {
        return [];
      }

      const { data, error } = await supabase
        .rpc('get_customer_unpaid_months', {
          customer_id_param: customerId,
          company_id_param: companyId
        });

      if (error) {
        console.error('❌ Error fetching unpaid months:', error);
        Sentry.captureException(error, { tags: { feature: 'rental_payments', action: 'fetch_unpaid_months', component: 'useCustomerUnpaidMonths' }, extra: { companyId, customerId } });
        throw error;
      }
      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'Unpaid months fetched', level: 'info', data: { count: data?.length || 0 } });
      return (data || []) as UnpaidMonth[];
    },
    enabled: !!companyId && !!customerId,
    staleTime: 10 * 1000, // 10 seconds
  });
};

/**
 * Hook to get all customers with outstanding balance
 */
export const useAllCustomersOutstandingBalance = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['all-customers-outstanding-balance', companyId],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'Fetching all customers outstanding balance', level: 'info', data: { companyId } });
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .rpc('get_all_customers_outstanding_balance', {
          company_id_param: companyId
        });

      if (error) {
        console.error('❌ Error fetching all customers outstanding balance:', error);
        Sentry.captureException(error, { tags: { feature: 'rental_payments', action: 'fetch_all_outstanding', component: 'useAllCustomersOutstandingBalance' }, extra: { companyId } });
        throw error;
      }
      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'All customers outstanding balance fetched', level: 'info', data: { count: data?.length || 0 } });
      return (data || []).map(mapOutstandingBalanceSummary);
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Customer vehicle information
 */
export interface CustomerVehicle extends VehicleInfo {
  contract_id: string;
  monthly_amount: number;
  contract_start_date: string;
  contract_end_date: string;
  contract_status: string;
}

/**
 * Hook to fetch customer's vehicles from active contracts
 */
export const useCustomerVehicles = (customerId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-vehicles', companyId, customerId],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'Fetching customer vehicles', level: 'info', data: { companyId, customerId } });
      if (!companyId || !customerId) {
        return [];
      }

      // Fetch active contracts first
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('id, monthly_amount, start_date, end_date, status, vehicle_id')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .eq('status', 'active')
        .not('vehicle_id', 'is', null);

      if (contractsError) {
        console.error('❌ Error fetching customer contracts:', contractsError);
        throw contractsError;
      }

      if (!contractsData || contractsData.length === 0) {
        return [];
      }

      // Extract vehicle IDs
      const vehicleIds = contractsData
        .map((contract) => contract.vehicle_id)
        .filter((id): id is string => id !== null);

      if (vehicleIds.length === 0) {
        return [];
      }

      // Fetch vehicle details separately
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, year, color_ar')
        .in('id', vehicleIds);

      if (vehiclesError) {
        console.error('❌ Error fetching vehicles:', vehiclesError);
        Sentry.captureException(vehiclesError, { tags: { feature: 'rental_payments', action: 'fetch_customer_vehicles', component: 'useCustomerVehicles' }, extra: { companyId, customerId } });
        throw vehiclesError;
      }

      // Combine contracts and vehicles data
      const vehiclesMap = new Map((vehiclesData || []).map((vehicle) => [vehicle.id, vehicle] as const));
      
      const vehicles: CustomerVehicle[] = contractsData
        .map((contract): CustomerVehicle | null => {
          if (!contract.vehicle_id) return null;
          const vehicle = vehiclesMap.get(contract.vehicle_id);
          if (!vehicle) return null;
          
          return {
            id: vehicle.id,
            plate_number: vehicle.plate_number || '',
            make: vehicle.make || '',
            model: vehicle.model || '',
            year: vehicle.year ?? undefined,
            color_ar: vehicle.color_ar ?? undefined,
            contract_id: contract.id,
            monthly_amount: contract.monthly_amount || 0,
            contract_start_date: contract.start_date,
            contract_end_date: contract.end_date,
            contract_status: contract.status
          };
        })
        .filter((vehicle): vehicle is CustomerVehicle => vehicle !== null);

      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'Customer vehicles fetched', level: 'info', data: { count: vehicles.length } });
      return vehicles;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 30 * 1000, // 30 seconds
  });
};
