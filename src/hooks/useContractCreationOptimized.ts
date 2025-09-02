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
  performance_breakdown?: any
}

export const useContractCreationOptimized = () => {
  const { companyId, user } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()
  
  const [creationState, setCreationState] = useState<ContractCreationState>({
    currentStep: 0,
    steps: [
      { id: 'validation', title: 'التحقق من البيانات', status: 'pending' },
      { id: 'creation', title: 'إنشاء العقد والقيد المحاسبي', status: 'pending' },
      { id: 'finalization', title: 'إتمام العملية', status: 'pending' }
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
    mutationFn: async (inputContractData: any) => {
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
        // خطوة التحقق السريعة
        updateStepStatus('validation', 'processing')
        
        if (!inputContractData.start_date || !inputContractData.end_date) {
          throw new Error('تواريخ بداية ونهاية العقد مطلوبة')
        }

        const contractAmount = Number(inputContractData.contract_amount)
        if (isNaN(contractAmount) || contractAmount < 0) {
          throw new Error('مبلغ العقد يجب أن يكون رقماً صحيحاً وأكبر من أو يساوي صفر')
        }

        updateStepStatus('validation', 'completed')
        updateStepStatus('creation', 'processing')

        // استخدام الدالة المحسنة
        console.log('⚡ [CONTRACT_CREATION_OPTIMIZED] استخدام الدالة المحسنة للسرعة القصوى...')
        const { data: result, error: createError } = await supabase.rpc('create_contract_with_journal_entry_enhanced', {
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

        // ربط تقرير حالة المركبة إذا كان موجود
        if (inputContractData.vehicle_condition_report_id && contractId) {
          try {
            console.log('🔗 [CONTRACT_CREATION_OPTIMIZED] ربط تقرير حالة المركبة بالعقد')
            
            await supabase
              .from('vehicle_condition_reports')
              .update({ contract_id: contractId })
              .eq('id', inputContractData.vehicle_condition_report_id)
            
            console.log('✅ [CONTRACT_CREATION_OPTIMIZED] تم ربط تقرير حالة المركبة بنجاح')
          } catch (error) {
            console.error('❌ [CONTRACT_CREATION_OPTIMIZED] خطأ في ربط تقرير حالة المركبة:', error)
          }
        }

        // معالجة المستندات في الخلفية (غير متزامن)
        setTimeout(async () => {
          try {
            console.log('📄 [CONTRACT_CREATION_OPTIMIZED] بدء معالجة المستندات في الخلفية...')
            
            // جلب اسم العميل
            const { data: customer } = await supabase
              .from('customers')
              .select('first_name_ar, last_name_ar, company_name_ar, customer_type')
              .eq('id', inputContractData.customer_id)
              .single()

            const customerName = customer?.customer_type === 'corporate' 
              ? customer.company_name_ar || 'شركة'
              : `${customer?.first_name_ar || ''} ${customer?.last_name_ar || ''}`.trim() || 'عميل'

            // إنشاء مستند PDF للعقد
            const pdfResult = await fetch('/api/generate-contract-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contractId,
                customerName,
                contractData: {
                  contract_number: typedResult.contract_number,
                  contract_amount: contractAmount,
                  start_date: inputContractData.start_date,
                  end_date: inputContractData.end_date,
                  contract_type: inputContractData.contract_type
                }
              })
            })

            if (pdfResult.ok) {
              console.log('✅ [CONTRACT_CREATION_OPTIMIZED] تم إنشاء PDF في الخلفية')
            }
          } catch (error) {
            console.warn('⚠️ [CONTRACT_CREATION_OPTIMIZED] فشل في معالجة المستندات (غير حرج):', error)
          }
        }, 100) // تأخير بسيط للسماح للعملية الرئيسية بالانتهاء

        const totalTime = Date.now() - startTime
        console.log(`🎉 [CONTRACT_CREATION_OPTIMIZED] عملية إنشاء العقد مكتملة في ${totalTime}ms`)
        
        setCreationState(prev => ({
          ...prev,
          isProcessing: false,
          totalExecutionTime: totalTime,
          contractId: contractId
        }))

        updateStepStatus('finalization', 'completed')

        // جلب بيانات العقد الكاملة
        const { data: createdContract } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single()

        return createdContract || { 
          id: contractId, 
          contract_number: typedResult.contract_number,
          status: journalEntryId ? 'active' : 'draft'
        }

      } catch (error: any) {
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
    onError: (error: any) => {
      console.error('💥 [CONTRACT_CREATION_OPTIMIZED] خطأ في إنشاء العقد:', error)
      toast.error('فشل في إنشاء العقد', {
        description: error.message || 'حدث خطأ غير متوقع'
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
      steps: prev.steps.map(step => ({ ...step, status: 'pending', error: undefined, warnings: undefined })),
      contractId: undefined,
      isProcessing: false,
      canRetry: false,
      totalExecutionTime: undefined,
      hasWarnings: false,
      healthStatus: 'good'
    }))
  }
}