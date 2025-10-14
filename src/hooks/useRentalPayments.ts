import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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
  const paymentDate = new Date(paymentDateStr);
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
    queryKey: ['rental-payment-receipts', companyId, customerId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // @ts-expect-error - rental_payment_receipts table may not exist, using payments table instead
      let query = supabase
        .from('rental_payment_receipts')
        .select('*')
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching rental receipts:', error);
        throw error;
      }

      return (data || []) as RentalPaymentReceipt[];
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch ALL rental payment receipts for the company (for monthly summaries)
 */
export const useAllRentalPaymentReceipts = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['all-rental-payment-receipts', companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // @ts-expect-error - rental_payment_receipts table may not exist, using payments table instead
      const { data, error } = await supabase
        .from('rental_payment_receipts')
        .select('*')
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all rental receipts:', error);
        throw error;
      }

      return (data || []) as RentalPaymentReceipt[];
    },
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 minute
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
        throw error;
      }

      // Transform data to include name and monthly_rent
      const customers: CustomerWithRental[] = (data || []).map((customer: any) => {
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

      return customers;
    },
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Hook to get customer payment totals
 */
export const useCustomerPaymentTotals = (customerId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-rental-totals', companyId, customerId],
    queryFn: async () => {
      if (!companyId || !customerId) {
        return null;
      }

      // @ts-expect-error - RPC function may not exist yet
      const { data, error } = await supabase
        .rpc('get_customer_rental_payment_totals', {
          customer_id_param: customerId,
          company_id_param: companyId
        });

      if (error) {
        console.error('❌ Error fetching customer totals:', error);
        throw error;
      }

      return data?.[0] as CustomerPaymentTotals;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 30 * 1000,
  });
};

/**
 * Hook to create a new rental payment receipt
 */
export const useCreateRentalReceipt = () => {
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (receipt: Omit<RentalPaymentReceipt, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>) => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

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
      return data as RentalPaymentReceipt;

      console.log('RPC result:', { rpcResult, rpcError });

      if (rpcError) {
        console.error('❌ RPC function error:', rpcError);
        throw new Error(`Failed to create receipt: ${rpcError.message || rpcError.code}`);
      }

      if (!rpcResult || !rpcResult.success) {
        throw new Error(rpcResult?.error || 'Failed to create receipt');
      }

      console.log('✅ Receipt created successfully via RPC');
      
      // Return the receipt data
      return {
        id: rpcResult.id,
        customer_id: rpcResult.customer_id,
        customer_name: rpcResult.customer_name,
        month: rpcResult.month,
        payment_date: rpcResult.payment_date,
        rent_amount: rpcResult.rent_amount,
        fine: rpcResult.fine,
        total_paid: rpcResult.total_paid,
        company_id: rpcResult.company_id,
        created_by: rpcResult.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as RentalPaymentReceipt;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['rental-payment-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-rental-totals', companyId, data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['customer-outstanding-balance', companyId, data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['customer-unpaid-months', companyId, data.customer_id] });
      
      toast.success(
        data.fine > 0
          ? `تم إضافة الإيصال بنجاح. غرامة تأخير: ${data.fine.toLocaleString('ar-QA')} ريال`
          : 'تم إضافة الإيصال بنجاح'
      );
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RentalPaymentReceipt> }) => {
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

      return data as RentalPaymentReceipt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rental-payment-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-rental-totals', companyId, data.customer_id] });
      toast.success('تم تحديث الإيصال بنجاح');
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rental_payment_receipts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting rental receipt:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-payment-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-rental-totals'] });
      queryClient.invalidateQueries({ queryKey: ['customer-outstanding-balance'] });
      toast.success('تم حذف الإيصال بنجاح');
    },
    onError: (error: any) => {
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
        throw error;
      }

      return data?.[0] as CustomerOutstandingBalance;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 30 * 1000,
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
        throw error;
      }

      return (data || []) as UnpaidMonth[];
    },
    enabled: !!companyId && !!customerId,
    staleTime: 30 * 1000,
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
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .rpc('get_all_customers_outstanding_balance', {
          company_id_param: companyId
        });

      if (error) {
        console.error('❌ Error fetching all customers outstanding balance:', error);
        throw error;
      }

      return (data || []) as CustomerBalanceSummary[];
    },
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 minute
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
      if (!companyId || !customerId) {
        return [];
      }

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          monthly_amount,
          start_date,
          end_date,
          status,
          vehicle_id,
          vehicles (
            id,
            plate_number,
            make,
            model,
            year,
            color_ar
          )
        `)
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .eq('status', 'active')
        .not('vehicle_id', 'is', null);

      if (error) {
        console.error('❌ Error fetching customer vehicles:', error);
        throw error;
      }

      // Transform to CustomerVehicle format
      const vehicles: CustomerVehicle[] = (data || []).map((contract: any) => ({
        id: contract.vehicles?.id || '',
        plate_number: contract.vehicles?.plate_number || '',
        make: contract.vehicles?.make || '',
        model: contract.vehicles?.model || '',
        year: contract.vehicles?.year,
        color_ar: contract.vehicles?.color_ar,
        contract_id: contract.id,
        monthly_amount: contract.monthly_amount || 0,
        contract_start_date: contract.start_date,
        contract_end_date: contract.end_date,
        contract_status: contract.status
      }));

      return vehicles;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 60 * 1000, // 1 minute
  });
};
