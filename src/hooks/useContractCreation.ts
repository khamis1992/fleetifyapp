import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'
import { useEssentialAccountMappings } from './useEssentialAccountMappings'
import { createContractWithFallback } from '@/utils/contractJournalEntry'
import { generateContractPdf } from '@/utils/contractPdfGenerator'
import { useCreateContractDocument } from './useContractDocuments'
import { useContractDocumentSaving } from './useContractDocumentSaving'

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

interface PerformanceBreakdown {
  [key: string]: number | string | unknown
}

interface ContractInputData {
  customer_id: string
  vehicle_id?: string | null
  contract_type?: string
  start_date: string
  end_date: string
  contract_amount: number | string
  monthly_amount?: number | string
  description?: string | null
  terms?: string | null
  cost_center_id?: string | null
  created_by?: string
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

export const useContractCreation = () => {
  const { companyId, user } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()
  const { mutateAsync: createDocument } = useCreateContractDocument()
  const { saveDocuments, isProcessing: isDocumentSaving } = useContractDocumentSaving()
  const { 
    mappingStatus, 
    hasMissingMappings, 
    autoConfigureEssentialMappings,
    isAutoConfiguring 
  } = useEssentialAccountMappings()
  
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
    meta: Record<string, unknown> = {}
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
    mutationFn: async (inputContractData: ContractInputData) => {
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
        
        // فحص الحسابات الأساسية المطلوبة
        console.log('🔍 [CONTRACT_CREATION] فحص الحسابات الأساسية المطلوبة...')
        if (hasMissingMappings) {
          console.log('⚠️ [CONTRACT_CREATION] حسابات أساسية مفقودة:', mappingStatus?.errors)
          
          updateStepStatus('accounts', 'warning', 'حسابات أساسية مفقودة، جاري إنشاؤها...')
          
          try {
            // إنشاء الحسابات الأساسية وربطها تلقائياً
            console.log('🔧 [CONTRACT_CREATION] إنشاء الحسابات الأساسية وربطها تلقائياً...')
            await autoConfigureEssentialMappings()
            
        // انتظار مختصر للتأكد من تحديث البيانات (مقلل من 2 ثانية)
        await new Promise(resolve => setTimeout(resolve, 500))
            
            console.log('✅ [CONTRACT_CREATION] تم إنشاء الحسابات والربط بنجاح')
            updateStepStatus('accounts', 'completed', undefined, ['تم إنشاء الحسابات الأساسية وربطها تلقائياً'])
          } catch (accountError: unknown) {
            const errorMessage = accountError instanceof Error ? accountError.message : 'خطأ غير معروف'
            console.error('❌ [CONTRACT_CREATION] فشل في إنشاء الحسابات الأساسية:', accountError)
            
            // Try alternative approach - let the contract creation handle account creation
            console.log('🔄 [CONTRACT_CREATION] محاولة الربط من خلال إنشاء العقد...')
            updateStepStatus('accounts', 'warning', 'سيتم إنشاء الحسابات أثناء إنشاء العقد')
          }
        } else {
          console.log('✅ [CONTRACT_CREATION] جميع الحسابات الأساسية موجودة')
          updateStepStatus('accounts', 'completed')
        }

        updateStepStatus('creation', 'processing')

        // استخدام الإدخال المباشر في جدول العقود
        console.log('🚀 [CONTRACT_CREATION] استخدام الإدخال المباشر في جدول العقود...')
        
        // Generate contract number
        const timestamp = Date.now().toString(36).toUpperCase()
        const random = Math.random().toString(36).substring(2, 6).toUpperCase()
        const contractNumber = `CON-${new Date().getFullYear().toString().slice(-2)}-${timestamp.slice(-4)}${random.slice(0, 2)}`
        
        const monthlyAmount = Number(inputContractData.monthly_amount || contractAmount) || contractAmount
        const vehicleId = inputContractData.vehicle_id === 'none' ? null : inputContractData.vehicle_id
        
        const { data: insertedContract, error: createError } = await supabase
          .from('contracts')
          .insert({
            company_id: companyId,
            customer_id: inputContractData.customer_id,
            vehicle_id: vehicleId || null,
            contract_type: inputContractData.contract_type || 'rental',
            contract_number: contractNumber,
            contract_date: inputContractData.start_date,
            start_date: inputContractData.start_date,
            end_date: inputContractData.end_date,
            monthly_amount: monthlyAmount,
            contract_amount: contractAmount,
            description: inputContractData.description || null,
            terms: inputContractData.terms || null,
            cost_center_id: inputContractData.cost_center_id || null,
            status: 'active',
            created_by: inputContractData.created_by || user?.id,
          })
          .select()
          .single()

        // معالجة أخطاء الاتصال بقاعدة البيانات
        if (createError) {
          console.error('❌ [CONTRACT_CREATION] خطأ في قاعدة البيانات:', createError)
          
          let errorMessage = `خطأ في قاعدة البيانات: ${createError.message}`
          
          updateStepStatus('validation', 'completed')
          updateStepStatus('accounts', 'completed')
          updateStepStatus('creation', 'failed', errorMessage)
          updateStepStatus('activation', 'failed', errorMessage)
          updateStepStatus('verification', 'failed', errorMessage)
          updateStepStatus('finalization', 'failed', errorMessage)
          
          await logContractStep(null, 'direct_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // معالجة عدم وجود استجابة
        if (!insertedContract) {
          const errorMessage = 'لم يتم تلقي استجابة من الخادم'
          console.error('❌ [CONTRACT_CREATION] لم يتم تلقي استجابة')
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'direct_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        console.log('✅ [CONTRACT_CREATION] تم إنشاء العقد بنجاح:', insertedContract)
        
        // تحديث حالة المركبة إذا تم اختيارها
        if (vehicleId) {
          console.log('🚗 [CONTRACT_CREATION] تحديث حالة المركبة إلى مؤجرة...')
          const { error: vehicleError } = await supabase
            .from('vehicles')
            .update({ status: 'rented' })
            .eq('id', vehicleId)
          
          if (vehicleError) {
            console.warn('⚠️ [CONTRACT_CREATION] فشل في تحديث حالة المركبة:', vehicleError)
          } else {
            console.log('✅ [CONTRACT_CREATION] تم تحديث حالة المركبة بنجاح')
          }
        }

        // تحديد حالة الخطوات بناءً على النتيجة
        updateStepStatus('validation', 'completed')
        updateStepStatus('accounts', 'completed')
        updateStepStatus('creation', 'completed')

        const contractId = insertedContract.id
        const journalEntryId = null // No journal entry with direct insert
        const warnings: string[] = []
        const requiresManualEntry = contractAmount > 0 // Manual entry needed if amount > 0

        // Link vehicle condition report to contract if exists
        if (inputContractData.vehicle_condition_report_id && contractId) {
          try {
            console.log('🔗 [CONTRACT_CREATION] ربط تقرير حالة المركبة بالعقد:', {
              report_id: inputContractData.vehicle_condition_report_id,
              contract_id: contractId
            })
            
            // Update the condition report to link it to the contract
            const { error: updateError } = await supabase
              .from('vehicle_condition_reports')
              .update({ contract_id: contractId })
              .eq('id', inputContractData.vehicle_condition_report_id)
            
            if (updateError) {
              console.error('❌ [CONTRACT_CREATION] فشل في ربط تقرير حالة المركبة:', updateError)
            } else {
              console.log('✅ [CONTRACT_CREATION] تم ربط تقرير حالة المركبة بنجاح')
              
              // Create a document entry for the condition report
              const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('user_id', user?.id)
                .single()
              
              if (profile) {
                const { error: docError } = await supabase
                  .from('contract_documents')
                  .insert({
                    company_id: profile.company_id,
                    contract_id: contractId,
                    document_type: 'condition_report',
                    document_name: `تقرير حالة المركبة - ${new Date().toLocaleDateString('en-GB')}`,
                    notes: 'تقرير حالة المركبة المأخوذ عند بداية العقد',
                    is_required: true,
                    condition_report_id: inputContractData.vehicle_condition_report_id,
                    uploaded_by: user?.id
                  })
                
                if (docError) {
                  console.error('❌ [CONTRACT_CREATION] فشل في إنشاء مستند تقرير الحالة:', docError)
                } else {
                  console.log('✅ [CONTRACT_CREATION] تم إنشاء مستند تقرير الحالة بنجاح')
                }
              }
            }
          } catch (error) {
            console.error('❌ [CONTRACT_CREATION] خطأ في ربط تقرير حالة المركبة:', error)
          }
        }

        // Enhanced document saving with improved error handling
        try {
          console.log('📄 [CONTRACT_CREATION] Initiating enhanced document saving...')
          
          // Fetch customer name for the document
          let customerName = 'العميل'
          try {
            const { data: customer } = await supabase
              .from('customers')
              .select('first_name, last_name, company_name, customer_type')
              .eq('id', inputContractData.customer_id)
              .single()
            
            if (customer) {
              customerName = customer.customer_type === 'individual' 
                ? `${customer.first_name} ${customer.last_name}`
                : customer.company_name || 'العميل'
            }
          } catch (error) {
            console.warn('⚠️ [CONTRACT_CREATION] Could not fetch customer name:', error)
          }

          // Prepare document data for saving
          const documentData = {
            contract_id: contractId,
            contract_number: typedResult.contract_number || contractId,
            contract_type: inputContractData.contract_type,
            customer_name: customerName,
            vehicle_info: inputContractData.vehicle_info,
            start_date: inputContractData.start_date,
            end_date: inputContractData.end_date,
            contract_amount: inputContractData.contract_amount,
            monthly_amount: inputContractData.monthly_amount,
            terms: inputContractData.terms,
            customer_signature: inputContractData.customer_signature,
            company_signature: inputContractData.company_signature,
            condition_report_id: inputContractData.vehicle_condition_report_id,
            company_name: 'الشركة', // Will be fetched from settings in the hook
            created_date: new Date().toISOString(),
            is_draft: !journalEntryId // Draft if no journal entry was created
          }
          
          console.log('📄 [CONTRACT_CREATION] Document data prepared:', {
            contractId,
            isDraft: documentData.is_draft,
            hasSignatures: !!(documentData.customer_signature || documentData.company_signature),
            hasConditionReport: !!documentData.condition_report_id
          })
          
          // Use enhanced document saving with progress tracking
          const savingResult = await saveDocuments(documentData)
          
          console.log('✅ [CONTRACT_CREATION] Enhanced document saving completed:', savingResult)
          
          // Log any warnings or errors without failing the contract creation
          if (savingResult.warnings.length > 0) {
            console.warn('⚠️ [CONTRACT_CREATION] Document saving warnings:', savingResult.warnings)
          }
          
          if (savingResult.errors.length > 0) {
            console.error('❌ [CONTRACT_CREATION] Document saving errors (non-fatal):', savingResult.errors)
          }
          
        } catch (error) {
          console.error('❌ [CONTRACT_CREATION] Enhanced document saving failed (non-fatal):', error)
          // Don't fail the entire contract creation process for document saving errors
          // This is part of the improved error handling - contract creation succeeds even if document saving fails
        }

        // معالجة حالة القيد المحاسبي
        if (journalEntryId) {
          // تم إنشاء القيد المحاسبي بنجاح
          updateStepStatus('activation', 'completed')
          updateStepStatus('verification', 'completed')
          updateStepStatus('finalization', 'completed')
          
          toast.success('تم إنشاء العقد والقيد المحاسبي بنجاح')
        } else if (requiresManualEntry) {
          // فشل في إنشاء القيد المحاسبي - يحتاج تدخل يدوي
          console.log('⚠️ [CONTRACT_CREATION] Contract created but journal entry requires manual creation')
          
          updateStepStatus('activation', 'warning', 'فشل في إنشاء القيد المحاسبي بعد عدة محاولات')
          updateStepStatus('verification', 'failed', 'يتطلب إنشاء قيد محاسبي يدوي - الرجاء إعداد ربط الحسابات في إعدادات الشركة')
          updateStepStatus('finalization', 'warning', 'تم إنشاء العقد ولكن يتطلب قيد محاسبي يدوي')
          
          // Show more specific error message
          toast.error('يتطلب إعداد ربط الحسابات لإنشاء القيود المحاسبية تلقائياً', {
            description: 'يرجى الذهاب إلى إعدادات الشركة وإعداد ربط الحسابات لحسابات الذمم والإيرادات',
            duration: 10000
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

      } catch (error: unknown) {
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
          } else if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = String((error as { message: unknown }).message)
            detailedError = errorMessage
          } else if (typeof error === 'object' && error !== null && 'error' in error) {
            const errorObj = (error as { error: unknown }).error
            errorMessage = typeof errorObj === 'object' && errorObj !== null && 'message' in errorObj
              ? String((errorObj as { message: unknown }).message)
              : String(errorObj)
            detailedError = JSON.stringify(errorObj)
          } else {
            detailedError = JSON.stringify(error)
            console.error('❌ [CONTRACT_CREATION] كائن الخطأ الخام:', error)
          }
          
          // تسجيل سياق إضافي للخطأ
          console.error('❌ [CONTRACT_CREATION] تفاصيل الخطأ:', {
            errorType: typeof error,
            errorConstructor: error && typeof error === 'object' && 'constructor' in error ? (error.constructor as { name?: string })?.name : undefined,
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
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'فشل في إنشاء العقد'
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

  const retryCreation = (originalData?: ContractInputData) => {
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

