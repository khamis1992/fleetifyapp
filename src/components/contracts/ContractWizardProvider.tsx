import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useTemplateByType, useApplyTemplate, getDefaultDurationByType } from '@/hooks/useContractTemplates'
import { useSignatureSettings } from '@/hooks/useSignatureSettings'
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess'
import { useContractDrafts } from '@/hooks/useContractDrafts'
import { ContractFormWithDuplicateCheck } from './ContractFormWithDuplicateCheck'
import { generateShortContractNumber } from '@/utils/contractNumberGenerator';

interface ContractWizardData {
  // Basic Info
  contract_number: string
  contract_date: string
  contract_type: string
  description: string
  terms: string
  
  // Customer & Vehicle
  customer_id: string
  customer_name?: string
  customer?: any
  vehicle_id: string
  vehicle?: any
  vehicle_condition_report_id?: string
  
  // Dates & Duration
  start_date: string
  end_date: string
  rental_days: number
  rental_months?: number
  
  // Financial
  contract_amount: number
  monthly_amount: number
  account_id: string
  cost_center_id: string
  
  // Late Fines Settings
  late_fines_enabled?: boolean
  late_fine_type?: 'percentage' | 'fixed_amount'
  late_fine_rate?: number
  late_fine_grace_period?: number
  late_fine_max_amount?: number
  
  // Signatures
  customer_signature?: string
  company_signature?: string
  signature_enabled?: boolean
  
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
  validateCurrentStep: () => Promise<boolean>
  isValidating: boolean
  hasDuplicates: boolean
  setHasDuplicates: (hasDuplicates: boolean) => void
  forceCreate: boolean
  setForceCreate: (forceCreate: boolean) => void
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
  rental_months: 0,
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
  preselectedVehicleId?: string
  draftIdToLoad?: string
  contractToEdit?: any
}

export const ContractWizardProvider: React.FC<ContractWizardProviderProps> = ({
  children,
  onSubmit,
  preselectedCustomerId,
  preselectedVehicleId,
  draftIdToLoad,
  contractToEdit
}) => {
  const { user } = useAuth()
  const currentCompanyId = useCurrentCompanyId()
  const contractDrafts = useContractDrafts()
  const [data, setData] = useState<ContractWizardData>(defaultData)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [hasDuplicates, setHasDuplicates] = useState(false)
  const [forceCreate, setForceCreate] = useState(false)
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(undefined)
  const totalSteps = 6 // Basic Info, Dates, Customer/Vehicle, Financial, Late Fines, Review

  const template = useTemplateByType(data.contract_type || '')
  const { applyTemplate } = useApplyTemplate()
  const { data: signatureSettings } = useSignatureSettings()

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

  // Set preselected vehicle
  useEffect(() => {
    if (preselectedVehicleId) {
      updateData({ vehicle_id: preselectedVehicleId })
    }
  }, [preselectedVehicleId])

  // Load draft when draftIdToLoad is provided
  useEffect(() => {
    if (draftIdToLoad) {
      loadDraft(draftIdToLoad)
    }
  }, [draftIdToLoad])

  // Load contract data when editing
  useEffect(() => {
    if (contractToEdit) {
      console.log('📝 [CONTRACT_EDIT] Loading contract data for editing:', contractToEdit)
      setData({
        ...contractToEdit,
        is_draft: false,
        // Ensure all required fields have values
        contract_number: contractToEdit.contract_number || '',
        contract_date: contractToEdit.contract_date || new Date().toISOString().slice(0, 10),
        contract_type: contractToEdit.contract_type || 'rental',
        description: contractToEdit.description || '',
        terms: contractToEdit.terms || '',
        customer_id: contractToEdit.customer_id || '',
        vehicle_id: contractToEdit.vehicle_id || '',
        start_date: contractToEdit.start_date || new Date().toISOString().slice(0, 10),
        end_date: contractToEdit.end_date || '',
        rental_days: contractToEdit.rental_days || 1,
        rental_months: contractToEdit.rental_months || 0,
        contract_amount: contractToEdit.contract_amount || 0,
        monthly_amount: contractToEdit.monthly_amount || 0,
        account_id: contractToEdit.account_id || '',
        cost_center_id: contractToEdit.cost_center_id || '',
        late_fines_enabled: contractToEdit.late_fines_enabled,
        late_fine_type: contractToEdit.late_fine_type,
        late_fine_rate: contractToEdit.late_fine_rate,
        late_fine_grace_period: contractToEdit.late_fine_grace_period,
        late_fine_max_amount: contractToEdit.late_fine_max_amount,
        customer_signature: contractToEdit.customer_signature,
        company_signature: contractToEdit.company_signature,
        signature_enabled: contractToEdit.signature_enabled
      })
      toast.success('تم تحميل بيانات العقد بنجاح')
    }
  }, [contractToEdit])

  // Auto-calculate duration and end date when contract type changes
  useEffect(() => {
    if (data.contract_type) {
      const suggestedDuration = getDefaultDurationByType(data.contract_type)
      
      // Always auto-update duration when contract type changes
      updateData({ rental_days: suggestedDuration })
      
      // Show notification about automatic calculation
      if (suggestedDuration > 1) {
        toast.success(`تم تعيين مدة العقد تلقائياً إلى ${suggestedDuration} يوم حسب نوع العقد`)
      }
    }
  }, [data.contract_type])

  // Calculate end date when start date or duration changes
  useEffect(() => {
    if (data.start_date && (data.rental_days > 0 || data.rental_months > 0)) {
      const startDate = new Date(data.start_date)
      const totalDays = (data.rental_months * 30) + data.rental_days
      const endDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000)
      const endDateString = endDate.toISOString().slice(0, 10)
      
      if (data.end_date !== endDateString) {
        updateData({ end_date: endDateString })
      }
    }
  }, [data.start_date, data.rental_days, data.rental_months])

  // Apply template when contract type changes - Template has priority
  useEffect(() => {
    if (template && data.contract_type) {
      const appliedData = applyTemplate(template, data)
      const updates: any = {}
      
      // تطبيق الشروط من القالب إذا كانت فارغة
      if (!data.terms || data.terms.trim() === '') {
        updates.terms = appliedData.terms
      }
      
      // تطبيق الحساب المحاسبي من القالب (له الأولوية الأولى)
      if (appliedData.account_id) {
        updates.account_id = appliedData.account_id
      }
      
      if (Object.keys(updates).length > 0) {
        updateData(updates)
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

  const nextStep = async () => {
    // Validate current step before proceeding
    const isValid = await validateCurrentStep()
    if (!isValid) {
      return
    }
    
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
    if (!user) return

    setIsAutoSaving(true)
    try {
      // Prepare draft data using the new structure
      const draftInput = {
        id: currentDraftId,
        draft_data: {
          ...data,
          current_step: currentStep,
          // Ensure no empty string UUIDs are sent
          customer_id: data.customer_id || null,
          vehicle_id: data.vehicle_id === '' || data.vehicle_id === 'none' ? null : data.vehicle_id,
          account_id: data.account_id || null,
          cost_center_id: data.cost_center_id || null
        },
        customer_id: data.customer_id || null,
        vehicle_id: data.vehicle_id === '' || data.vehicle_id === 'none' ? null : data.vehicle_id,
        draft_name: data.contract_number || `مسودة ${new Date().toLocaleDateString('ar-SA')}`
      }

      // Use the new useContractDrafts hook
      const result = await new Promise((resolve, reject) => {
        contractDrafts.saveDraft.mutate(draftInput, {
          onSuccess: (savedDraft) => {
            // Update current draft ID if this was a new draft
            if (!currentDraftId && savedDraft?.id) {
              setCurrentDraftId(savedDraft.id)
            }
            resolve(savedDraft)
          },
          onError: reject
        })
      })

      // Suppress the toast from the hook and show auto-save specific message
      toast.dismiss()
      toast.success('تم حفظ المسودة تلقائياً', { duration: 2000 })
    } catch (error) {
      console.error('Error saving draft:', error)
      toast.error('فشل في حفظ المسودة')
    } finally {
      setIsAutoSaving(false)
    }
  }

  const loadDraft = async (draftId: string) => {
    try {
      // Use the new useContractDrafts hook to load draft
      const { data: draft, error } = await supabase
        .from('contract_drafts')
        .select('*')
        .eq('id', draftId)
        .single()

      if (error) throw error

      if (draft) {
        // Extract the draft data from the new JSONB structure
        const draftData = draft.draft_data as any

        // Convert draft data back to ContractWizardData
        const processedDraft = {
          ...defaultData,
          ...draftData,
          is_draft: true
        }

        // Set the wizard state
        setData(processedDraft as ContractWizardData)
        setCurrentDraftId(draft.id)

        // Restore the step if saved
        if (draftData.current_step !== undefined) {
          setCurrentStep(draftData.current_step)
        } else {
          setCurrentStep(0)
        }

        toast.success('تم تحميل المسودة بنجاح')
      }
    } catch (error) {
      console.error('Error loading draft:', error)
      toast.error('فشل في تحميل المسودة')
    }
  }

  const deleteDraft = async () => {
    try {
      if (currentDraftId) {
        // Use the new useContractDrafts hook to delete draft
        await new Promise((resolve, reject) => {
          contractDrafts.deleteDraft.mutate(currentDraftId, {
            onSuccess: resolve,
            onError: reject
          })
        })

        // Reset to default data
        setData(defaultData)
        setCurrentStep(0)
        setCurrentDraftId(undefined)

        // Suppress the toast from the hook and show our own
        toast.dismiss()
        toast.success('تم حذف المسودة')
      }
    } catch (error) {
      console.error('Error deleting draft:', error)
      toast.error('خطأ في حذف المسودة')
    }
  }

  const validateCurrentStep = async (): Promise<boolean> => {
    setIsValidating(true)
    
    try {
      switch (currentStep) {
        case 0: // Basic Info
          if (!data.contract_type) {
            toast.error('يرجى اختيار نوع العقد')
            return false
          }
          if (!data.contract_date) {
            toast.error('يرجى تحديد تاريخ العقد')
            return false
          }
          break
          
          case 1: // Dates
          if (!data.start_date) {
            toast.error('يرجى تحديد تاريخ البداية')
            return false
          }
          if (!data.end_date) {
            toast.error('يرجى تحديد تاريخ النهاية')
            return false
          }
          const totalDays = (data.rental_months || 0) * 30 + data.rental_days
          if (totalDays <= 0) {
            toast.error('مدة العقد يجب أن تكون أكبر من صفر')
            return false
          }
          break
          
        case 2: // Customer/Vehicle
          if (!data.customer_id) {
            toast.error('يرجى اختيار العميل')
            return false
          }
          
          // التحقق من تكرار البيانات قبل المتابعة
          if (hasDuplicates && !forceCreate) {
            toast.error('يوجد عقود مشابهة في النظام. يرجى مراجعة التحذيرات أعلاه والتحقق من البيانات المكررة قبل المتابعة.')
            return false
          }
          break
          
        case 3: // Financial
          if (data.contract_amount <= 0) {
            toast.error('مبلغ العقد يجب أن يكون أكبر من صفر')
            return false
          }
          if (data.rental_days >= 30 && data.monthly_amount <= 0) {
            toast.error('المبلغ الشهري مطلوب للعقود الطويلة المدى')
            return false
          }
          break
          
        case 4: // Late Fines Settings (optional step)
          // No validation required - this is optional
          break
          
        case 5: // Review
          // التحقق النهائي من جميع البيانات
          const requiredFields = [
            { field: 'customer_id', name: 'العميل' },
            { field: 'contract_type', name: 'نوع العقد' },
            { field: 'start_date', name: 'تاريخ البداية' },
            { field: 'end_date', name: 'تاريخ النهاية' },
            { field: 'contract_amount', name: 'مبلغ العقد' }
          ]
          
          for (const { field, name } of requiredFields) {
            const fieldValue = data[field as keyof ContractWizardData]
            if (!fieldValue || (typeof fieldValue === 'number' && fieldValue <= 0)) {
              toast.error(`${name} مطلوب`)
              return false
            }
          }
          
          // التحقق من التوقيعات بناءً على إعدادات الشركة
          const isSignatureEnabled = signatureSettings?.electronic_signature_enabled ?? true
          const requireCustomerSig = signatureSettings?.require_customer_signature ?? true
          const requireCompanySig = signatureSettings?.require_company_signature ?? true
          
          if (isSignatureEnabled) {
            if (requireCustomerSig && !data.customer_signature) {
              toast.error('توقيع العميل مطلوب حسب إعدادات الشركة')
              return false
            }
            if (requireCompanySig && !data.company_signature) {
              toast.error('توقيع الشركة مطلوب حسب إعدادات الشركة')
              return false
            }
          }
          
          // التحقق النهائي من تكرار البيانات
          if (hasDuplicates && !forceCreate) {
            toast.error('يوجد عقود مشابهة في النظام. يرجى مراجعة التحذيرات أعلاه والتحقق من البيانات المكررة قبل المتابعة. انقر على "عرض التفاصيل" لرؤية العقود المكررة.')
            return false
          }
          break
      }
      
      return true
    } catch (error) {
      console.error('خطأ في التحقق من الخطوة:', error)
      toast.error('خطأ في التحقق من البيانات')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 0: // Basic Info
        return !!(data.contract_type && data.contract_date)
      case 1: // Dates
        const totalContractDays = (data.rental_months || 0) * 30 + data.rental_days
        return !!(data.start_date && data.end_date && totalContractDays > 0)
      case 2: // Customer/Vehicle
        // Check for duplicates before allowing to proceed
        if (hasDuplicates && !forceCreate) {
          toast.error('يوجد عقود مشابهة في النظام. يرجى مراجعة التحذيرات أعلاه والتحقق من البيانات المكررة قبل المتابعة.')
          return false
        }
        
        const hasCustomer = !!data.customer_id
        // If a vehicle is selected and it's not "none", require vehicle condition report
        if (data.vehicle_id && data.vehicle_id !== 'none') {
          return hasCustomer && !!data.vehicle_condition_report_id
        }
        // If no vehicle selected or "none" selected, only require customer
        return hasCustomer
      case 3: // Financial
        // يجب أن يكون مبلغ العقد أكبر من صفر، والمبلغ الشهري مطلوب فقط للعقود الطويلة المدى
        return data.contract_amount > 0
      case 4: // Late Fines Settings (optional)
        return true // Always allow proceeding from this step
      case 5: // Review
        // Final check for duplicates
        if (hasDuplicates && !forceCreate) {
          toast.error('يوجد عقود مشابهة في النظام. يرجى مراجعة التحذيرات أعلاه والتحقق من البيانات المكررة قبل المتابعة.')
          return false
        }
        return !!(data.customer_id && data.contract_amount > 0 && data.start_date && data.end_date)
      default:
        return true
    }
  }

  const fillTestData = () => {
    const testData: Partial<ContractWizardData> = {
      contract_number: generateShortContractNumber(),
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
    console.log('[CONTRACT_WIZARD] إعداد بيانات العقد:', rawData)
    
    // التحقق من البيانات الأساسية
    if (!rawData.customer_id) {
      throw new Error('العميل مطلوب')
    }
    if (!rawData.contract_amount || rawData.contract_amount <= 0) {
      throw new Error('مبلغ العقد مطلوب ويجب أن يكون أكبر من صفر')
    }
    if (!rawData.start_date || !rawData.end_date) {
      throw new Error('تواريخ العقد مطلوبة')
    }
    if (!rawData.contract_type) {
      throw new Error('نوع العقد مطلوب')
    }
    
    // التحقق من صحة التواريخ
    const startDate = new Date(rawData.start_date)
    const endDate = new Date(rawData.end_date)
    
    if (endDate <= startDate) {
      throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية')
    }
    
    const prepared = {
      ...rawData,
      // التأكد من وجود المبلغ الشهري وحسابه بشكل صحيح
      monthly_amount: rawData.monthly_amount || rawData.contract_amount,
      // تنظيف الحقول الاختيارية
      vehicle_id: rawData.vehicle_id === 'none' || !rawData.vehicle_id ? null : rawData.vehicle_id,
      account_id: rawData.account_id === 'none' || !rawData.account_id ? null : rawData.account_id,
      cost_center_id: rawData.cost_center_id === 'none' || !rawData.cost_center_id ? null : rawData.cost_center_id,
      // تنظيف معرف تقرير حالة المركبة
      vehicle_condition_report_id: rawData.vehicle_condition_report_id || undefined,
      // التأكد من أن الحقول الرقمية من النوع الصحيح
      contract_amount: Number(rawData.contract_amount) || 0,
      rental_days: Number(rawData.rental_days) || 1,
      // إضافة بيانات وصفية للتتبع
      _prepared_at: new Date().toISOString(),
      _validation_version: '3.0',
      // إضافة معرف المستخدم
      created_by: user?.id
    }
    
    console.log('[CONTRACT_WIZARD] البيانات المعدة:', prepared)
    return prepared
  }

  const submitContract = async () => {
    if (!onSubmit) {
      toast.error('لم يتم تحديد وظيفة الإرسال')
      return
    }

    try {
      console.log('📝 [CONTRACT_WIZARD] بدء إرسال العقد')
      console.log('📝 [CONTRACT_WIZARD] البيانات الخام قبل الإعداد:', data)
      
      // Additional validation for vehicle condition report if vehicle is selected
      if (data.vehicle_id && data.vehicle_id !== 'none' && !data.vehicle_condition_report_id) {
        toast.error('يجب إنشاء تقرير حالة المركبة قبل إنشاء العقد')
        setCurrentStep(2) // Go back to customer/vehicle step
        return
      }
      
      // التحقق النهائي من البيانات
      const isValid = await validateCurrentStep()
      if (!isValid) {
        console.log('❌ [CONTRACT_WIZARD] فشل في التحقق من البيانات')
        return
      }
      
      // إعداد والتحقق من البيانات قبل الإرسال
      const preparedData = prepareContractData(data)
      
      const finalData = {
        ...preparedData,
        is_draft: false
      }
      
      console.log('📝 [CONTRACT_WIZARD] البيانات النهائية للإرسال:', finalData)
      
      // Wait for the actual database operation to complete
      const result = await onSubmit(finalData)
      
      console.log('🎉 [CONTRACT_WIZARD] Contract submission completed! Result:', result)
      
      // Reset form after successful submission
      setData(defaultData)
      setCurrentStep(0)
      setHasDuplicates(false)
      setForceCreate(false)
      
      return result
    } catch (error: unknown) {
      console.error('💥 [CONTRACT_WIZARD] Error submitting contract:', {
        error,
        message: error.message,
        stack: error.stack,
        originalData: data
      })
      
      // Display user-friendly error messages
      if (error.message && error.message.includes('unique constraint')) {
        toast.error('رقم العقد موجود مسبقاً، يرجى استخدام رقم مختلف')
      } else if (error.message && error.message.includes('foreign key')) {
        toast.error('يرجى التأكد من صحة بيانات العميل والمركبة')
      } else {
        toast.error(error.message || 'حدث خطأ أثناء إنشاء العقد')
      }
      
      throw error
    }
  }

  const contextValue: ContractWizardContextType = {
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
    fillTestData,
    validateCurrentStep,
    isValidating,
    hasDuplicates,
    setHasDuplicates,
    forceCreate,
    setForceCreate
  }

  return (
    <ContractWizardContext.Provider value={contextValue}>
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