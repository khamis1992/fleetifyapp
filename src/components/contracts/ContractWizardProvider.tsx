import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useTemplateByType, useApplyTemplate, getDefaultDurationByType } from '@/hooks/useContractTemplates'

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
  
  // Validation & Approval (using underscore prefix to avoid DB conflicts)
  _validation_status?: 'pending' | 'validating' | 'valid' | 'invalid'
  _validation_errors?: string[]
  _requires_approval?: boolean
  _approval_steps?: any[]
  
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
  fillTestData: () => void
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
  _validation_status: 'pending',
  _validation_errors: [],
  _requires_approval: false,
  _approval_steps: [],
  is_draft: true
}

interface ContractWizardProviderProps {
  children: ReactNode
  onSubmit?: (data: ContractWizardData) => Promise<any>
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

  const template = useTemplateByType(data.contract_type || '')
  const { applyTemplate } = useApplyTemplate()

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

  // Auto-calculate duration and end date when contract type or start date changes
  useEffect(() => {
    if (data.contract_type) {
      const suggestedDuration = getDefaultDurationByType(data.contract_type)
      
      // Only auto-update duration if it's currently 1 (default) or empty
      if (data.rental_days <= 1) {
        updateData({ rental_days: suggestedDuration })
        
        // Show notification about automatic calculation
        if (suggestedDuration > 1) {
          toast.success(`تم تعيين مدة العقد تلقائياً إلى ${suggestedDuration} يوم حسب نوع العقد`)
        }
      }
    }
  }, [data.contract_type])

  // Calculate end date when start date or duration changes
  useEffect(() => {
    if (data.start_date && data.rental_days > 0) {
      const startDate = new Date(data.start_date)
      const endDate = new Date(startDate.getTime() + data.rental_days * 24 * 60 * 60 * 1000)
      const endDateString = endDate.toISOString().slice(0, 10)
      
      if (data.end_date !== endDateString) {
        updateData({ end_date: endDateString })
      }
    }
  }, [data.start_date, data.rental_days])

  // Apply template when contract type changes
  useEffect(() => {
    if (template && data.contract_type) {
      const appliedData = applyTemplate(template, data)
      // Only update terms if empty to avoid overriding user changes
      if (!data.terms || data.terms.trim() === '') {
        updateData({ 
          terms: appliedData.terms
        })
      }
    }
  }, [data.contract_type, template])

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
      
      // Store in localStorage for now (will implement DB storage later)
      const draftData = {
        data: data,
        current_step: currentStep,
        last_saved_at: new Date().toISOString(),
        user_id: user.id
      }

      localStorage.setItem(`contract_draft_${user.id}`, JSON.stringify(draftData))
      
      updateData({ 
        last_saved_at: new Date().toISOString()
      })

      console.log('Draft saved successfully to localStorage')
    } catch (error) {
      console.error('Error saving draft:', error)
      toast.error('خطأ في حفظ المسودة')
    } finally {
      setIsAutoSaving(false)
    }
  }

  const loadDraft = async (draftId: string) => {
    try {
      // Load from localStorage for now
      const savedDraft = localStorage.getItem(`contract_draft_${user?.id}`)
      if (!savedDraft) {
        toast.error('لم يتم العثور على مسودة')
        return
      }

      const draft = JSON.parse(savedDraft)
      setData(draft.data)
      setCurrentStep(draft.current_step || 0)
      toast.success('تم تحميل المسودة بنجاح')
    } catch (error) {
      console.error('Error loading draft:', error)
      toast.error('خطأ في تحميل المسودة')
    }
  }

  const deleteDraft = async () => {
    try {
      if (user?.id) {
        localStorage.removeItem(`contract_draft_${user.id}`)
        updateData({ draft_id: undefined })
        toast.success('تم حذف المسودة')
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
      toast.error('خطأ في حذف المسودة')
    }
  }

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 0: // Basic Info
        return !!(data.contract_type && data.contract_date)
      case 1: // Customer/Vehicle
        return !!data.customer_id
      case 2: // Dates
        return !!(data.start_date && data.end_date && data.rental_days > 0)
      case 3: // Financial
        return data.contract_amount > 0 && (data.monthly_amount > 0 || data.rental_days < 30)
      case 4: // Review
        return !!(data.customer_id && data.contract_amount > 0 && data.start_date && data.end_date)
      default:
        return true
    }
  }

  const fillTestData = () => {
    const testData: Partial<ContractWizardData> = {
      contract_number: `CONTRACT-${Date.now()}`,
      contract_type: 'weekly_rental',
      description: 'عقد إيجار تجريبي لسيارة سيدان متوسطة الحجم',
      terms: 'شروط وأحكام عقد الإيجار الأسبوعي\n\n1. مدة الإيجار: سبعة أيام من تاريخ بداية العقد\n2. الدفع: يمكن الدفع مقدماً أو بالتقسيط الأسبوعي\n3. المسؤولية: المستأجر مسؤول عن أي أضرار تلحق بالمركبة',
      start_date: new Date().toISOString().slice(0, 10),
      rental_days: 7,
      contract_amount: 1500,
      monthly_amount: 6000,
      _validation_status: 'pending' as const,
      _validation_errors: [],
      _requires_approval: false,
      _approval_steps: []
    }

    // Calculate end date
    const startDate = new Date(testData.start_date!)
    const endDate = new Date(startDate.getTime() + testData.rental_days! * 24 * 60 * 60 * 1000)
    testData.end_date = endDate.toISOString().slice(0, 10)

    updateData(testData)
    toast.success('تم تعبئة البيانات التجريبية بنجاح')
  }

  // Data preparation and validation before submission
  const prepareContractData = (rawData: ContractWizardData) => {
    console.log('[CONTRACT_WIZARD] Preparing contract data:', rawData)
    
    const prepared = {
      ...rawData,
      // Ensure monthly_amount is always present and properly calculated
      monthly_amount: rawData.monthly_amount || rawData.contract_amount,
      // Clean up optional fields
      vehicle_id: rawData.vehicle_id === 'none' || !rawData.vehicle_id ? null : rawData.vehicle_id,
      account_id: rawData.account_id === 'none' || !rawData.account_id ? null : rawData.account_id,
      cost_center_id: rawData.cost_center_id === 'none' || !rawData.cost_center_id ? null : rawData.cost_center_id,
      // Ensure numeric fields are properly typed
      contract_amount: Number(rawData.contract_amount) || 0,
      rental_days: Number(rawData.rental_days) || 1,
      // Add metadata for tracking
      _prepared_at: new Date().toISOString(),
      _validation_version: '2.0'
    }
    
    console.log('[CONTRACT_WIZARD] Prepared data:', prepared)
    return prepared
  }

  const submitContract = async () => {
    if (!onSubmit) {
      toast.error('لم يتم تحديد وظيفة الإرسال')
      return
    }

    try {
      console.log('📝 [CONTRACT_WIZARD] Starting contract submission')
      console.log('📝 [CONTRACT_WIZARD] Raw data before preparation:', data)
      
      // Prepare and validate data before submission
      const preparedData = prepareContractData(data)
      
      // Final validation
      if (!preparedData.customer_id) {
        throw new Error('العميل مطلوب')
      }
      if (!preparedData.contract_amount || preparedData.contract_amount <= 0) {
        throw new Error('مبلغ العقد مطلوب')
      }
      if (!preparedData.start_date || !preparedData.end_date) {
        throw new Error('تواريخ العقد مطلوبة')
      }
      
      const finalData = {
        ...preparedData,
        is_draft: false
      }
      
      console.log('📝 [CONTRACT_WIZARD] Final data for submission:', finalData)
      
      // Wait for the actual database operation to complete
      const result = await onSubmit(finalData)
      
      console.log('✅ [CONTRACT_WIZARD] Contract submission successful:', result)
      
      // Only proceed with cleanup if submission was successful
      if (data.draft_id) {
        await deleteDraft()
      }
      
      // Reset form
      setData(defaultData)
      setCurrentStep(0)
      
      // Show success message only after successful database operation
      toast.success('تم إنشاء العقد بنجاح')
    } catch (error) {
      console.error('❌ [CONTRACT_WIZARD] Error submitting contract:', error)
      toast.error('خطأ في إنشاء العقد: ' + (error.message || 'حدث خطأ غير متوقع'))
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
    submitContract,
    fillTestData
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