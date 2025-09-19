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
  renewal_terms?: any;
  vehicle_returned?: boolean;
  last_renewal_check?: string;
  last_payment_check_date?: string;
  suspension_reason?: string;
  expired_at?: string;
  created_by?: string;
  total_paid?: number;
  balance_due?: number;
  linked_payments_amount?: number;
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
        .select("*")
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

      // Fetch linked payments amounts for each contract
      const contractsWithPayments = await Promise.all(
        (data || []).map(async (contract) => {
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('amount')
            .eq('contract_id', contract.id)
            .eq('payment_status', 'completed')

          const linkedPaymentsAmount = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
          
          return {
            ...contract,
            linked_payments_amount: linkedPaymentsAmount,
            total_paid: (contract.total_paid || 0) + linkedPaymentsAmount,
            balance_due: contract.contract_amount - ((contract.total_paid || 0) + linkedPaymentsAmount)
          }
        })
      )

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
        .select("*")
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
      
      // Fetch linked payments amounts for each contract
      const contractsWithPayments = await Promise.all(
        (data || []).map(async (contract) => {
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('amount')
            .eq('contract_id', contract.id)
            .eq('payment_status', 'completed')

          const linkedPaymentsAmount = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
          
          return {
            ...contract,
            linked_payments_amount: linkedPaymentsAmount,
            total_paid: (contract.total_paid || 0) + linkedPaymentsAmount,
            balance_due: contract.contract_amount - ((contract.total_paid || 0) + linkedPaymentsAmount)
          }
        })
      )

      return contractsWithPayments
    },
    enabled: !!targetCompanyId && !!(customerId || vendorId),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}