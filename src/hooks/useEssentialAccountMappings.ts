import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'

interface AutoConfigResult {
  created?: string[]
  existing?: string[]
  errors?: string[]
}

// Manual account creation as fallback
async function createEssentialAccountsManually(companyId: string): Promise<AutoConfigResult> {
  console.log('🔄 [ACCOUNT_MAPPINGS] Creating essential accounts manually for company:', companyId)
  
  const result: AutoConfigResult = {
    created: [],
    existing: [],
    errors: []
  }

  try {
    // Check if revenue account exists
    const { data: revenueAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('company_id', companyId)
      .eq('account_type', 'revenue')
      .eq('is_active', true)
      .eq('is_header', false)
      .limit(1)

    // Check if receivables account exists  
    const { data: receivableAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('company_id', companyId)
      .eq('account_type', 'assets')
      .ilike('account_name', '%receivable%')
      .eq('is_active', true)
      .eq('is_header', false)
      .limit(1)

    // Create revenue account if missing
    if (!revenueAccounts || revenueAccounts.length === 0) {
      const { data: newRevenue, error: revenueError } = await supabase
        .from('chart_of_accounts')
        .insert({
          company_id: companyId,
          account_code: '4101',
          account_name: 'إيرادات تأجير المركبات',
          account_type: 'revenue',
          balance_type: 'credit',
          is_active: true,
          is_header: false,
          account_level: 2
        })
        .select()
        .single()

      if (revenueError) {
        console.error('❌ [ACCOUNT_MAPPINGS] Failed to create revenue account:', revenueError)
        result.errors?.push('Failed to create revenue account')
      } else {
        console.log('✅ [ACCOUNT_MAPPINGS] Created revenue account:', newRevenue)
        result.created?.push('Revenue Account')
      }
    } else {
      result.existing?.push('Revenue Account')
    }

    // Create receivables account if missing
    if (!receivableAccounts || receivableAccounts.length === 0) {
      const { data: newReceivable, error: receivableError } = await supabase
        .from('chart_of_accounts')
        .insert({
          company_id: companyId,
          account_code: '1201',
          account_name: 'ذمم العملاء',
          account_type: 'assets',
          balance_type: 'debit',
          is_active: true,
          is_header: false,
          account_level: 2
        })
        .select()
        .single()

      if (receivableError) {
        console.error('❌ [ACCOUNT_MAPPINGS] Failed to create receivables account:', receivableError)
        result.errors?.push('Failed to create receivables account')
      } else {
        console.log('✅ [ACCOUNT_MAPPINGS] Created receivables account:', newReceivable)
        result.created?.push('Receivables Account')
      }
    } else {
      result.existing?.push('Receivables Account')
    }

    return result
  } catch (error: any) {
    console.error('❌ [ACCOUNT_MAPPINGS] Manual account creation failed:', error)
    result.errors?.push(error.message || 'Failed to create essential accounts')
    return result
  }
}

// Manual account checking
async function checkAccountsManually(companyId: string): Promise<AutoConfigResult> {
  console.log('🔍 [ACCOUNT_MAPPINGS] Checking accounts manually for company:', companyId)
  
  const result: AutoConfigResult = {
    created: [],
    existing: [],
    errors: []
  }

  try {
    // Check if revenue account exists
    const { data: revenueAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('company_id', companyId)
      .eq('account_type', 'revenue')
      .eq('is_active', true)
      .eq('is_header', false)
      .limit(1)

    // Check if receivables account exists  
    const { data: receivableAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('company_id', companyId)
      .eq('account_type', 'assets')
      .or('account_name.ilike.%receivable%,account_name.ilike.%مدين%')
      .eq('is_active', true)
      .eq('is_header', false)
      .limit(1)

    if (!revenueAccounts || revenueAccounts.length === 0) {
      result.errors?.push('Revenue account missing')
    } else {
      result.existing?.push('Revenue Account')
    }

    if (!receivableAccounts || receivableAccounts.length === 0) {
      result.errors?.push('Receivables account missing')
    } else {
      result.existing?.push('Receivables Account')
    }

    return result
  } catch (error: any) {
    console.error('❌ [ACCOUNT_MAPPINGS] Manual account check failed:', error)
    result.errors?.push(error.message || 'Failed to check accounts')
    return result
  }
}

export const useEssentialAccountMappings = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()

  // Check current status of essential account mappings (optimized)
  const { data: mappingStatus, isLoading } = useQuery({
    queryKey: ['essential-account-mappings-status', companyId],
    queryFn: async () => {
      if (!companyId) return null

      try {
        // Use optimized query that combines multiple checks
        const [revenueCheck, receivablesCheck] = await Promise.all([
          supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('company_id', companyId)
            .eq('account_type', 'revenue')
            .eq('is_active', true)
            .eq('is_header', false)
            .limit(1),
          supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('company_id', companyId)
            .eq('account_type', 'assets')
            .or('account_name.ilike.%receivable%,account_name.ilike.%مدين%')
            .eq('is_active', true)
            .eq('is_header', false)
            .limit(1)
        ])

        const result: AutoConfigResult = {
          existing: [],
          errors: []
        }

        if (revenueCheck.data && revenueCheck.data.length > 0) {
          result.existing?.push('Revenue Account')
        } else {
          result.errors?.push('Revenue account missing')
        }

        if (receivablesCheck.data && receivablesCheck.data.length > 0) {
          result.existing?.push('Receivables Account')
        } else {
          result.errors?.push('Receivables account missing')
        }

        return result
      } catch (error: any) {
        console.error('Failed to check account mapping status:', error)
        return await checkAccountsManually(companyId)
      }
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // Reduced to 30 seconds for faster updates
  })

  // Auto-configure essential account mappings (optimized)
  const autoConfigureMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')

      console.log('🔧 [ACCOUNT_MAPPINGS] Starting optimized auto-configuration for company:', companyId)

      // Use manual account creation directly for better performance
      return await createEssentialAccountsManually(companyId)
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