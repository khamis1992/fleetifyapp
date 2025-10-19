import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'

export interface Contract {
  id: string;
  company_id: string;
  customer_id: string;
  vehicle_id?: string;
  contract_number: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  monthly_amount: number;
  status: string;
  contract_type: string;
  description?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
  cost_center_id?: string;
  account_id?: string;
  journal_entry_id?: string;
  auto_renew_enabled?: boolean;
  renewal_terms?: Record<string, unknown>;
  vehicle_returned?: boolean;
  last_renewal_check?: string;
  last_payment_check_date?: string;
  suspension_reason?: string;
  expired_at?: string;
  created_by?: string;
  total_paid?: number;
  balance_due?: number;
  linked_payments_amount?: number;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
    phone?: string;
    email?: string;
  };
  vehicle?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
    year?: number;
    status: string;
  };
}

export const useContracts = (customerId?: string, vehicleId?: string, overrideCompanyId?: string) => {
  const { companyId, validateCompanyAccess, getQueryKey } = useUnifiedCompanyAccess()
  
  // Use provided company ID or fall back to user's company
  const targetCompanyId = overrideCompanyId || companyId
  
  return useQuery({
    queryKey: getQueryKey(["contracts"], [targetCompanyId, customerId, vehicleId]),
    queryFn: async () => {
      if (!targetCompanyId) {
        throw new Error("No company access available")
      }
      
      // Validate access to the target company
      if (overrideCompanyId) {
        validateCompanyAccess(overrideCompanyId)
      }

      let query = supabase
        .from("contracts")
        .select(`
          *,
          customer:customers!customer_id(
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            phone,
            email
          ),
          vehicle:vehicles!vehicle_id(
            id,
            plate_number,
            make,
            model,
            year,
            status
          )
        `)
        .eq("company_id", targetCompanyId)
        .order("created_at", { ascending: false })

      // Apply filters if provided
      if (customerId) {
        query = query.eq("customer_id", customerId)
      }
      
      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching contracts:", error)
        throw error
      }

      // Optimized: Fetch all payments in a single query instead of N+1
      if (!data || data.length === 0) {
        return []
      }

      const contractIds = data.map(c => c.id)
      
      // Single query to get all payments for all contracts
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('contract_id, amount')
        .in('contract_id', contractIds)
        .eq('payment_status', 'completed')
      
      // Group payments by contract_id
      const paymentsByContract = (paymentsData || []).reduce((acc, payment) => {
        if (!acc[payment.contract_id]) {
          acc[payment.contract_id] = 0
        }
        acc[payment.contract_id] += payment.amount || 0
        return acc
      }, {} as Record<string, number>)
      
      // Map contracts with their payment totals
      const contractsWithPayments = data.map(contract => ({
        ...contract,
        linked_payments_amount: paymentsByContract[contract.id] || 0,
        total_paid: (contract.total_paid || 0) + (paymentsByContract[contract.id] || 0),
        balance_due: contract.contract_amount - ((contract.total_paid || 0) + (paymentsByContract[contract.id] || 0))
      }))

      return contractsWithPayments
    },
    enabled: !!targetCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}

export const useActiveContracts = (customerId?: string, vendorId?: string, overrideCompanyId?: string) => {
  const { companyId, getQueryKey, validateCompanyAccess } = useUnifiedCompanyAccess()
  
  // Use provided company ID or fall back to user's company
  const targetCompanyId = overrideCompanyId || companyId
  
  return useQuery({
    queryKey: getQueryKey(["active-contracts"], [customerId, vendorId, targetCompanyId]),
    queryFn: async (): Promise<Contract[]> => {
      if (!targetCompanyId) {
        throw new Error("No company access available")
      }
      
      // Validate access to the target company
      if (overrideCompanyId) {
        validateCompanyAccess(overrideCompanyId)
      }
      
      let query = supabase
        .from("contracts")
        .select(`
          *,
          customer:customers!customer_id(
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            phone,
            email
          ),
          vehicle:vehicles!vehicle_id(
            id,
            plate_number,
            make,
            model,
            year,
            status
          )
        `)
        .eq("company_id", targetCompanyId)
        .eq("status", "active")
        .order("contract_date", { ascending: false })

      if (customerId) {
        query = query.eq("customer_id", customerId)
      } else if (vendorId) {
        // Note: contracts table may not have vendor_id column yet
        // This would need to be added if needed for vendor contracts
        return []
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error("Error fetching contracts:", error)
        throw error
      }
      
      // Optimized: Fetch all payments in a single query instead of N+1
      if (!data || data.length === 0) {
        return []
      }

      const contractIds = data.map(c => c.id)
      
      // Single query to get all payments for all contracts
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('contract_id, amount')
        .in('contract_id', contractIds)
        .eq('payment_status', 'completed')
      
      // Group payments by contract_id
      const paymentsByContract = (paymentsData || []).reduce((acc, payment) => {
        if (!acc[payment.contract_id]) {
          acc[payment.contract_id] = 0
        }
        acc[payment.contract_id] += payment.amount || 0
        return acc
      }, {} as Record<string, number>)
      
      // Map contracts with their payment totals
      const contractsWithPayments = data.map(contract => ({
        ...contract,
        linked_payments_amount: paymentsByContract[contract.id] || 0,
        total_paid: (contract.total_paid || 0) + (paymentsByContract[contract.id] || 0),
        balance_due: contract.contract_amount - ((contract.total_paid || 0) + (paymentsByContract[contract.id] || 0))
      }))

      return contractsWithPayments
    },
    enabled: !!targetCompanyId && !!(customerId || vendorId),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}