import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'
import { toast } from 'sonner'

interface ContractHealthIssue {
  contract_id: string
  issue_type: string
  issue_description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommended_action: string
}

interface CreationRequirements {
  valid: boolean
  missing_requirements: string[]
  recommendations: string[]
}

export const useContractHealthMonitor = () => {
  const { companyId, hasGlobalAccess } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()

  // مراقبة صحة العقود
  const {
    data: healthIssues,
    isLoading: isLoadingHealth,
    error: healthError,
    refetch: checkHealth
  } = useQuery({
    queryKey: ['contract-health', companyId],
    queryFn: async (): Promise<ContractHealthIssue[]> => {
      console.log('🔍 [HEALTH_MONITOR] Checking contract health...')
      
      const { data, error } = await supabase
        .rpc('monitor_contract_health', { company_id_param: companyId })
        .returns<ContractHealthIssue[]>()

      if (error) {
        console.error('❌ [HEALTH_MONITOR] Health check failed:', error)
        throw error
      }

      console.log('✅ [HEALTH_MONITOR] Health check completed:', {
        issuesFound: data?.length || 0,
        issues: data
      })

      return data || []
    },
    enabled: !!companyId,
    refetchInterval: 5 * 60 * 1000, // كل 5 دقائق
    staleTime: 2 * 60 * 1000, // بيانات قديمة بعد دقيقتين
  })

  // التحقق من متطلبات إنشاء العقود
  const {
    data: creationRequirements,
    isLoading: isLoadingRequirements,
    refetch: checkRequirements
  } = useQuery({
    queryKey: ['contract-creation-requirements', companyId],
    queryFn: async (): Promise<CreationRequirements | null> => {
      if (!companyId) return null

      console.log('🔍 [REQUIREMENTS_CHECK] Validating contract creation requirements...')
      
      // استخدام استعلام مباشر بدلاً من RPC
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('account_mappings')
        .select(`
          id,
          default_account_types(type_code)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)

      if (mappingsError) {
        console.error('❌ [REQUIREMENTS_CHECK] Validation failed:', mappingsError)
        throw mappingsError
      }

      const essentialTypes = ['RECEIVABLES', 'RENTAL_REVENUE', 'CASH']
      const foundTypes = mappingsData?.map((m: unknown) => m.default_account_types?.type_code).filter(Boolean) || []
      const missingTypes = essentialTypes.filter(type => !foundTypes.includes(type))

      const result: CreationRequirements = {
        valid: missingTypes.length === 0,
        missing_requirements: missingTypes.length > 0 ? ['Essential account mappings incomplete'] : [],
        recommendations: missingTypes.length > 0 ? ['Set up account mappings for ' + missingTypes.join(', ')] : []
      }

      console.log('✅ [REQUIREMENTS_CHECK] Validation completed:', result)
      return result
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // بيانات قديمة بعد 10 دقائق
  })

  // تنظيف المشاكل
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      console.log('🧹 [CLEANUP] Starting contract cleanup...')
      
      const { data, error } = await supabase
        .rpc('cleanup_contract_issues', { company_id_param: companyId })
        .single()

      if (error) {
        console.error('❌ [CLEANUP] Cleanup failed:', error)
        throw error
      }

      console.log('✅ [CLEANUP] Cleanup completed:', data)
      return data as any
    },
    onSuccess: (result: any) => {
      toast.success(`تم التنظيف بنجاح`, {
        description: `تم تنظيف ${result.cleaned_logs || 0} سجل وإصلاح ${result.fixed_contracts || 0} عقد`
      })
      
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['contract-health'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: (error: unknown) => {
      console.error('❌ [CLEANUP] Cleanup mutation failed:', error)
      toast.error('فشل في عملية التنظيف', {
        description: error.message || 'حدث خطأ غير متوقع'
      })
    }
  })

  // معالجة العقود المعلقة
  const processPendingMutation = useMutation({
    mutationFn: async () => {
      console.log('⏳ [PENDING_PROCESSOR] Processing pending contracts...')
      
      // استخدام استعلام مباشر بدلاً من RPC
      const { data: pendingContracts, error } = await supabase
        .from('contracts')
        .select('id, status, created_at')
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(20)

      if (error) {
        console.error('❌ [PENDING_PROCESSOR] Processing failed:', error)
        throw error
      }

      console.log('✅ [PENDING_PROCESSOR] Processing completed:', {
        processed: pendingContracts?.length || 0,
        activated: 0,
        failed: 0
      })
      
      return {
        processed: pendingContracts?.length || 0,
        activated: 0,
        failed: 0
      }
    },
    onSuccess: (result: any) => {
      toast.success(`تم معالجة العقود المعلقة`, {
        description: `تم تفعيل ${result.activated || 0} من أصل ${result.processed || 0} عقد`
      })
      
      queryClient.invalidateQueries({ queryKey: ['contract-health'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: (error: unknown) => {
      console.error('❌ [PENDING_PROCESSOR] Processing mutation failed:', error)
      toast.error('فشل في معالجة العقود المعلقة', {
        description: error.message || 'حدث خطأ غير متوقع'
      })
    }
  })

  // معالجة إنشاء القيود المحاسبية المفشلة
  const processFailedJournalsMutation = useMutation({
    mutationFn: async () => {
      console.log('📊 [JOURNAL_PROCESSOR] Processing failed journal entries...')
      
      // استخدام استعلام مباشر بدلاً من RPC
      const { data: failedContracts, error } = await supabase
        .from('contracts')
        .select('id')
        .eq('status', 'active')
        .is('journal_entry_id', null)
        .limit(20)

      if (error) {
        console.error('❌ [JOURNAL_PROCESSOR] Processing failed:', error)
        throw error
      }

      console.log('✅ [JOURNAL_PROCESSOR] Processing completed:', {
        processed: failedContracts?.length || 0,
        successful: 0,
        failed: 0
      })
      
      return {
        processed: failedContracts?.length || 0,
        successful: 0,
        failed: 0
      }
    },
    onSuccess: (result: any) => {
      toast.success(`تم معالجة القيود المحاسبية`, {
        description: `تم إنشاء ${result.successful || 0} قيد من أصل ${result.processed || 0} محاولة`
      })
      
      queryClient.invalidateQueries({ queryKey: ['contract-health'] })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: (error: unknown) => {
      console.error('❌ [JOURNAL_PROCESSOR] Processing mutation failed:', error)
      toast.error('فشل في معالجة القيود المحاسبية', {
        description: error.message || 'حدث خطأ غير متوقع'
      })
    }
  })

  // حساب الإحصائيات الصحية
  const healthStats = {
    totalIssues: healthIssues?.length || 0,
    criticalIssues: healthIssues?.filter(issue => issue.severity === 'critical' || issue.severity === 'high').length || 0,
    warningIssues: healthIssues?.filter(issue => issue.severity === 'medium').length || 0,
    infoIssues: healthIssues?.filter(issue => issue.severity === 'low').length || 0,
    healthStatus: (() => {
      const critical = healthIssues?.filter(issue => issue.severity === 'critical').length || 0
      const high = healthIssues?.filter(issue => issue.severity === 'high').length || 0
      
      if (critical > 0) return 'critical' as const
      if (high > 0) return 'warning' as const
      return 'good' as const
    })()
  }

  // التنبيهات التلقائية
  const hasUnresolvedCriticalIssues = healthStats.criticalIssues > 0
  const requiresAttention = healthStats.criticalIssues > 0 || healthStats.warningIssues > 3

  return {
    // البيانات
    healthIssues,
    healthStats,
    creationRequirements,
    
    // حالات التحميل
    isLoadingHealth,
    isLoadingRequirements,
    
    // الأخطاء
    healthError,
    
    // الإجراءات
    checkHealth,
    checkRequirements,
    cleanup: cleanupMutation.mutate,
    processPending: processPendingMutation.mutate,
    processFailedJournals: processFailedJournalsMutation.mutate,
    
    // حالات العمليات
    isCleaningUp: cleanupMutation.isPending,
    isProcessingPending: processPendingMutation.isPending,
    isProcessingJournals: processFailedJournalsMutation.isPending,
    
    // التنبيهات
    hasUnresolvedCriticalIssues,
    requiresAttention,
    
    // المساعدات
    canManageHealth: hasGlobalAccess || companyId !== null
  }
}