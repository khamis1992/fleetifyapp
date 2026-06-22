import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface PaymentStatus {
  is_overdue: boolean
  overdue_amount: number
  days_overdue: number
  last_payment_date: string | null
}

export const useContractPaymentStatus = (contractId: string) => {
  return useQuery({
    queryKey: ["contract-payment-status", contractId],
    queryFn: async (): Promise<PaymentStatus | null> => {
      if (!contractId) return null
      
      // Get contract details
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single()
      
      if (contractError || !contract) return null
      
      // Get payments for this contract
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('contract_id', contractId)
        .eq('payment_status', 'completed')
        .eq('payment_type', 'receipt')
      
      if (paymentsError) return null
      
      const totalPaid = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0
      const monthsElapsed = Math.floor((new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
      const expectedPaid = contract.monthly_amount * Math.max(0, monthsElapsed)
      
      const lastPayment = payments?.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]
      
      const isOverdue = totalPaid < expectedPaid
      const daysOverdue = lastPayment 
        ? Math.floor((new Date().getTime() - new Date(lastPayment.payment_date).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((new Date().getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        is_overdue: isOverdue,
        overdue_amount: Math.max(0, expectedPaid - totalPaid),
        days_overdue: isOverdue ? daysOverdue : 0,
        last_payment_date: lastPayment?.payment_date || null
      }
    },
    enabled: !!contractId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}

export const useManualContractStatusUpdate = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async () => {
      // Call the edge function to update contract statuses
      const { error } = await supabase.functions.invoke('process-contract-renewals')
      
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      // Invalidate contract queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["contracts"] })
      queryClient.invalidateQueries({ queryKey: ["active-contracts"] })
      
      toast({
        title: "تم تحديث حالات العقود",
        description: "تم فحص وتحديث حالات العقود بنجاح",
      })
    },
    onError: (error) => {
      console.error("Error updating contract statuses:", error)
      toast({
        title: "خطأ في تحديث الحالات",
        description: "حدث خطأ أثناء تحديث حالات العقود",
        variant: "destructive",
      })
    }
  })
}