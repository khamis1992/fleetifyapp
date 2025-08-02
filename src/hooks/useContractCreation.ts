import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'

export interface ContractCreationStep {
  id: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  retryCount?: number
}

export interface ContractCreationState {
  currentStep: number
  steps: ContractCreationStep[]
  contractId?: string
  isProcessing: boolean
  canRetry: boolean
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
    canRetry: false
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
      await supabase.rpc('log_contract_creation_step', {
        company_id_param: companyId,
        contract_id_param: contractId,
        step_name: stepName,
        status_param: status,
        attempt_num: attemptNum,
        error_msg: errorMsg,
        exec_time: execTime,
        meta: meta
      })
    } catch (error) {
      console.warn('Failed to log contract creation step:', error)
    }
  }

  const createContractMutation = useMutation({
    mutationFn: async (contractData: any) => {
      console.log('🚀 [CONTRACT_CREATION] Starting unified database-driven contract creation', {
        contractType: contractData.contract_type,
        amount: contractData.contract_amount,
        customerId: contractData.customer_id,
        vehicleId: contractData.vehicle_id,
        startDate: contractData.start_date,
        endDate: contractData.end_date
      })
      
      if (!contractData) {
        throw new Error('بيانات العقد مطلوبة')
      }
      
      if (!companyId) {
        throw new Error('معرف الشركة مطلوب')
      }

      const startTime = Date.now()
      setCreationState(prev => ({ ...prev, isProcessing: true, canRetry: false }))

      try {
        // Single unified step that handles everything in the database
        updateStepStatus('validation', 'processing')
        updateStepStatus('accounts', 'processing')
        updateStepStatus('creation', 'processing')
        updateStepStatus('activation', 'processing')
        updateStepStatus('verification', 'processing')
        updateStepStatus('finalization', 'processing')

        await logContractStep(null, 'unified_creation', 'started')

        const cleanContractData = {
          company_id: companyId,
          customer_id: contractData.customer_id,
          vehicle_id: contractData.vehicle_id === 'none' ? null : contractData.vehicle_id,
          contract_number: contractData.contract_number,
          contract_date: contractData.contract_date,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          contract_amount: Number(contractData.contract_amount),
          monthly_amount: Number(contractData.monthly_amount || contractData.contract_amount),
          contract_type: contractData.contract_type,
          description: contractData.description || null,
          terms: contractData.terms || null,
          created_by: contractData.created_by
        }

        console.log('📝 [CONTRACT_CREATION] Creating contract directly in database:', cleanContractData)

        // Insert contract directly and let triggers handle the rest
        const { data: newContract, error: createError } = await supabase
          .from('contracts')
          .insert({
            ...cleanContractData,
            status: 'active' // Set as active to trigger journal entry creation
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ [CONTRACT_CREATION] Creation failed:', createError)
          
          // Update all steps to failed
          updateStepStatus('validation', 'failed', createError.message)
          updateStepStatus('accounts', 'failed', createError.message)
          updateStepStatus('creation', 'failed', createError.message)
          updateStepStatus('activation', 'failed', createError.message)
          updateStepStatus('verification', 'failed', createError.message)
          updateStepStatus('finalization', 'failed', createError.message)
          
          await logContractStep(null, 'unified_creation', 'failed', 1, createError.message)
          throw createError
        }

        console.log('✅ [CONTRACT_CREATION] Contract created successfully:', newContract.id)

        // Mark all steps as completed
        updateStepStatus('validation', 'completed')
        updateStepStatus('accounts', 'completed')
        updateStepStatus('creation', 'completed')
        updateStepStatus('activation', 'completed')
        updateStepStatus('verification', 'completed')
        updateStepStatus('finalization', 'completed')

        const contractId = newContract.id
        setCreationState(prev => ({ ...prev, contractId, isProcessing: false }))

        await logContractStep(contractId, 'unified_creation', 'completed', 1, null, Date.now() - startTime)

        console.log('🎉 [CONTRACT_CREATION] Process completed successfully:', {
          contractId,
          contractNumber: newContract.contract_number,
          totalTime: Date.now() - startTime
        })

        return newContract

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
      canRetry: false
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