import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import * as Sentry from '@sentry/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { createJournalEntryForRentalPayment, deleteJournalEntryForRentalPayment } from './useRentalPaymentJournalIntegration';

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
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  vehicle_id?: string;
  contract_id?: string;
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
            status,
            vehicle_number
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
        vehicle_number: receipt.contract?.vehicle_number || receipt.vehicle?.plate_number || '',
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
            status,
            vehicle_number
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
        vehicle_number: receipt.contract?.vehicle_number || receipt.vehicle?.plate_number || '',
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
      const customers: CustomerWithRental[] = (data || []).map((customer: unknown) => {
        const name = customer.customer_type === 'individual'
          ? `${customer.first_name} ${customer.last_name}`
          : customer.company_name;
        
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
          month: receipt.month,
          payment_date: receipt.payment_date,
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

        console.log('✅ Receipt created successfully');
        
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
      
      // Create journal entry for this payment
      if (companyId) {
        const journalResult = await createJournalEntryForRentalPayment(companyId, {
          payment_id: data.id,
          customer_name: data.customer_name,
          payment_date: data.payment_date,
          rent_amount: data.rent_amount,
          fine: data.fine,
          total_paid: data.total_paid,
          month: data.month
        });
        
        if (journalResult.success) {
          console.log('✅ Journal entry created for payment:', journalResult.entry_id);
          // Invalidate general ledger queries
          queryClient.invalidateQueries({ queryKey: ['enhancedJournalEntries', companyId] });
          queryClient.invalidateQueries({ queryKey: ['accountBalances', companyId] });
          queryClient.invalidateQueries({ queryKey: ['trialBalance', companyId] });
          queryClient.invalidateQueries({ queryKey: ['financialSummary', companyId] });
        } else {
          console.error('❌ Failed to create journal entry:', journalResult.error);
          toast.warning(`تم إضافة الإيصال لكن فشل إنشاء القيد المحاسبي: ${journalResult.error}`);
        }
      }
      
      toast.success(
        data.fine > 0
          ? `تم إضافة الإيصال بنجاح. غرامة تأخير: ${data.fine.toLocaleString('en-US')} ريال`
          : 'تم إضافة الإيصال بنجاح'
      );
    },
    onError: (error: unknown) => {
      console.error('❌ Error creating receipt:', error);
      const errorMessage = error?.message || error?.hint || error?.details || 'خطأ غير معروف';
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

      try {
        Sentry.addBreadcrumb({
          category: 'rental_payments',
          message: 'Updating rental receipt',
          level: 'info',
          data: { companyId, receiptId: id },
        });

      const { data, error } = await supabase
        .from('rental_payment_receipts')
        .update(updates)
        .eq('id', id)
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
      toast.error(`فشل في تحديث الإيصال: ${error.message}`);
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

      try {
        Sentry.addBreadcrumb({
          category: 'rental_payments',
          message: 'Deleting rental receipt',
          level: 'info',
          data: { companyId, receiptId: id },
        });

      const { error } = await supabase
        .from('rental_payment_receipts')
        .delete()
        .eq('id', id);

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
    onSuccess: async (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['rental-receipts', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-payment-totals', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-outstanding-balance', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customer-unpaid-months', companyId] });
      queryClient.invalidateQueries({ queryKey: ['all-rental-receipts', companyId] });
      
      // Delete associated journal entry
      const journalResult = await deleteJournalEntryForRentalPayment(deletedId);
      if (journalResult.success) {
        console.log('✅ Journal entry deleted for payment:', deletedId);
        // Invalidate general ledger queries
        queryClient.invalidateQueries({ queryKey: ['enhancedJournalEntries', companyId] });
        queryClient.invalidateQueries({ queryKey: ['accountBalances', companyId] });
        queryClient.invalidateQueries({ queryKey: ['trialBalance', companyId] });
        queryClient.invalidateQueries({ queryKey: ['financialSummary', companyId] });
      } else if (journalResult.error) {
        console.error('❌ Failed to delete journal entry:', journalResult.error);
      }
      
      toast.success('تم حذف الإيصال بنجاح');
    },
    onError: (error: unknown) => {
      console.error('❌ Error deleting receipt:', error);
      toast.error(`فشل في حذف الإيصال: ${error.message}`);
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
        return [];Error('Company ID is required');
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
      return (data || []) as CustomerBalanceSummary[];
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
        .map((c: any) => c.vehicle_id)
        .filter((id: any) => id != null);

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
      const vehiclesMap = new Map((vehiclesData || []).map((v: any) => [v.id, v]));
      
      const vehicles: CustomerVehicle[] = contractsData
        .map((contract: unknown) => {
          const vehicle = vehiclesMap.get(contract.vehicle_id);
          if (!vehicle) return null;
          
          return {
            id: vehicle.id,
            plate_number: vehicle.plate_number || '',
            make: vehicle.make || '',
            model: vehicle.model || '',
            year: vehicle.year,
            color_ar: vehicle.color_ar,
            contract_id: contract.id,
            monthly_amount: contract.monthly_amount || 0,
            contract_start_date: contract.start_date,
            contract_end_date: contract.end_date,
            contract_status: contract.status
          };
        })
        .filter((v: any) => v !== null) as CustomerVehicle[];

      Sentry.addBreadcrumb({ category: 'rental_payments', message: 'Customer vehicles fetched', level: 'info', data: { count: vehicles.length } });
      return vehicles;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 30 * 1000, // 30 seconds
  });
};