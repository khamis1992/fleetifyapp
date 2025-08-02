import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'

export interface PendingJournalEntry {
  id: string
  company_id: string
  contract_id: string
  entry_type: string
  retry_count: number
  max_retries: number
  last_error?: string
  created_at: string
  next_retry_at: string
  processed_at?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  metadata: any
  priority: number
  contract?: {
    contract_number: string
    customer_id: string
    contract_amount: number
  }
}

export const usePendingJournalEntries = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()

  // جلب القيود المعلقة للشركة
  const { data: pendingEntries, isLoading, error } = useQuery({
    queryKey: ['pending-journal-entries', companyId],
    queryFn: async () => {
      if (!companyId) return []

      const { data, error } = await supabase
        .from('pending_journal_entries')
        .select(`
          *,
          contract:contracts(
            contract_number,
            customer_id,
            contract_amount
          )
        `)
        .eq('company_id', companyId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch pending journal entries:', error)
        throw error
      }

      return data as PendingJournalEntry[]
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // معالجة القيود المعلقة يدوياً
  const processPendingEntriesMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')

      const { data, error } = await supabase.functions.invoke('process-pending-journal-entries')

      if (error) {
        console.error('Failed to process pending entries:', error)
        throw error
      }

      return data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })

      if (result.processed > 0) {
        toast.success(`تم معالجة ${result.processed} قيد محاسبي بنجاح`)
      }

      if (result.failed > 0) {
        toast.warning(`فشل في معالجة ${result.failed} قيد محاسبي`)
      }

      if (result.processed === 0 && result.failed === 0) {
        toast.info('لا توجد قيود معلقة للمعالجة')
      }
    },
    onError: (error: any) => {
      console.error('Failed to process pending entries:', error)
      toast.error('فشل في معالجة القيود المعلقة')
    }
  })

  // إلغاء قيد معلق
  const cancelPendingEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('pending_journal_entries')
        .update({ status: 'cancelled' })
        .eq('id', entryId)

      if (error) {
        console.error('Failed to cancel pending entry:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-journal-entries'] })
      toast.success('تم إلغاء القيد المعلق')
    },
    onError: (error: any) => {
      console.error('Failed to cancel pending entry:', error)
      toast.error('فشل في إلغاء القيد المعلق')
    }
  })

  // إعادة محاولة قيد معين
  const retryPendingEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('pending_journal_entries')
        .update({ 
          status: 'pending',
          next_retry_at: new Date().toISOString(),
          retry_count: 0
        })
        .eq('id', entryId)

      if (error) {
        console.error('Failed to retry pending entry:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-journal-entries'] })
      toast.success('تم إعادة جدولة القيد للمحاولة مرة أخرى')
    },
    onError: (error: any) => {
      console.error('Failed to retry pending entry:', error)
      toast.error('فشل في إعادة المحاولة')
    }
  })

  // إحصائيات القيود المعلقة
  const stats = {
    total: pendingEntries?.length || 0,
    pending: pendingEntries?.filter(entry => entry.status === 'pending').length || 0,
    processing: pendingEntries?.filter(entry => entry.status === 'processing').length || 0,
    failed: pendingEntries?.filter(entry => entry.status === 'failed').length || 0,
    completed: pendingEntries?.filter(entry => entry.status === 'completed').length || 0,
    cancelled: pendingEntries?.filter(entry => entry.status === 'cancelled').length || 0,
  }

  // فلترة القيود حسب الحالة
  const getEntriesByStatus = (status: string) => {
    return pendingEntries?.filter(entry => entry.status === status) || []
  }

  // التحقق من وجود قيود معلقة جاهزة للمعالجة
  const hasReadyEntries = pendingEntries?.some(
    entry => entry.status === 'pending' && new Date(entry.next_retry_at) <= new Date()
  ) || false

  return {
    pendingEntries: pendingEntries || [],
    isLoading,
    error,
    stats,
    hasReadyEntries,
    getEntriesByStatus,
    processPendingEntries: processPendingEntriesMutation.mutate,
    isProcessing: processPendingEntriesMutation.isPending,
    cancelPendingEntry: cancelPendingEntryMutation.mutate,
    isCancelling: cancelPendingEntryMutation.isPending,
    retryPendingEntry: retryPendingEntryMutation.mutate,
    isRetrying: retryPendingEntryMutation.isPending,
  }
}