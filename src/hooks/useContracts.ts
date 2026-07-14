import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'
import * as Sentry from '@sentry/react'
import type { Database } from '@/integrations/supabase/types'

type ContractRow = Database['public']['Tables']['contracts']['Row'];

export interface Contract extends ContractRow {
  linked_payments_amount?: number;
  customer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    first_name_ar: string | null;
    last_name_ar: string | null;
    phone: string;
    email: string | null;
  } | null;
  vehicle?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
    year: number;
    status: Database['public']['Enums']['vehicle_status'] | null;
  } | null;
}

export const useContracts = (customerId?: string, vehicleId?: string, overrideCompanyId?: string) => {
  const { companyId, validateCompanyAccess, getQueryKey } = useUnifiedCompanyAccess()
  
  // Use provided company ID or fall back to user's company
  const targetCompanyId = overrideCompanyId || companyId
  
  return useQuery({
    queryKey: getQueryKey(["contracts"], [targetCompanyId, customerId, vehicleId]),
    queryFn: async ({ signal }) => {
      Sentry.addBreadcrumb({ category: 'contracts', message: 'Fetching contracts', level: 'info', data: { targetCompanyId, customerId, vehicleId } });
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
        .abortSignal(signal)

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
        Sentry.captureException(error, { tags: { feature: 'contracts', action: 'fetch_contracts' } });
        throw error
      }

      // Optimized: Fetch all payments in a single query instead of N+1
      if (!data || data.length === 0) {
        Sentry.addBreadcrumb({ category: 'contracts', message: 'No contracts found', level: 'info' });
        return []
      }

      const contractIds = data.map(c => c.id)

      // Single query to get all payments for all contracts with abort signal
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('contract_id, amount')
        .in('contract_id', contractIds)
        .eq('payment_status', 'completed')
        .abortSignal(signal)

      // Group payments by contract_id
      const paymentsByContract = (paymentsData || []).reduce((acc, payment) => {
        if (!payment.contract_id) return acc
        if (!acc[payment.contract_id]) {
          acc[payment.contract_id] = 0
        }
        acc[payment.contract_id] += payment.amount || 0
        return acc
      }, {} as Record<string, number>)

      // ✅ الـ trigger يحسب total_paid تلقائياً من الدفعات
      // لا حاجة لإضافة linked_payments_amount - total_paid يحتوي على المجموع الصحيح
      const contractsWithPayments = data.map(contract => ({
        ...contract,
        balance_due:
          contract.balance_due ??
          Math.max(
            Number(contract.contract_amount || 0) - Number(contract.total_paid || 0),
            0
          ),
        linked_payments_amount: paymentsByContract[contract.id] || 0, // للعرض فقط
        // total_paid و balance_due محسوبة من الـ trigger - لا تعدل هنا
      }))

      Sentry.addBreadcrumb({ category: 'contracts', message: 'Contracts fetched successfully', level: 'info', data: { count: contractsWithPayments.length } });
      return contractsWithPayments
    },
    enabled: !!targetCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000
  })
}

export const useActiveContracts = (customerId?: string, vendorId?: string, overrideCompanyId?: string) => {
  const { companyId, getQueryKey, validateCompanyAccess } = useUnifiedCompanyAccess()
  
  // Use provided company ID or fall back to user's company
  const targetCompanyId = overrideCompanyId || companyId
  
  return useQuery({
    queryKey: getQueryKey(["active-contracts"], [customerId, vendorId, targetCompanyId]),
    queryFn: async ({ signal }): Promise<Contract[]> => {
      Sentry.addBreadcrumb({ category: 'contracts', message: 'Fetching active contracts', level: 'info', data: { targetCompanyId, customerId, vendorId } });
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
        .abortSignal(signal)

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
        Sentry.captureException(error, { tags: { feature: 'contracts', action: 'fetch_contracts' } });
        throw error
      }

      // Optimized: Fetch all payments in a single query instead of N+1
      if (!data || data.length === 0) {
        Sentry.addBreadcrumb({ category: 'contracts', message: 'No contracts found', level: 'info' });
        return []
      }

      const contractIds = data.map(c => c.id)

      // Single query to get all payments for all contracts with abort signal
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('contract_id, amount')
        .in('contract_id', contractIds)
        .eq('payment_status', 'completed')
        .abortSignal(signal)

      // Group payments by contract_id
      const paymentsByContract = (paymentsData || []).reduce((acc, payment) => {
        if (!payment.contract_id) return acc
        if (!acc[payment.contract_id]) {
          acc[payment.contract_id] = 0
        }
        acc[payment.contract_id] += payment.amount || 0
        return acc
      }, {} as Record<string, number>)

      // ✅ الـ trigger يحسب total_paid تلقائياً من الدفعات
      const contractsWithPayments = data.map(contract => ({
        ...contract,
        linked_payments_amount: paymentsByContract[contract.id] || 0, // للعرض فقط
        // total_paid و balance_due محسوبة من الـ trigger - لا تعدل هنا
      }))

      Sentry.addBreadcrumb({ category: 'contracts', message: 'Active contracts fetched successfully', level: 'info', data: { count: contractsWithPayments.length } });
      return contractsWithPayments.map(contract => ({
        ...contract,
        balance_due:
          contract.balance_due ??
          Math.max(
            Number(contract.contract_amount || 0) - Number(contract.total_paid || 0),
            0
          ),
      }))
    },
    enabled: !!targetCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000
  })
}
