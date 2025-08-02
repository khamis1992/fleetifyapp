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

interface AutoConfigResult {
  created?: string[]
  existing?: string[]
  errors?: string[]
  status?: string
}

interface ValidationResult {
  valid?: boolean
  errors?: string[]
}

export const useContractCreation = () => {
  const { companyId } = useUnifiedCompanyAccess()
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

  const updateStepStatus = (stepId: string, status: ContractCreationStep['status'], error?: string) => {
    setCreationState(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { ...step, status, error, retryCount: status === 'failed' ? (step.retryCount || 0) + 1 : step.retryCount }
          : step
      ),
      canRetry: status === 'failed'
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
      // Ensure contractId is properly typed - convert null to undefined for optional parameter
      const contractIdParam = contractId || undefined
      
      await supabase.rpc('log_contract_creation_step', {
        company_id_param: companyId as string,
        contract_id_param: contractIdParam,
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
      console.log('🚀 [CONTRACT_CREATION] Starting enhanced contract creation with fallback mechanism', {
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
        throw new Error('معرف الشركة مطلوب')
      }

      const startTime = Date.now()
      setCreationState(prev => ({ ...prev, isProcessing: true, canRetry: false }))

      try {
        // Update step statuses to processing
        updateStepStatus('validation', 'processing')
        updateStepStatus('accounts', 'processing')
        updateStepStatus('creation', 'processing')
        updateStepStatus('activation', 'processing')
        updateStepStatus('verification', 'processing')
        updateStepStatus('finalization', 'processing')

        await logContractStep(null, 'enhanced_creation', 'started')

        const contractRequestData = {
          company_id: companyId,
          customer_id: inputContractData.customer_id,
          vehicle_id: inputContractData.vehicle_id === 'none' ? null : inputContractData.vehicle_id,
          contract_number: inputContractData.contract_number,
          contract_date: inputContractData.contract_date,
          start_date: inputContractData.start_date,
          end_date: inputContractData.end_date,
          contract_amount: Number(inputContractData.contract_amount),
          monthly_amount: Number(inputContractData.monthly_amount || inputContractData.contract_amount),
          contract_type: inputContractData.contract_type,
          description: inputContractData.description || null,
          terms: inputContractData.terms || null,
          created_by: inputContractData.created_by
        }

        console.log('📝 [CONTRACT_CREATION] Using unified creation method:', contractRequestData)

        // Use the unified contract creation function
        const { data: result, error: createError } = await supabase
          .rpc('create_contract_with_journal_entry', {
            contract_data: contractRequestData
          })

        // Handle database connection errors
        if (createError) {
          console.error('❌ [CONTRACT_CREATION] Database error:', createError)
          
          const errorMessage = `Database error: ${createError.message}`
          // Update all steps to failed
          updateStepStatus('validation', 'failed', errorMessage)
          updateStepStatus('accounts', 'failed', errorMessage)
          updateStepStatus('creation', 'failed', errorMessage)
          updateStepStatus('activation', 'failed', errorMessage)
          updateStepStatus('verification', 'failed', errorMessage)
          updateStepStatus('finalization', 'failed', errorMessage)
          
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // Handle unexpected response format
        if (!result) {
          const errorMessage = 'لم يتم تلقي استجابة من الخادم'
          console.error('❌ [CONTRACT_CREATION] No response received')
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // Handle non-object response
        if (typeof result !== 'object') {
          const errorMessage = `تنسيق استجابة غير متوقع: متوقع كائن، حصلت على ${typeof result}`
          console.error('❌ [CONTRACT_CREATION] Unexpected response type:', typeof result)
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        interface ContractCreationResult {
          success: boolean
          contract_id: string
          contract_number?: string
          journal_entry_id?: string
          warning?: string
          requires_manual_entry?: boolean
          message?: string
          error?: string
        }

        const typedResult = result as unknown as ContractCreationResult

        // Validate response structure
        if (!typedResult.hasOwnProperty('success')) {
          const errorMessage = 'تنسيق استجابة غير صحيح: خاصية النجاح مفقودة'
          console.error('❌ [CONTRACT_CREATION] Invalid response format - missing success property:', result)
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // Handle failed contract creation
        if (typedResult.success !== true) {
          const errorMessage = typedResult.error || 'فشل في إنشاء العقد لسبب غير معروف'
          console.error('❌ [CONTRACT_CREATION] Contract creation failed:', result)
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // Validate contract_id is present on success
        if (!typedResult.contract_id) {
          const errorMessage = 'تم إنشاء العقد ولكن معرف العقد مفقود'
          console.error('❌ [CONTRACT_CREATION] Success response missing contract_id:', result)
          
          updateStepStatus('creation', 'failed', errorMessage)
          await logContractStep(null, 'enhanced_creation', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        console.log('✅ [CONTRACT_CREATION] Contract created successfully:', typedResult)

        // Mark creation and validation as completed
        updateStepStatus('validation', 'completed')
        updateStepStatus('accounts', 'completed')
        updateStepStatus('creation', 'completed')

        const contractId = typedResult.contract_id
        const journalEntryId = typedResult.journal_entry_id
        const warning = typedResult.warning
        const requiresManualEntry = typedResult.requires_manual_entry || false

        // Handle journal entry status based on new enhanced response
        if (journalEntryId) {
          // Journal entry created successfully
          updateStepStatus('activation', 'completed')
          updateStepStatus('verification', 'completed')
          updateStepStatus('finalization', 'completed')
        } else if (requiresManualEntry) {
          // Journal entry failed after retries - needs manual intervention
          updateStepStatus('activation', 'warning', warning || 'Journal entry creation failed after retries')
          updateStepStatus('verification', 'failed', 'Manual journal entry required')
          updateStepStatus('finalization', 'warning', 'Contract created but requires manual journal entry')
        } else {
          // Journal entry is pending - show warning but mark as completed with fallback
          updateStepStatus('activation', 'warning', 'Journal entry queued for automatic retry')
          updateStepStatus('verification', 'warning', 'Will be verified automatically')
          updateStepStatus('finalization', 'completed')
        }

        const hasWarnings = !!warning || requiresManualEntry
        
        setCreationState(prev => ({ 
          ...prev, 
          contractId, 
          isProcessing: false,
          hasWarnings,
          healthStatus: requiresManualEntry ? 'error' : (hasWarnings ? 'warning' : 'good')
        }))

        await logContractStep(contractId, 'enhanced_creation', 'completed', 1, null, Date.now() - startTime)

        console.log('🎉 [CONTRACT_CREATION] Enhanced process completed:', {
          contractId,
          journalEntryId,
          warning,
          requiresManualEntry,
          totalTime: Date.now() - startTime
        })

        // Get the full contract data for return
        const { data: createdContractData, error: fetchError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single()

        if (fetchError || !createdContractData) {
          console.warn('⚠️ [CONTRACT_CREATION] Could not fetch created contract data:', fetchError)
          // Return minimal contract data
          return { 
            id: contractId, 
            contract_number: contractRequestData.contract_number,
            status: journalEntryId ? 'active' : 'draft'
          }
        }

        return createdContractData

      } catch (error: any) {
        console.error('❌ [CONTRACT_CREATION] Process failed:', error)
        
        // Enhanced error handling and logging
        let errorMessage = 'حدث خطأ غير متوقع أثناء إنشاء العقد'
        let detailedError = 'Unknown error'
        
        if (error) {
          // Handle different error types
          if (typeof error === 'string') {
            errorMessage = error
            detailedError = error
          } else if (error instanceof Error) {
            errorMessage = error.message || errorMessage
            detailedError = error.message
            console.error('❌ [CONTRACT_CREATION] Error stack:', error.stack)
          } else if (error.message) {
            errorMessage = error.message
            detailedError = error.message
          } else if (error.error) {
            errorMessage = error.error.message || error.error
            detailedError = JSON.stringify(error.error)
          } else {
            detailedError = JSON.stringify(error)
            console.error('❌ [CONTRACT_CREATION] Raw error object:', error)
          }
          
          // Log additional error context
          console.error('❌ [CONTRACT_CREATION] Error details:', {
            errorType: typeof error,
            errorConstructor: error?.constructor?.name,
            errorMessage: errorMessage,
            currentStep: creationState.currentStep,
            timestamp: new Date().toISOString()
          })
        }
        
        setCreationState(prev => ({ ...prev, isProcessing: false, canRetry: true }))
        
        await logContractStep(null, 'unified_creation', 'failed', 1, detailedError, Date.now() - startTime)
        
        // Throw a properly formatted error
        const formattedError = new Error(errorMessage)
        formattedError.name = 'ContractCreationError'
        throw formattedError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('تم إنشاء العقد بنجاح')
    },
    onError: (error: any) => {
      console.error('❌ [CONTRACT_CREATION] Mutation failed:', error)
      
      // Enhanced error messaging for users
      let userMessage = 'فشل في إنشاء العقد'
      
      if (error && error.message) {
        // Check for specific error patterns and provide helpful messages
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
        } else {
          userMessage = error.message
        }
      }
      
      toast.error(userMessage, {
        description: 'يمكنك المحاولة مرة أخرى أو التواصل مع الدعم الفني إذا استمر الخطأ',
        duration: 6000
      })
    }
  })

  const retryCreation = () => {
    if (creationState.contractId && creationState.canRetry) {
      // Reset failed steps and retry
      setCreationState(prev => ({
        ...prev,
        steps: prev.steps.map(step => 
          step.status === 'failed' ? { ...step, status: 'pending' } : step
        ),
        canRetry: false
      }))
      
      // Continue from where it failed
      // This would need the original contract data, which could be stored in state
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