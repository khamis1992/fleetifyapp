// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';
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

      if (error) {
        console.error('❌ Error fetching rental receipts:', error);
        throw error;
      }

      return (data || []) as RentalPaymentReceipt[];
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
        throw error;
      }

      return (data || []) as RentalPaymentReceipt[];
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
        throw error;
      }

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
          ? `تم إضافة الإيصال بنجاح. غرامة تأخير: ${data.fine.toLocaleString('ar-QA')} ريال`
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

      return vehicles;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 30 * 1000, // 30 seconds
  });
};