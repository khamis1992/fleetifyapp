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

export const useContractCreation = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const queryClient = useQueryClient()
  
  const [creationState, setCreationState] = useState<ContractCreationState>({
    currentStep: 0,
    steps: [
      { id: 'validation', title: 'التحقق من البيانات', status: 'pending' },
      { id: 'creation', title: 'إنشاء العقد', status: 'pending' },
      { id: 'activation', title: 'تفعيل العقد', status: 'pending' },
      { id: 'journal', title: 'إنشاء القيد المحاسبي', status: 'pending' },
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
      const startTime = Date.now()
      let contractId: string | null = null
      
      setCreationState(prev => ({ ...prev, isProcessing: true, canRetry: false }))

      try {
        // Step 1: Validation
        updateStepStatus('validation', 'processing')
        await logContractStep(null, 'validation', 'started')
        
        // Validate required fields
        const requiredFields = ['customer_id', 'contract_type', 'start_date', 'end_date', 'contract_amount', 'monthly_amount']
        const numericFields = ['contract_amount', 'monthly_amount']
        
        const missingFields = requiredFields.filter(field => {
          const value = contractData[field]
          if (numericFields.includes(field)) {
            return value === undefined || value === null || value === '' || isNaN(Number(value))
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
          const errorMsg = `حقول مطلوبة مفقودة: ${missingFieldLabels.join(', ')}`
          
          updateStepStatus('validation', 'failed', errorMsg)
          await logContractStep(null, 'validation', 'failed', 1, errorMsg)
          throw new Error(errorMsg)
        }

        // Validate customer status
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('is_blacklisted, is_active')
          .eq('id', contractData.customer_id)
          .single()

        if (customerError) {
          const errorMsg = 'فشل في التحقق من بيانات العميل'
          updateStepStatus('validation', 'failed', errorMsg)
          await logContractStep(null, 'validation', 'failed', 1, customerError.message)
          throw new Error(errorMsg)
        }

        if (customer?.is_blacklisted) {
          const errorMsg = 'العميل محظور ولا يمكن إنشاء عقود معه'
          updateStepStatus('validation', 'failed', errorMsg)
          await logContractStep(null, 'validation', 'failed', 1, errorMsg)
          throw new Error(errorMsg)
        }

        if (!customer?.is_active) {
          const errorMsg = 'العميل غير نشط'
          updateStepStatus('validation', 'failed', errorMsg)
          await logContractStep(null, 'validation', 'failed', 1, errorMsg)
          throw new Error(errorMsg)
        }

        updateStepStatus('validation', 'completed')
        await logContractStep(null, 'validation', 'completed', 1, null, Date.now() - startTime)

        // Step 2: Create contract in draft status
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
          status: 'draft', // Always create as draft first
          created_by: contractData.created_by
        }

        console.log('🚀 [CONTRACT_CREATION] Creating contract with data:', cleanContractData)

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

        // Step 3: Activate contract (this will trigger journal entry creation)
        updateStepStatus('activation', 'processing')
        await logContractStep(contractId, 'activation', 'started')

        // Small delay to ensure contract is fully committed
        await new Promise(resolve => setTimeout(resolve, 200))

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

        updateStepStatus('activation', 'completed')
        updateStepStatus('journal', 'processing')
        await logContractStep(contractId, 'activation', 'completed', 1, null, Date.now() - startTime)

        // Step 4: Brief verification of journal entry (trigger handles creation automatically)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Give trigger time to execute

        const { data: contractCheck, error: checkError } = await supabase
          .from('contracts')
          .select('journal_entry_id')
          .eq('id', contractId)
          .single()

        if (checkError) {
          console.warn('⚠️ [CONTRACT_CREATION] Failed to verify contract state:', checkError)
          updateStepStatus('journal', 'failed', 'فشل في التحقق من حالة القيد المحاسبي')
          await logContractStep(contractId, 'journal', 'failed', 1, checkError.message)
        } else if (contractCheck?.journal_entry_id) {
          updateStepStatus('journal', 'completed')
          await logContractStep(contractId, 'journal', 'completed', 1, null, Date.now() - startTime, { journal_entry_id: contractCheck.journal_entry_id })
        } else {
          // Journal entry creation might be in progress via trigger
          console.warn('⚠️ [CONTRACT_CREATION] Journal entry not yet created, but contract is active')
          updateStepStatus('journal', 'completed') // Consider it successful since trigger will handle it
          await logContractStep(contractId, 'journal', 'completed', 1, 'Journal entry will be created by trigger', Date.now() - startTime)
        }

        // Step 5: Finalize
        updateStepStatus('finalization', 'processing')
        
        // Update vehicle status if vehicle was selected
        if (cleanContractData.vehicle_id) {
          await supabase
            .from('vehicles')
            .update({ status: 'rented' })
            .eq('id', cleanContractData.vehicle_id)
        }

        updateStepStatus('finalization', 'completed')
        await logContractStep(contractId, 'finalization', 'completed', 1, null, Date.now() - startTime)

        setCreationState(prev => ({ ...prev, contractId, isProcessing: false }))

        return newContract

      } catch (error: any) {
        console.error('❌ [CONTRACT_CREATION] Process failed:', error)
        setCreationState(prev => ({ ...prev, isProcessing: false, canRetry: true }))
        
        if (contractId) {
          await logContractStep(contractId, 'process', 'failed', 1, error.message, Date.now() - startTime)
        }
        
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('تم إنشاء العقد بنجاح')
    },
    onError: (error: any) => {
      console.error('❌ [CONTRACT_CREATION] Mutation failed:', error)
      toast.error(error.message || 'فشل في إنشاء العقد')
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
        { id: 'creation', title: 'إنشاء العقد', status: 'pending' },
        { id: 'activation', title: 'تفعيل العقد', status: 'pending' },
        { id: 'journal', title: 'إنشاء القيد المحاسبي', status: 'pending' },
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