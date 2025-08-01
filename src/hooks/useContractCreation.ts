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
      console.log('🚀 [CONTRACT_CREATION] Starting simplified database-driven contract creation', {
        contractType: contractData.contract_type,
        amount: contractData.contract_amount,
        customerId: contractData.customer_id,
        vehicleId: contractData.vehicle_id,
        startDate: contractData.start_date,
        endDate: contractData.end_date
      })
      
      // Enhanced pre-flight validation
      if (!contractData) {
        throw new Error('بيانات العقد مطلوبة')
      }
      
      if (!companyId) {
        throw new Error('معرف الشركة مطلوب')
      }

      const startTime = Date.now()
      let contractId: string | null = null
      
      setCreationState(prev => ({ ...prev, isProcessing: true, canRetry: false }))

      try {
        // Step 1: Validation
        updateStepStatus('validation', 'processing')
        await logContractStep(null, 'validation', 'started')
        
        // Enhanced validation with detailed checks
        console.log('🔍 [CONTRACT_CREATION] Starting comprehensive validation...')
        
        // Basic field validation with type checking
        const requiredFields = ['customer_id', 'contract_type', 'start_date', 'end_date', 'contract_amount', 'monthly_amount']
        const numericFields = ['contract_amount', 'monthly_amount']
        const dateFields = ['start_date', 'end_date', 'contract_date']
        
        const missingFields = requiredFields.filter(field => {
          const value = contractData[field]
          if (numericFields.includes(field)) {
            return value === undefined || value === null || value === '' || isNaN(Number(value)) || Number(value) <= 0
          }
          return !value || (typeof value === 'string' && value.trim() === '')
        })
        
        if (missingFields.length > 0) {
          const fieldLabels = {
            'customer_id': 'العميل',
            'contract_type': 'نوع العقد', 
            'start_date': 'تاريخ البداية',
            'end_date': 'تاريخ النهاية',
            'contract_amount': 'قيمة العقد',
            'monthly_amount': 'المبلغ الشهري'
          }
          const missingFieldLabels = missingFields.map(field => fieldLabels[field] || field)
          const errorMsg = `حقول مطلوبة مفقودة أو غير صحيحة: ${missingFieldLabels.join(', ')}`
          
          console.error('❌ [CONTRACT_CREATION] Missing or invalid fields:', { missingFields, contractData })
          updateStepStatus('validation', 'failed', errorMsg)
          await logContractStep(null, 'validation', 'failed', 1, errorMsg)
          throw new Error(errorMsg)
        }

        // Date validation
        for (const dateField of dateFields) {
          if (contractData[dateField] && contractData[dateField] !== '') {
            const dateValue = new Date(contractData[dateField])
            if (isNaN(dateValue.getTime())) {
              const errorMsg = `تاريخ غير صحيح: ${dateField}`
              console.error('❌ [CONTRACT_CREATION] Invalid date:', { field: dateField, value: contractData[dateField] })
              updateStepStatus('validation', 'failed', errorMsg)
              await logContractStep(null, 'validation', 'failed', 1, errorMsg)
              throw new Error(errorMsg)
            }
          }
        }

        // UUID validation for customer and vehicle
        const uuidFields = ['customer_id', 'vehicle_id']
        for (const uuidField of uuidFields) {
          if (contractData[uuidField] && contractData[uuidField] !== '' && contractData[uuidField] !== 'none') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(contractData[uuidField])) {
              const errorMsg = `معرف غير صحيح: ${uuidField}`
              console.error('❌ [CONTRACT_CREATION] Invalid UUID:', { field: uuidField, value: contractData[uuidField] })
              updateStepStatus('validation', 'failed', errorMsg)
              await logContractStep(null, 'validation', 'failed', 1, errorMsg)
              throw new Error(errorMsg)
            }
          }
        }

        // Business logic validation
        const startDate = new Date(contractData.start_date)
        const endDate = new Date(contractData.end_date)
        if (endDate <= startDate) {
          const errorMsg = 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية'
          console.error('❌ [CONTRACT_CREATION] End date before start date:', { startDate, endDate })
          updateStepStatus('validation', 'failed', errorMsg)
          await logContractStep(null, 'validation', 'failed', 1, errorMsg)
          throw new Error(errorMsg)
        }

        console.log('✅ [CONTRACT_CREATION] Client-side validation passed')

        // Enhanced database validation with better error handling
        console.log('🔍 [CONTRACT_CREATION] Calling database validation function...')
        
        try {
          const validationResult = await supabase
            .rpc('validate_contract_data', { contract_data: contractData })
          
          console.log('🔍 [CONTRACT_CREATION] Database validation result:', validationResult)
          
          if (validationResult.error) {
            const errorMsg = `فشل في التحقق من البيانات: ${validationResult.error.message}`
            console.error('❌ [CONTRACT_CREATION] Database validation error:', validationResult.error)
            updateStepStatus('validation', 'failed', errorMsg)
            await logContractStep(null, 'validation', 'failed', 1, validationResult.error.message)
            throw new Error(errorMsg)
          }
          
          const validationData = validationResult.data as ValidationResult
          console.log('✅ [CONTRACT_CREATION] Validation data received:', validationData)
          
          if (!validationData?.valid) {
            const errors = validationData?.errors || ['فشل في التحقق من البيانات']
            const errorMsg = `التحقق من صحة البيانات: ${errors.join(', ')}`
            updateStepStatus('validation', 'failed', errorMsg)
            await logContractStep(null, 'validation', 'failed', 1, errorMsg)
            throw new Error(errorMsg)
          }
        } catch (dbValidationError: any) {
          console.error('❌ [CONTRACT_CREATION] Database validation exception:', dbValidationError)
          const errorMsg = `خطأ في التحقق من البيانات: ${dbValidationError.message || 'خطأ غير متوقع'}`
          updateStepStatus('validation', 'failed', errorMsg)
          await logContractStep(null, 'validation', 'failed', 1, dbValidationError.message)
          throw new Error(errorMsg)
        }

        updateStepStatus('validation', 'completed')
        await logContractStep(null, 'validation', 'completed', 1, null, Date.now() - startTime)

        // Step 2: Check and ensure account mappings
        updateStepStatus('accounts', 'processing')
        await logContractStep(null, 'accounts', 'started')

        try {
          console.log('🔗 [CONTRACT_CREATION] Checking account mappings...')
          
          const { data: autoConfigResult, error: autoConfigError } = await supabase
            .rpc('ensure_essential_account_mappings', { 
              company_id_param: companyId 
            })

          console.log('🔗 [CONTRACT_CREATION] Account mapping result:', { autoConfigResult, autoConfigError })

          if (autoConfigError) {
            const errorMsg = `فشل في فحص ربط الحسابات: ${autoConfigError.message}`
            console.error('❌ [CONTRACT_CREATION] Account mapping RPC error:', autoConfigError)
            updateStepStatus('accounts', 'failed', errorMsg)
            await logContractStep(null, 'accounts', 'failed', 1, autoConfigError.message)
            throw new Error(errorMsg)
          }

          const configData = autoConfigResult as AutoConfigResult
          if (configData?.errors && configData.errors.length > 0) {
            const errorMsg = `ربط الحسابات غير مكتمل: ${configData.errors.join(', ')}`
            console.warn('⚠️ [CONTRACT_CREATION] Account mapping incomplete:', configData.errors)
            updateStepStatus('accounts', 'failed', errorMsg)
            await logContractStep(null, 'accounts', 'failed', 1, errorMsg)
            throw new Error(errorMsg)
          }

          console.log('✅ [CONTRACT_CREATION] Account mappings verified:', configData)
          updateStepStatus('accounts', 'completed')
          await logContractStep(null, 'accounts', 'completed', 1, null, Date.now() - startTime, autoConfigResult)

        } catch (mappingError: any) {
          console.error('❌ [CONTRACT_CREATION] Account mapping exception:', mappingError)
          const errorMessage = mappingError?.message || 'خطأ في فحص ربط الحسابات'
          updateStepStatus('accounts', 'failed', errorMessage)
          await logContractStep(null, 'accounts', 'failed', 1, errorMessage)
          throw new Error(errorMessage)
        }

        // Step 3: Create contract record
        updateStepStatus('creation', 'processing')
        await logContractStep(null, 'creation', 'started')

        const cleanContractData = {
          company_id: companyId,
          customer_id: contractData.customer_id,
          vehicle_id: contractData.vehicle_id === 'none' ? null : contractData.vehicle_id,
          contract_number: contractData.contract_number,
          contract_date: contractData.contract_date,
          start_date: contractData.start_date,
          end_date: contractData.end_date,
          contract_amount: Number(contractData.contract_amount),
          monthly_amount: Number(contractData.monthly_amount),
          contract_type: contractData.contract_type,
          description: contractData.description || null,
          terms: contractData.terms || null,
          status: 'draft', // Start as draft
          created_by: contractData.created_by
        }

        console.log('📝 [CONTRACT_CREATION] Creating contract record:', cleanContractData)

        const { data: newContract, error: createError } = await supabase
          .from('contracts')
          .insert(cleanContractData)
          .select()
          .single()

        if (createError) {
          console.error('❌ [CONTRACT_CREATION] Create failed:', createError)
          updateStepStatus('creation', 'failed', createError.message)
          await logContractStep(null, 'creation', 'failed', 1, createError.message)
          throw createError
        }

        contractId = newContract.id
        console.log('✅ [CONTRACT_CREATION] Contract created successfully:', contractId)
        
        updateStepStatus('creation', 'completed')
        await logContractStep(contractId, 'creation', 'completed', 1, null, Date.now() - startTime)

        // Step 4: Activate contract (journal entry will be created by database trigger)
        updateStepStatus('activation', 'processing')
        await logContractStep(contractId, 'activation', 'started')

        // Add delay to ensure proper transaction isolation
        await new Promise(resolve => setTimeout(resolve, 500))

        const { error: activationError } = await supabase
          .from('contracts')
          .update({ status: 'active' })
          .eq('id', contractId)

        if (activationError) {
          console.error('❌ [CONTRACT_CREATION] Activation failed:', activationError)
          updateStepStatus('activation', 'failed', activationError.message)
          await logContractStep(contractId, 'activation', 'failed', 1, activationError.message)
          throw activationError
        }

        console.log('✅ [CONTRACT_CREATION] Contract activated (journal entry created by trigger)')
        updateStepStatus('activation', 'completed')
        await logContractStep(contractId, 'activation', 'completed', 1, null, Date.now() - startTime)

        // Step 5: Verify journal entry creation (with polling)
        updateStepStatus('verification', 'processing')
        await logContractStep(contractId, 'verification', 'started')

        let journalEntryVerified = false
        let attempts = 0
        const maxAttempts = 10

        while (!journalEntryVerified && attempts < maxAttempts) {
          attempts++
          await new Promise(resolve => setTimeout(resolve, 500))

          const { data: contractCheck } = await supabase
            .from('contracts')
            .select('journal_entry_id')
            .eq('id', contractId)
            .single()

          if (contractCheck?.journal_entry_id) {
            journalEntryVerified = true
            console.log('✅ [CONTRACT_CREATION] Journal entry verified:', contractCheck.journal_entry_id)
            updateStepStatus('verification', 'completed')
            await logContractStep(contractId, 'verification', 'completed', 1, null, Date.now() - startTime)
          } else if (attempts === maxAttempts) {
            console.warn('⚠️ [CONTRACT_CREATION] Journal entry verification timeout')
            updateStepStatus('verification', 'failed', 'انتهت مهلة التحقق من القيد المحاسبي (سيتم إنشاؤه بواسطة المهمة الخلفية)')
            await logContractStep(contractId, 'verification', 'failed', 1, 'Journal entry verification timeout')
            // Don't throw error - contract is still active
          }
        }

        // Step 6: Finalize - Update vehicle status if applicable
        updateStepStatus('finalization', 'processing')
        
        if (cleanContractData.vehicle_id) {
          await logContractStep(contractId, 'finalization', 'started')
          
          const { error: vehicleError } = await supabase
            .from('vehicles')
            .update({ status: 'rented' })
            .eq('id', cleanContractData.vehicle_id)

          if (vehicleError) {
            console.warn('⚠️ [CONTRACT_CREATION] Vehicle status update failed:', vehicleError)
            updateStepStatus('finalization', 'failed', `فشل في تحديث حالة المركبة: ${vehicleError.message}`)
            await logContractStep(contractId, 'finalization', 'failed', 1, vehicleError.message)
          } else {
            console.log('✅ [CONTRACT_CREATION] Vehicle status updated to rented')
            updateStepStatus('finalization', 'completed')
            await logContractStep(contractId, 'finalization', 'completed', 1, null, Date.now() - startTime)
          }
        } else {
          updateStepStatus('finalization', 'completed')
          await logContractStep(contractId, 'finalization', 'completed', 1, 'No vehicle to update', Date.now() - startTime)
        }

        setCreationState(prev => ({ ...prev, contractId, isProcessing: false }))

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
            contractId: contractId,
            currentStep: creationState.currentStep,
            timestamp: new Date().toISOString()
          })
        }
        
        setCreationState(prev => ({ ...prev, isProcessing: false, canRetry: true }))
        
        if (contractId) {
          await logContractStep(contractId, 'process', 'failed', 1, detailedError, Date.now() - startTime)
        }
        
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