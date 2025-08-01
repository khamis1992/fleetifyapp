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

        // Step 3: Create journal entry first (before activation)
        updateStepStatus('journal', 'processing')
        await logContractStep(contractId, 'journal', 'started')

        try {
          const { data: journalEntryId, error: journalError } = await supabase
            .rpc('create_contract_journal_entry', {
              contract_id_param: contractId
            })

          if (journalError) {
            console.error('❌ [CONTRACT_CREATION] Journal entry failed:', journalError)
            
            // Check if this is a configuration error (missing accounts)
            if (journalError.code === 'configuration_error') {
              console.log('🔧 [CONTRACT_CREATION] Attempting to auto-configure account mappings...')
              
              // Try to auto-configure essential account mappings
              const { data: autoConfigResult, error: autoConfigError } = await supabase
                .rpc('ensure_essential_account_mappings', {
                  company_id_param: companyId
                })
              
              if (autoConfigError) {
                console.error('❌ [CONTRACT_CREATION] Auto-configuration failed:', autoConfigError)
                const errorMsg = `فشل في إنشاء القيد المحاسبي: ${journalError.message}. ${journalError.hint || 'يرجى إعداد ربط الحسابات في صفحة المالية > ربط الحسابات.'}`
                updateStepStatus('journal', 'failed', errorMsg)
                await logContractStep(contractId, 'journal', 'failed', 1, errorMsg)
                throw new Error(errorMsg)
              }
              
              console.log('✅ [CONTRACT_CREATION] Auto-configuration result:', autoConfigResult)
              
              const configResult = autoConfigResult as AutoConfigResult
              
              // If any accounts were created, retry journal entry
              if (configResult?.created?.length && configResult.created.length > 0) {
                console.log('🔄 [CONTRACT_CREATION] Retrying journal entry creation after auto-configuration...')
                const { data: retryJournalId, error: retryJournalError } = await supabase
                  .rpc('create_contract_journal_entry', {
                    contract_id_param: contractId
                  })
                
                if (retryJournalError) {
                  console.error('❌ [CONTRACT_CREATION] Retry journal entry failed:', retryJournalError)
                  updateStepStatus('journal', 'failed', retryJournalError.message)
                  await logContractStep(contractId, 'journal', 'failed', 2, retryJournalError.message)
                  throw retryJournalError
                }
                
                console.log('✅ [CONTRACT_CREATION] Journal entry created on retry:', retryJournalId)
                await logContractStep(contractId, 'journal', 'completed', 2, `Auto-configured accounts: ${configResult.created!.join(', ')}`, Date.now() - startTime)
              } else {
                // No accounts could be auto-configured
                const missingAccountsMessage = configResult?.errors && configResult.errors.length > 0
                  ? `الحسابات المفقودة: ${configResult.errors.join(', ')}`
                  : 'لم يتم العثور على الحسابات المطلوبة'
                
                const errorMsg = `${journalError.message}. ${missingAccountsMessage}. يرجى إعداد ربط الحسابات يدوياً في صفحة المالية > ربط الحسابات.`
                updateStepStatus('journal', 'failed', errorMsg)
                await logContractStep(contractId, 'journal', 'failed', 1, errorMsg)
                throw new Error(errorMsg)
              }
            } else {
              // Other types of journal entry errors
              updateStepStatus('journal', 'failed', journalError.message)
              await logContractStep(contractId, 'journal', 'failed', 1, journalError.message)
              throw journalError
            }
          } else {
            console.log('✅ [CONTRACT_CREATION] Journal entry created successfully:', journalEntryId)
            await logContractStep(contractId, 'journal', 'completed', 1, null, Date.now() - startTime)
          }
        } catch (journalEntryError: any) {
          await logContractStep(contractId, 'journal', 'failed', 1, journalEntryError.message)
          throw journalEntryError
        }

        updateStepStatus('journal', 'completed')
        
        // Step 4: Now activate the contract
        updateStepStatus('activation', 'processing')
        await logContractStep(contractId, 'activation', 'started')

        // Small delay to ensure journal entry is fully committed
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

        console.log('✅ [CONTRACT_CREATION] Contract activated successfully')
        updateStepStatus('activation', 'completed')
        await logContractStep(contractId, 'activation', 'completed', 1, null, Date.now() - startTime)

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