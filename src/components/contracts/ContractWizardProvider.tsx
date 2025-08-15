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
  customer_name?: string
  vehicle_id: string
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
  const [isValidating, setIsValidating] = useState(false)
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
      // Only update terms and account_id if empty to avoid overriding user changes
      const updates: any = {}
      
      if (!data.terms || data.terms.trim() === '') {
        updates.terms = appliedData.terms
      }
      
      // تطبيق الحساب المحاسبي من القالب تلقائياً
      if (appliedData.account_id && !data.account_id) {
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

      console.log('تم حفظ المسودة بنجاح في localStorage')
    } catch (error) {
      console.error('خطأ في حفظ المسودة:', error)
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
      console.error('خطأ في تحميل المسودة:', error)
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
      console.error('خطأ في حذف المسودة:', error)
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
          if (data.rental_days <= 0) {
            toast.error('مدة الإيجار يجب أن تكون أكبر من صفر')
            return false
          }
          
          // التحقق من أن تاريخ النهاية بعد تاريخ البداية
          if (new Date(data.end_date) <= new Date(data.start_date)) {
            toast.error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية')
            return false
          }
          break
          
        case 2: // Customer/Vehicle
          if (!data.customer_id) {
            toast.error('يرجى اختيار العميل')
            return false
          }
          
          // التحقق من صحة العميل في الوقت الفعلي
          try {
            const { data: customerCheck, error } = await supabase
              .rpc('check_customer_eligibility_realtime', {
                customer_id_param: data.customer_id
              })
            
            if (error) {
              console.error('خطأ في التحقق من العميل:', error)
              toast.error('خطأ في التحقق من صحة العميل')
              return false
            }
            
            const checkResult = customerCheck as any
            if (!checkResult?.eligible) {
              toast.error(`العميل غير مؤهل: ${checkResult?.reason || 'سبب غير معروف'}`)
              return false
            }
          } catch (error) {
            console.error('خطأ في التحقق من العميل:', error)
            toast.warning('لا يمكن التحقق من صحة العميل، سيتم التحقق عند الإرسال')
          }
          
          // التحقق من توفر المركبة إذا تم اختيارها
          if (data.vehicle_id && data.vehicle_id !== 'none') {
            try {
              const { data: vehicleCheck, error } = await supabase
                .rpc('check_vehicle_availability_realtime', {
                  vehicle_id_param: data.vehicle_id,
                  start_date_param: data.start_date,
                  end_date_param: data.end_date
                })
              
              if (error) {
                console.error('خطأ في التحقق من المركبة:', error)
                toast.error('خطأ في التحقق من توفر المركبة')
                return false
              }
              
              const checkResult = vehicleCheck as any
              if (!checkResult?.available) {
                toast.error(`المركبة غير متوفرة: ${checkResult?.reason || 'سبب غير معروف'}`)
                return false
              }
            } catch (error) {
              console.error('خطأ في التحقق من المركبة:', error)
              toast.warning('لا يمكن التحقق من توفر المركبة، سيتم التحقق عند الإرسال')
            }
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
          
        case 4: // Review
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
          
          // التحقق من التوقيعات إذا كانت مفعلة
          if (data.signature_enabled !== false) { // Default to enabled if not specified
            if (!data.customer_signature) {
              toast.error('توقيع العميل مطلوب')
              return false
            }
            if (!data.company_signature) {
              toast.error('توقيع الشركة مطلوب')
              return false
            }
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
        return !!(data.start_date && data.end_date && (data.rental_days > 0 || data.rental_months > 0))
      case 2: // Customer/Vehicle
        const hasCustomer = !!data.customer_id
        // If a vehicle is selected and it's not "none", require vehicle condition report
        if (data.vehicle_id && data.vehicle_id !== 'none') {
          return hasCustomer && !!data.vehicle_condition_report_id
        }
        // If no vehicle selected or "none" selected, only require customer
        return hasCustomer
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
      
      // انتظار اكتمال عملية قاعدة البيانات
      const result = await onSubmit(finalData)
      
      console.log('✅ [CONTRACT_WIZARD] تم إرسال العقد بنجاح:', result)
      
      // المتابعة مع التنظيف فقط إذا كان الإرسال ناجحاً
      if (data.draft_id) {
        await deleteDraft()
      }
      
      // إعادة تعيين النموذج
      setData(defaultData)
      setCurrentStep(0)
      
      // إظهار رسالة النجاح فقط بعد نجاح عملية قاعدة البيانات
      console.log('🎉 [CONTRACT_WIZARD] تم إنشاء العقد بنجاح')
    } catch (error: any) {
      console.error('❌ [CONTRACT_WIZARD] خطأ في إرسال العقد:', error)
      
      // تحسين رسائل الخطأ للمستخدم
      let errorMessage = 'خطأ في إنشاء العقد'
      
      if (error?.message) {
        if (error.message.includes('العميل مطلوب')) {
          errorMessage = 'يرجى اختيار العميل'
        } else if (error.message.includes('مبلغ العقد مطلوب')) {
          errorMessage = 'يرجى إدخال مبلغ العقد'
        } else if (error.message.includes('تواريخ العقد مطلوبة')) {
          errorMessage = 'يرجى تحديد تواريخ العقد'
        } else if (error.message.includes('نوع العقد مطلوب')) {
          errorMessage = 'يرجى اختيار نوع العقد'
        } else if (error.message.includes('تاريخ النهاية يجب أن يكون بعد تاريخ البداية')) {
          errorMessage = 'تواريخ العقد غير صحيحة'
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorMessage, {
        description: 'يرجى مراجعة البيانات والمحاولة مرة أخرى',
        duration: 6000
      })
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
    fillTestData,
    validateCurrentStep,
    isValidating
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

