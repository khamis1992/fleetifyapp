import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'

interface AutoConfigResult {
  created?: string[]
  existing?: string[]
  errors?: string[]
}

export const useEssentialAccountMappings = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()

  // Check current status of essential account mappings
  const { data: mappingStatus, isLoading } = useQuery({
    queryKey: ['essential-account-mappings-status', companyId],
    queryFn: async () => {
      if (!companyId) return null

      const { data, error } = await supabase.rpc('ensure_essential_account_mappings', {
        company_id_param: companyId
      })

      if (error) {
        console.error('Failed to check account mapping status:', error)
        throw error
      }

      return data as AutoConfigResult
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Auto-configure essential account mappings
  const autoConfigureMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')

      const { data, error } = await supabase.rpc('ensure_essential_account_mappings', {
        company_id_param: companyId
      })

      if (error) {
        console.error('Auto-configuration failed:', error)
        throw error
      }

      return data as AutoConfigResult
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['essential-account-mappings-status'] })
      queryClient.invalidateQueries({ queryKey: ['account-mappings'] })
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })

      if (result.created && result.created.length > 0) {
        toast.success(`تم إنشاء ربط الحسابات تلقائياً: ${result.created.join(', ')}`)
      }

      if (result.errors && result.errors.length > 0) {
        toast.warning(`بعض الحسابات تحتاج إعداد يدوي: ${result.errors.join(', ')}`)
      }

      if (result.existing && result.existing.length > 0 && 
          (!result.created || result.created.length === 0) && 
          (!result.errors || result.errors.length === 0)) {
        toast.info('جميع ربط الحسابات الأساسية موجودة مسبقاً')
      }

      if (!result.created?.length && !result.existing?.length && !result.errors?.length) {
        toast.info('لا توجد حسابات أساسية بحاجة لربط')
      }
    },
    onError: (error: any) => {
      console.error('Auto-configuration error:', error)
      toast.error(error.message || 'فشل في الإعداد التلقائي لربط الحسابات')
    }
  })

  // Check if essential mappings are missing
  const hasMissingMappings = mappingStatus?.errors && mappingStatus.errors.length > 0
  const hasExistingMappings = mappingStatus?.existing && mappingStatus.existing.length > 0
  const canAutoCreate = mappingStatus && !mappingStatus.created?.length && !mappingStatus.errors?.length

  return {
    mappingStatus,
    isLoading,
    hasMissingMappings,
    hasExistingMappings,
    canAutoCreate,
    autoConfigureEssentialMappings: autoConfigureMutation.mutate,
    isAutoConfiguring: autoConfigureMutation.isPending,
    autoConfigError: autoConfigureMutation.error
  }
}