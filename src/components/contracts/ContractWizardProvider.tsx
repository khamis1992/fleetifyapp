import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface ContractWizardData {
  // Basic Info
  contract_number: string
  contract_date: string
  contract_type: string
  description: string
  terms: string
  
  // Customer & Vehicle
  customer_id: string
  vehicle_id: string
  
  // Dates & Duration
  start_date: string
  end_date: string
  rental_days: number
  
  // Financial
  contract_amount: number
  monthly_amount: number
  account_id: string
  cost_center_id: string
  
  // Validation & Approval
  validation_status: 'pending' | 'validating' | 'valid' | 'invalid'
  validation_errors: string[]
  requires_approval: boolean
  approval_steps: any[]
  
  // Draft metadata
  is_draft: boolean
  draft_id?: string
  last_saved_at?: string
}

interface ContractWizardContextType {
  data: ContractWizardData
  currentStep: number
  totalSteps: number
  updateData: (updates: Partial<ContractWizardData>) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  saveDraft: () => Promise<void>
  loadDraft: (draftId: string) => Promise<void>
  deleteDraft: () => Promise<void>
  isAutoSaving: boolean
  canProceedToNext: () => boolean
  submitContract: () => Promise<void>
}

const ContractWizardContext = createContext<ContractWizardContextType | null>(null)

const defaultData: ContractWizardData = {
  contract_number: '',
  contract_date: new Date().toISOString().slice(0, 10),
  contract_type: 'rental',
  description: '',
  terms: '',
  customer_id: '',
  vehicle_id: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  rental_days: 1,
  contract_amount: 0,
  monthly_amount: 0,
  account_id: '',
  cost_center_id: '',
  validation_status: 'pending',
  validation_errors: [],
  requires_approval: false,
  approval_steps: [],
  is_draft: true
}

interface ContractWizardProviderProps {
  children: ReactNode
  onSubmit?: (data: ContractWizardData) => Promise<void>
  preselectedCustomerId?: string
}

export const ContractWizardProvider: React.FC<ContractWizardProviderProps> = ({
  children,
  onSubmit,
  preselectedCustomerId
}) => {
  const { user } = useAuth()
  const [data, setData] = useState<ContractWizardData>(defaultData)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const totalSteps = 5 // Basic Info, Customer/Vehicle, Dates, Financial, Review

  // Auto-save timer
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (data.is_draft && (data.customer_id || data.contract_number)) {
        saveDraft()
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [data])

  // Set preselected customer
  useEffect(() => {
    if (preselectedCustomerId) {
      updateData({ customer_id: preselectedCustomerId })
    }
  }, [preselectedCustomerId])

  const updateData = (updates: Partial<ContractWizardData>) => {
    setData(prev => ({
      ...prev,
      ...updates,
      last_saved_at: new Date().toISOString()
    }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
    }
  }

  const saveDraft = async () => {
    if (!user?.id) return

    try {
      setIsAutoSaving(true)
      
      const draftData = {
        id: data.draft_id || undefined,
        company_id: user.profile?.company_id,
        created_by: user.id,
        data: data,
        current_step: currentStep,
        last_saved_at: new Date().toISOString()
      }

      if (data.draft_id) {
        // Update existing draft
        const { error } = await supabase
          .from('contract_drafts')
          .update(draftData)
          .eq('id', data.draft_id)
        
        if (error) throw error
      } else {
        // Create new draft
        const { data: newDraft, error } = await supabase
          .from('contract_drafts')
          .insert([draftData])
          .select('id')
          .single()
        
        if (error) throw error
        
        updateData({ draft_id: newDraft.id })
      }

      console.log('Draft saved successfully')
    } catch (error) {
      console.error('Error saving draft:', error)
      toast.error('خطأ في حفظ المسودة')
    } finally {
      setIsAutoSaving(false)
    }
  }

  const loadDraft = async (draftId: string) => {
    try {
      const { data: draft, error } = await supabase
        .from('contract_drafts')
        .select('*')
        .eq('id', draftId)
        .single()
      
      if (error) throw error
      
      setData(draft.data)
      setCurrentStep(draft.current_step || 0)
      toast.success('تم تحميل المسودة بنجاح')
    } catch (error) {
      console.error('Error loading draft:', error)
      toast.error('خطأ في تحميل المسودة')
    }
  }

  const deleteDraft = async () => {
    if (!data.draft_id) return

    try {
      const { error } = await supabase
        .from('contract_drafts')
        .delete()
        .eq('id', data.draft_id)
      
      if (error) throw error
      
      updateData({ draft_id: undefined })
      toast.success('تم حذف المسودة')
    } catch (error) {
      console.error('Error deleting draft:', error)
      toast.error('خطأ في حذف المسودة')
    }
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return data.contract_type && data.contract_date
      case 1: // Customer/Vehicle
        return data.customer_id
      case 2: // Dates
        return data.start_date && data.end_date && data.rental_days > 0
      case 3: // Financial
        return data.contract_amount > 0
      case 4: // Review
        return data.validation_status === 'valid'
      default:
        return true
    }
  }

  const submitContract = async () => {
    if (!onSubmit) {
      toast.error('لم يتم تحديد وظيفة الإرسال')
      return
    }

    try {
      const finalData = {
        ...data,
        is_draft: false
      }
      
      await onSubmit(finalData)
      
      // Delete draft after successful submission
      if (data.draft_id) {
        await deleteDraft()
      }
      
      // Reset form
      setData(defaultData)
      setCurrentStep(0)
      
      toast.success('تم إنشاء العقد بنجاح')
    } catch (error) {
      console.error('Error submitting contract:', error)
      toast.error('خطأ في إنشاء العقد')
    }
  }

  const value: ContractWizardContextType = {
    data,
    currentStep,
    totalSteps,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    saveDraft,
    loadDraft,
    deleteDraft,
    isAutoSaving,
    canProceedToNext,
    submitContract
  }

  return (
    <ContractWizardContext.Provider value={value}>
      {children}
    </ContractWizardContext.Provider>
  )
}

export const useContractWizard = () => {
  const context = useContext(ContractWizardContext)
  if (!context) {
    throw new Error('useContractWizard must be used within a ContractWizardProvider')
  }
  return context
}