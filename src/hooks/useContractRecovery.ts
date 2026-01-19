import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'
import { createContractJournalEntryManual } from '@/utils/contractJournalEntry'

interface ContractWithoutJournalEntry {
  id: string
  contract_number: string
  customer_name: string
  contract_amount: number
  contract_date: string
  status: string
}

export const useContractRecovery = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()

  // البحث عن العقود التي لا تحتوي على قيود محاسبية
  const { data: contractsWithoutJournalEntries, isLoading } = useQuery({
    queryKey: ['contracts-without-journal-entries', companyId],
    queryFn: async () => {
      if (!companyId) return []

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          contract_amount,
          contract_date,
          status,
          customers!inner(
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['active', 'draft'])
        .is('journal_entry_id', null)
        .order('contract_date', { ascending: false })

      if (error) {
        console.error('Failed to fetch contracts without journal entries:', error)
        throw error
      }

      return contracts?.map(contract => ({
        id: contract.id,
        contract_number: contract.contract_number,
        customer_name: contract.customers?.customer_type === 'individual'
          ? `${contract.customers.first_name} ${contract.customers.last_name}`
          : contract.customers?.company_name || 'عميل غير محدد',
        contract_amount: contract.contract_amount,
        contract_date: contract.contract_date,
        status: contract.status
      })) as ContractWithoutJournalEntry[] || []
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // إنشاء قيد محاسبي لعقد محدد
  const createJournalEntryMutation = useMutation({
    mutationFn: async (contractId: string) => {
      if (!companyId) throw new Error('Company ID is required')

      try {
        const result = await createContractJournalEntryManual(contractId, companyId)
        
        if (!result.success) {
          throw new Error(result.error || 'فشل في إنشاء القيد المحاسبي')
        }

        return result
      } catch (error: unknown) {
        console.error('Failed to create journal entry for contract:', contractId, error)
        throw error
      }
    },
    onSuccess: (result, contractId) => {
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['contracts-without-journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })

      toast.success(`تم إنشاء القيد المحاسبي بنجاح: ${result.journal_entry_number}`)
    },
    onError: (error: any, contractId) => {
      console.error('Failed to create journal entry:', error)
      toast.error(`فشل في إنشاء القيد المحاسبي: ${error.message}`)
    }
  })

  // إنشاء قيود محاسبية لجميع العقود المفقودة
  const createAllJournalEntriesMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !contractsWithoutJournalEntries?.length) {
        throw new Error('لا توجد عقود تحتاج لقيود محاسبية')
      }

      const results = []
      const errors = []

      for (const contract of contractsWithoutJournalEntries) {
        try {
          const result = await createContractJournalEntryManual(contract.id, companyId)
          
          if (result.success) {
            results.push({
              contractId: contract.id,
              contractNumber: contract.contract_number,
              journalEntryNumber: result.journal_entry_number,
              success: true
            })
          } else {
            errors.push({
              contractId: contract.id,
              contractNumber: contract.contract_number,
              error: result.error || 'فشل غير معروف',
              success: false
            })
          }
        } catch (error: unknown) {
          errors.push({
            contractId: contract.id,
            contractNumber: contract.contract_number,
            error: error.message || 'فشل غير معروف',
            success: false
          })
        }

        // انتظار قصير بين العمليات لتجنب إرهاق الخادم
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      return { results, errors, total: contractsWithoutJournalEntries.length }
    },
    onSuccess: (result) => {
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['contracts-without-journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })

      const successCount = result.results.length
      const errorCount = result.errors.length

      if (successCount > 0) {
        toast.success(`تم إنشاء ${successCount} قيد محاسبي بنجاح`)
      }
      
      if (errorCount > 0) {
        toast.warning(`فشل في إنشاء ${errorCount} من القيود المحاسبية`)
      }
    },
    onError: (error: unknown) => {
      console.error('Failed to create all journal entries:', error)
      toast.error(`فشل في عملية الإنشاء الجماعي: ${error.message}`)
    }
  })

  return {
    contractsWithoutJournalEntries: contractsWithoutJournalEntries || [],
    isLoading,
    createJournalEntry: createJournalEntryMutation.mutate,
    isCreatingJournalEntry: createJournalEntryMutation.isPending,
    createAllJournalEntries: createAllJournalEntriesMutation.mutate,
    isCreatingAllJournalEntries: createAllJournalEntriesMutation.isPending,
    hasContractsWithoutJournalEntries: (contractsWithoutJournalEntries?.length || 0) > 0
  }
}