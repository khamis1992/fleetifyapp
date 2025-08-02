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
  retryCount?: number
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
}

export const useContractCreation = () => {
  const { companyId, user } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()
  
  const [creationState, setCreationState] = useState<ContractCreationState>({
    currentStep: 0,
    steps: [
      { id: 'validation', title: 'التحقق من البيانات', status: 'pending' },
      { id: 'accounts', title: 'فحص ربط الحسابات', status: 'pending' },
      { id: 'creation', title: 'إنشاء العقد', status: 'pending' },
      { id: 'activation', title: 'تفعيل العقد وإنشاء القيد', status: 'pending' },
      { id: 'verification', title: 'التحقق من القيد المحاسبي', status: 'pending' },
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
              warnings,
              retryCount: status === 'failed' ? (step.retryCount || 0) + 1 : step.retryCount 
            }
          : step
      ),
      canRetry: status === 'failed',
      hasWarnings: prev.hasWarnings || status === 'warning' || (warnings && warnings.length > 0)
    }))
  }

  const logContractStep = async (
    contractId: string | null,
    stepName: string,
    status: string,
    attemptNum: number = 1,
    errorMsg?: string,
    execTime?: number,
    meta: any = {}
  ) => {
    if (!companyId) return
    
    try {
      // Use the existing RPC function with proper parameter names
      await supabase.rpc('log_contract_creation_step', {
        company_id_param: companyId as string,
        contract_id_param: contractId,
        step_name: stepName,
        status_param: status,
        attempt_num: attemptNum,
        error_msg: errorMsg || null,
        exec_time: execTime || null,
        meta: meta ? JSON.parse(JSON.stringify(meta)) : null
      })
    } catch (error) {
      console.warn('Failed to log contract creation step:', error)
    }
  }

  const createContractMutation = useMutation({
    mutationFn: async (inputContractData: any) => {
      console.log('🚀 [CONTRACT_CREATION] بدء عملية إنشاء العقد المحسنة', {
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
        console.error('❌ [CONTRACT_CREATION] معرف الشركة غير موجود:', { user, companyId })
        throw new Error('معرف الشركة مطلوب - يرجى التأكد من تسجيل الدخول بشكل صحيح')
      }

      if (!inputContractData.customer_id) {
        throw new Error('معرف العميل مطلوب')
      }

      const startTime = Date.now()
      setCreationState(prev => ({ ...prev, isProcessing: true, canRetry: false }))

      try {
        // تحديث حالة الخطوات إلى قيد المعالجة
        updateStepStatus('validation', 'processing')
        await logContractStep(null, 'enhanced_creation', 'started')

        console.log('📝 [CONTRACT_CREATION] استخدام طريقة الإنشاء الموحدة مع المعاملات المنفصلة')
        
        // التحقق من صحة البيانات الأساسية
        if (!inputContractData.start_date || !inputContractData.end_date) {
          throw new Error('تواريخ بداية ونهاية العقد مطلوبة')
        }

        const contractAmount = Number(inputContractData.contract_amount)
        if (isNaN(contractAmount) || contractAmount < 0) {
          throw new Error('مبلغ العقد يجب أن يكون رقماً صحيحاً وأكبر من أو يساوي صفر')
        }

        // التحقق من البيانات المطلوبة مع تسجيل مفصل
        const rpcParams = {
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
        }
        
        console.log('📋 [CONTRACT_CREATION] معاملات RPC:', rpcParams)

        updateStepStatus('accounts', 'processing')
        updateStepStatus('creation', 'processing')

        // استخدام دالة إنشاء العقد الموحدة مع المعاملات المنفصلة
        const { data: result, error: createError } = await supabase
          .rpc('create_contract_with_journal_entry', rpcParams)

        // معالجة أخطاء الاتصال بقاعدة البيانات
        if (createError) {
          console.error('❌ [CONTRACT_CREATION] خطأ في قاعدة البيانات:', createError)
          
          // إجراء تشخيص سريع لفهم المشكلة
          try {
            const { data: diagnosisResult } = await supabase.rpc('diagnose_contract_creation_readiness', {
              p_company_id: companyId,
              p_customer_id: inputContractData.customer_id,
              p_vehicle_id: inputContractData.vehicle_id === 'none' ? null : inputContractData.vehicle_id
            })
            
            if (diagnosisResult) {
              console.log('🔍 [CONTRACT_CREATION] تشخيص المشكلة:', diagnosisResult)
            }
          } catch (diagError) {
            console.warn('⚠️ [CONTRACT_CREATION] فشل في التشخيص:', diagError)
          }
          
          const errorMessage = `خطأ في قاعدة البيانات: ${createError.message}`
          updateStepStatus('validation', 'failed', errorMessage)
          updateStepStatus('accounts', 'failed', errorMessage)
          updateStepStatus('creation', 'failed', errorMessage)
          updateStepStatus('activation', 'failed', errorMessage)
          updateStepStatus('verification', 'failed', errorMessage)
          updateStepStatus('finalization', 'failed', errorMessage)
          
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // معالجة عدم وجود استجابة
        if (!result) {
          const errorMessage = 'لم يتم تلقي استجابة من الخادم'
          console.error('❌ [CONTRACT_CREATION] لم يتم تلقي استجابة')
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // معالجة تنسيق الاستجابة غير المتوقع
        if (typeof result !== 'object') {
          const errorMessage = `تنسيق استجابة غير متوقع: متوقع كائن، حصلت على ${typeof result}`
          console.error('❌ [CONTRACT_CREATION] نوع استجابة غير متوقع:', typeof result)
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        const typedResult = result as unknown as ContractCreationResult

        // التحقق من بنية الاستجابة
        if (!typedResult.hasOwnProperty('success')) {
          const errorMessage = 'تنسيق استجابة غير صحيح: خاصية النجاح مفقودة'
          console.error('❌ [CONTRACT_CREATION] تنسيق استجابة غير صحيح - خاصية النجاح مفقودة:', result)
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // معالجة فشل إنشاء العقد
        if (typedResult.success !== true) {
          const errorMessage = typedResult.error_message || typedResult.error || 'فشل في إنشاء العقد لسبب غير معروف'
          const errorCode = typedResult.error_code || 'UNKNOWN_ERROR'
          const errors = typedResult.errors || [errorMessage]
          
          console.error('❌ [CONTRACT_CREATION] فشل في إنشاء العقد:', {
            result,
            errorCode,
            errorMessage,
            errors
          })
          
          // تحديد رسالة خطأ مناسبة للمستخدم
          let userMessage = errorMessage
          switch (errorCode) {
            case 'MISSING_COMPANY_ID':
              userMessage = 'معرف الشركة مطلوب - يرجى تسجيل الدخول مرة أخرى'
              break
            case 'MISSING_CUSTOMER_ID':
              userMessage = 'يرجى تحديد العميل'
              break
            case 'CUSTOMER_NOT_FOUND':
              userMessage = 'العميل المحدد غير موجود'
              break
            case 'CUSTOMER_NOT_ELIGIBLE':
              userMessage = 'العميل غير مؤهل لإنشاء عقد جديد'
              break
            case 'VEHICLE_NOT_FOUND':
              userMessage = 'المركبة المحددة غير موجودة'
              break
            case 'VEHICLE_NOT_AVAILABLE':
              userMessage = 'المركبة غير متاحة حالياً'
              break
            case 'VEHICLE_DATE_CONFLICT':
              userMessage = 'يوجد تضارب في مواعيد استخدام المركبة'
              break
            case 'MISSING_DATES':
              userMessage = 'تواريخ بداية ونهاية العقد مطلوبة'
              break
            case 'INVALID_DATES':
              userMessage = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية'
              break
            case 'AUTHENTICATION_ERROR':
              userMessage = 'خطأ في المصادقة - يرجى تسجيل الدخول مرة أخرى'
              break
            default:
              userMessage = errorMessage
          }
          
          updateStepStatus('creation', 'failed', userMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(userMessage)
        }

        // التحقق من وجود معرف العقد عند النجاح
        if (!typedResult.contract_id) {
          const errorMessage = 'تم إنشاء العقد ولكن معرف العقد مفقود'
          console.error('❌ [CONTRACT_CREATION] استجابة النجاح تفتقر لمعرف العقد:', result)
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        console.log('✅ [CONTRACT_CREATION] تم إنشاء العقد بنجاح:', typedResult)

        // تحديد حالة الخطوات بناءً على النتيجة
        updateStepStatus('validation', 'completed')
        updateStepStatus('accounts', 'completed')
        updateStepStatus('creation', 'completed')

        const contractId = typedResult.contract_id
        const journalEntryId = typedResult.journal_entry_id
        const warnings = typedResult.warnings || []
        const requiresManualEntry = typedResult.requires_manual_entry || false

        // معالجة حالة القيد المحاسبي
        if (journalEntryId) {
          // تم إنشاء القيد المحاسبي بنجاح
          updateStepStatus('activation', 'completed')
          updateStepStatus('verification', 'completed')
          updateStepStatus('finalization', 'completed')
          
          toast.success('تم إنشاء العقد والقيد المحاسبي بنجاح')
        } else if (requiresManualEntry) {
          // فشل في إنشاء القيد المحاسبي - يحتاج تدخل يدوي
          updateStepStatus('activation', 'warning', 'فشل في إنشاء القيد المحاسبي بعد عدة محاولات')
          updateStepStatus('verification', 'failed', 'يتطلب إنشاء قيد محاسبي يدوي')
          updateStepStatus('finalization', 'warning', 'تم إنشاء العقد ولكن يتطلب قيد محاسبي يدوي')
          
          toast.warning('تم إنشاء العقد بنجاح ولكن يتطلب إنشاء قيد محاسبي يدوي', {
            description: 'يرجى التواصل مع قسم المحاسبة لإنشاء القيد المحاسبي',
            duration: 8000
          })
        } else if (warnings.length > 0) {
          // تحذيرات في إنشاء القيد المحاسبي
          updateStepStatus('activation', 'warning', warnings.join(', '), warnings)
          updateStepStatus('verification', 'warning', 'سيتم التحقق تلقائياً')
          updateStepStatus('finalization', 'completed')
          
          toast.success('تم إنشاء العقد بنجاح مع بعض التحذيرات', {
            description: warnings.join(', '),
            duration: 6000
          })
        } else {
          // تم إنشاء العقد بدون قيد محاسبي (مبلغ صفر مثلاً)
          updateStepStatus('activation', 'completed')
          updateStepStatus('verification', 'completed')
          updateStepStatus('finalization', 'completed')
          
          toast.success('تم إنشاء العقد بنجاح')
        }

        const hasWarnings = warnings.length > 0 || requiresManualEntry
        
        setCreationState(prev => ({ 
          ...prev, 
          contractId, 
          isProcessing: false,
          hasWarnings,
          healthStatus: requiresManualEntry ? 'error' : (hasWarnings ? 'warning' : 'good')
        }))

        await logContractStep(contractId, 'enhanced_creation', 'completed', 1, null, Date.now() - startTime)

        console.log('🎉 [CONTRACT_CREATION] اكتملت العملية المحسنة:', {
          contractId,
          journalEntryId,
          warnings,
          requiresManualEntry,
          totalTime: Date.now() - startTime
        })

        // الحصول على بيانات العقد الكاملة للإرجاع
        const { data: createdContractData, error: fetchError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single()

        if (fetchError || !createdContractData) {
          console.warn('⚠️ [CONTRACT_CREATION] لا يمكن جلب بيانات العقد المنشأ:', fetchError)
          // إرجاع بيانات العقد الأساسية
          return { 
            id: contractId, 
            contract_number: typedResult.contract_number,
            status: journalEntryId ? 'active' : 'draft'
          }
        }

        return createdContractData

      } catch (error: any) {
        console.error('❌ [CONTRACT_CREATION] فشلت العملية:', error)
        
        // معالجة محسنة للأخطاء وتسجيلها
        let errorMessage = 'حدث خطأ غير متوقع أثناء إنشاء العقد'
        let detailedError = 'خطأ غير معروف'
        
        if (error) {
          // معالجة أنواع مختلفة من الأخطاء
          if (typeof error === 'string') {
            errorMessage = error
            detailedError = error
          } else if (error instanceof Error) {
            errorMessage = error.message || errorMessage
            detailedError = error.message
            console.error('❌ [CONTRACT_CREATION] مكدس الخطأ:', error.stack)
          } else if (error.message) {
            errorMessage = error.message
            detailedError = error.message
          } else if (error.error) {
            errorMessage = error.error.message || error.error
            detailedError = JSON.stringify(error.error)
          } else {
            detailedError = JSON.stringify(error)
            console.error('❌ [CONTRACT_CREATION] كائن الخطأ الخام:', error)
          }
          
          // تسجيل سياق إضافي للخطأ
          console.error('❌ [CONTRACT_CREATION] تفاصيل الخطأ:', {
            errorType: typeof error,
            errorConstructor: error?.constructor?.name,
            errorMessage: errorMessage,
            currentStep: creationState.currentStep,
            timestamp: new Date().toISOString()
          })
        }
        
        // تحديث جميع الخطوات المتبقية كفاشلة
        setCreationState(prev => ({
          ...prev,
          isProcessing: false,
          canRetry: true,
          steps: prev.steps.map(step => 
            step.status === 'processing' || step.status === 'pending'
              ? { ...step, status: 'failed', error: errorMessage }
              : step
          )
        }))
        
        await logContractStep(null, 'unified_creation', 'failed', 1, detailedError, Date.now() - startTime)
        
        // رمي خطأ منسق بشكل صحيح
        const formattedError = new Error(errorMessage)
        formattedError.name = 'ContractCreationError'
        throw formattedError
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      console.log('✅ [CONTRACT_CREATION] تم إنشاء العقد بنجاح:', data)
    },
    onError: (error: any) => {
      console.error('❌ [CONTRACT_CREATION] فشل في الطفرة:', error)
      
      // رسائل خطأ محسنة للمستخدمين
      let userMessage = 'فشل في إنشاء العقد'
      
      if (error && error.message) {
        // فحص أنماط أخطاء محددة وتوفير رسائل مفيدة
        if (error.message.includes('unique_violation')) {
          userMessage = 'رقم العقد موجود مسبقاً، يرجى استخدام رقم مختلف'
        } else if (error.message.includes('foreign_key_violation')) {
          userMessage = 'يرجى التأكد من صحة بيانات العميل والمركبة'
        } else if (error.message.includes('check_violation')) {
          userMessage = 'يرجى التأكد من صحة البيانات المدخلة'
        } else if (error.message.includes('not_null_violation')) {
          userMessage = 'يرجى ملء جميع الحقول المطلوبة'
        } else if (error.message.includes('timeout')) {
          userMessage = 'انتهت مهلة الاتصال، يرجى المحاولة مرة أخرى'
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          userMessage = 'خطأ في الاتصال، يرجى التحقق من الإنترنت والمحاولة مرة أخرى'
        } else if (error.message.includes('Contract not found') || error.message.includes('العقد غير موجود')) {
          userMessage = 'خطأ في إنشاء العقد - يرجى المحاولة مرة أخرى'
        } else if (error.message.includes('Journal entry') || error.message.includes('القيد المحاسبي')) {
          userMessage = 'تم إنشاء العقد ولكن فشل في إنشاء القيد المحاسبي'
        } else if (error.message.includes('المستخدم غير موجود')) {
          userMessage = 'مشكلة في المصادقة، يرجى تسجيل الدخول مرة أخرى'
        } else if (error.message.includes('ليس لديك صلاحية')) {
          userMessage = 'ليس لديك صلاحية لإنشاء العقود، يرجى التواصل مع الإدارة'
        } else {
          userMessage = error.message
        }
      }
      
      toast.error(userMessage, {
        description: 'يمكنك المحاولة مرة أخرى أو التواصل مع الدعم الفني إذا استمر الخطأ',
        duration: 8000
      })
    }
  })

  const retryCreation = (originalData?: any) => {
    if (creationState.canRetry) {
      // إعادة تعيين الخطوات الفاشلة وإعادة المحاولة
      setCreationState(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.status === 'failed' ? { ...step, status: 'pending', error: undefined } : step
        ),
        canRetry: false,
        isProcessing: false
      }))
      
      // إعادة المحاولة مع البيانات الأصلية إذا توفرت
      if (originalData) {
        createContractMutation.mutate(originalData)
      }
    }
  }

  const resetCreationState = () => {
    setCreationState({
      currentStep: 0,
      steps: [
        { id: 'validation', title: 'التحقق من البيانات', status: 'pending' },
        { id: 'accounts', title: 'فحص ربط الحسابات', status: 'pending' },
        { id: 'creation', title: 'إنشاء العقد', status: 'pending' },
        { id: 'activation', title: 'تفعيل العقد وإنشاء القيد', status: 'pending' },
        { id: 'verification', title: 'التحقق من القيد المحاسبي', status: 'pending' },
        { id: 'finalization', title: 'إتمام العملية', status: 'pending' }
      ],
      isProcessing: false,
      canRetry: false,
      hasWarnings: false,
      healthStatus: 'good'
    })
  }

  return {
    createContract: createContractMutation.mutate,
    creationState,
    isCreating: createContractMutation.isPending,
    retryCreation,
    resetCreationState
  }
}

