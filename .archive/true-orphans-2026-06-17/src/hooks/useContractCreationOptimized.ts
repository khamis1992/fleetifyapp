import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'

export interface ContractCreationStep {
  id: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'warning'
  error?: string
  executionTime?: number
  warnings?: string[]
}

export interface ContractCreationState {
  currentStep: number
  steps: ContractCreationStep[]
  contractId?: string
  isProcessing: boolean
  canRetry: boolean
  totalExecutionTime?: number
  hasWarnings: boolean
  healthStatus: 'good' | 'warning' | 'error'
}

interface PerformanceBreakdown {
  [key: string]: number | string | unknown
}

interface ContractInputData {
  customer_id?: string
  vehicle_id?: string | null
  contract_type?: string
  start_date?: string
  end_date?: string
  contract_amount?: number | string
  monthly_amount?: number | string
  description?: string | null
  terms?: string | null
  cost_center_id?: string | null
  created_by?: string
  contract_number?: string
  [key: string]: unknown
}

interface ContractCreationResult {
  success: boolean
  contract_id: string
  contract_number?: string
  journal_entry_id?: string
  journal_entry_number?: string
  warning?: string
  warnings?: string[]
  requires_manual_entry?: boolean
  message?: string
  error?: string
  errors?: string[]
  execution_time_seconds?: number
  performance_breakdown?: PerformanceBreakdown
}

export const useContractCreationOptimized = () => {
  const { companyId, user } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()
  
  const [creationState, setCreationState] = useState<ContractCreationState>({
    currentStep: 0,
    steps: [
      { id: 'creation', title: 'إنشاء العقد', status: 'pending' },
      { id: 'finalization', title: 'المعالجة النهائية', status: 'pending' }
    ],
    isProcessing: false,
    canRetry: false,
    hasWarnings: false,
    healthStatus: 'good'
  })

  const updateStepStatus = (stepId: string, status: ContractCreationStep['status'], error?: string, warnings?: string[]) => {
    setCreationState(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              status, 
              error, 
              warnings
            }
          : step
      ),
      canRetry: status === 'failed',
      hasWarnings: prev.hasWarnings || status === 'warning' || (warnings && warnings.length > 0)
    }))
  }

  const createContractMutation = useMutation({
    mutationFn: async (inputContractData: ContractInputData) => {
      console.log('🚀 [CONTRACT_CREATION_OPTIMIZED] بدء عملية إنشاء العقد المحسنة', {
        contractType: inputContractData.contract_type,
        amount: inputContractData.contract_amount,
        customerId: inputContractData.customer_id,
        vehicleId: inputContractData.vehicle_id,
        startDate: inputContractData.start_date,
        endDate: inputContractData.end_date
      })
      
      if (!inputContractData) {
        throw new Error('بيانات العقد مطلوبة')
      }
      
      if (!companyId) {
        console.error('❌ [CONTRACT_CREATION_OPTIMIZED] معرف الشركة غير موجود:', { user, companyId })
        throw new Error('معرف الشركة مطلوب - يرجى التأكد من تسجيل الدخول بشكل صحيح')
      }

      if (!inputContractData.customer_id) {
        throw new Error('معرف العميل مطلوب')
      }

      const startTime = Date.now()
      setCreationState(prev => ({ ...prev, isProcessing: true, canRetry: false }))

      try {
        // التحقق السريع
        if (!inputContractData.start_date || !inputContractData.end_date) {
          throw new Error('تواريخ بداية ونهاية العقد مطلوبة')
        }

        const contractAmount = Number(inputContractData.contract_amount)
        if (isNaN(contractAmount) || contractAmount < 0) {
          throw new Error('مبلغ العقد يجب أن يكون رقماً صحيحاً وأكبر من أو يساوي صفر')
        }

        updateStepStatus('creation', 'processing')

        // استخدام الدالة فائقة السرعة
        console.log('⚡ [CONTRACT_CREATION_ULTRA_FAST] استخدام الدالة فائقة السرعة...')
        const { data: result, error: createError } = await supabase.rpc('create_contract_with_journal_entry_ultra_fast', {
          p_company_id: companyId,
          p_customer_id: inputContractData.customer_id,
          p_vehicle_id: inputContractData.vehicle_id === 'none' ? null : inputContractData.vehicle_id,
          p_contract_type: inputContractData.contract_type || 'rental',
          p_start_date: inputContractData.start_date,
          p_end_date: inputContractData.end_date,
          p_contract_amount: contractAmount,
          p_monthly_amount: Number(inputContractData.monthly_amount || contractAmount) || contractAmount,
          p_description: inputContractData.description || null,
          p_terms: inputContractData.terms || null,
          p_cost_center_id: inputContractData.cost_center_id || null,
          p_created_by: inputContractData.created_by || user?.id
        })

        if (createError) {
          console.error('❌ [CONTRACT_CREATION_OPTIMIZED] خطأ في قاعدة البيانات:', createError)
          updateStepStatus('creation', 'failed', createError.message)
          throw new Error(createError.message)
        }

        if (!result) {
          const errorMessage = 'لم يتم تلقي استجابة من الخادم'
          updateStepStatus('creation', 'failed', errorMessage)
          throw new Error(errorMessage)
        }

        const typedResult = result as unknown as ContractCreationResult

        if (!typedResult.success) {
          const errorMessage = typedResult.error || 'فشل في إنشاء العقد لسبب غير معروف'
          updateStepStatus('creation', 'failed', errorMessage)
          throw new Error(errorMessage)
        }

        if (!typedResult.contract_id) {
          const errorMessage = 'تم إنشاء العقد ولكن معرف العقد مفقود'
          updateStepStatus('creation', 'failed', errorMessage)
          throw new Error(errorMessage)
        }

        console.log('✅ [CONTRACT_CREATION_OPTIMIZED] تم إنشاء العقد بنجاح:', typedResult)
        
        // عرض معلومات الأداء
        if (typedResult.execution_time_seconds) {
          console.log(`⚡ [CONTRACT_CREATION_OPTIMIZED] وقت التنفيذ في قاعدة البيانات: ${typedResult.execution_time_seconds} ثانية`)
          if (typedResult.performance_breakdown) {
            console.log('📊 [CONTRACT_CREATION_OPTIMIZED] تفاصيل الأداء:', typedResult.performance_breakdown)
          }
        }

        updateStepStatus('creation', 'completed', undefined, typedResult.warnings)
        updateStepStatus('finalization', 'processing')

        const contractId = typedResult.contract_id
        const journalEntryId = typedResult.journal_entry_id

        // معالجة سريعة في الخلفية (لا تنتظر الانتهاء)
        supabase.functions.invoke('process-contract-background', {
          body: {
            contractId,
            contractData: {
              ...inputContractData,
              contract_number: typedResult.contract_number,
              contract_amount: contractAmount
            }
          }
        }).then(() => {
          console.log('✅ [CONTRACT_CREATION_ULTRA_FAST] تم بدء المعالجة الخلفية')
        }).catch(error => {
          console.warn('⚠️ [CONTRACT_CREATION_ULTRA_FAST] فشل في المعالجة الخلفية (غير حرج):', error)
        })

        const totalTime = Date.now() - startTime
        console.log(`🎉 [CONTRACT_CREATION_ULTRA_FAST] عملية إنشاء العقد مكتملة في ${totalTime}ms`)
        
        setCreationState(prev => ({
          ...prev,
          isProcessing: false,
          totalExecutionTime: totalTime,
          contractId: contractId
        }))

        updateStepStatus('finalization', 'completed')

        // إرجاع البيانات الأساسية فوراً دون انتظار الجلب الإضافي
        return { 
          id: contractId, 
          contract_number: typedResult.contract_number,
          status: journalEntryId ? 'active' : 'draft',
          contract_amount: contractAmount,
          start_date: inputContractData.start_date,
          end_date: inputContractData.end_date
        }

      } catch (error: unknown) {
        console.error('💥 [CONTRACT_CREATION_OPTIMIZED] خطأ في إنشاء العقد:', error)

        setCreationState(prev => ({
          ...prev,
          isProcessing: false,
          canRetry: true,
          healthStatus: 'error'
        }))

        throw error
      }
    },
    onSuccess: (contract) => {
      console.log('🎉 [CONTRACT_CREATION_OPTIMIZED] تم إنشاء العقد بنجاح:', contract)
      
      // تحديث الاستعلامات ذات الصلة
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      
      toast.success('تم إنشاء العقد بنجاح', {
        description: `رقم العقد: ${contract.contract_number || 'غير محدد'}`
      })
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
      console.error('💥 [CONTRACT_CREATION_OPTIMIZED] خطأ في إنشاء العقد:', error)
      toast.error('فشل في إنشاء العقد', {
        description: errorMessage
      })
    }
  })

  return {
    creationState,
    createContract: createContractMutation.mutateAsync,
    isCreating: createContractMutation.isPending,
    reset: () => setCreationState(prev => ({
      ...prev,
      currentStep: 0,
      steps: [
        { id: 'creation', title: 'إنشاء العقد', status: 'pending' },
        { id: 'finalization', title: 'المعالجة النهائية', status: 'pending' }
      ],
      contractId: undefined,
      isProcessing: false,
      canRetry: false,
      totalExecutionTime: undefined,
      hasWarnings: false,
      healthStatus: 'good'
    }))
  }
}