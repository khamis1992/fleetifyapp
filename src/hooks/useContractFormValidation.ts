import { useState, useCallback, useEffect } from 'react'

interface ContractFormData {
  contract_number?: string
  customer_id: string
  vehicle_id?: string | null
  contract_type: string
  contract_date: string
  start_date: string
  end_date: string
  contract_amount: number
  monthly_amount?: number
  description?: string | null
  terms?: string | null
  status?: string
  created_by?: string
  cost_center_id?: string | null
}

export interface FormValidationError {
  field: keyof ContractFormData
  message: string
  severity: 'error' | 'warning'
}

export interface FormValidationResult {
  isValid: boolean
  errors: FormValidationError[]
  warnings: FormValidationError[]
  touchedFields: Set<keyof ContractFormData>
}

interface UseContractFormValidationProps {
  data: Partial<ContractFormData>
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export const useContractFormValidation = ({
  data,
  validateOnChange = true,
  validateOnBlur = true
}: UseContractFormValidationProps) => {
  const [touchedFields, setTouchedFields] = useState<Set<keyof ContractFormData>>(new Set())
  const [validationResult, setValidationResult] = useState<FormValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
    touchedFields: new Set()
  })

  // Required fields configuration
  const requiredFields: (keyof ContractFormData)[] = [
    'customer_id',
    'contract_type', 
    'start_date',
    'end_date',
    'contract_amount',
    'contract_date'
  ]

  // Validation rules
  const validateField = useCallback((field: keyof ContractFormData, value: any): FormValidationError[] => {
    const errors: FormValidationError[] = []

    // Required field validation
    if (requiredFields.includes(field)) {
      if (!value || (typeof value === 'string' && value.trim() === '') || (typeof value === 'number' && value <= 0)) {
        errors.push({
          field,
          message: getRequiredFieldMessage(field),
          severity: 'error'
        })
        return errors
      }
    }

    // Field-specific validation
    switch (field) {
      case 'customer_id':
        if (!value || value.trim() === '') {
          errors.push({
            field,
            message: 'يرجى اختيار العميل',
            severity: 'error'
          })
        }
        break

      case 'contract_type':
        if (!value || value.trim() === '') {
          errors.push({
            field,
            message: 'يرجى اختيار نوع العقد',
            severity: 'error'
          })
        }
        break

      case 'start_date':
        if (!value) {
          errors.push({
            field,
            message: 'يرجى تحديد تاريخ بداية العقد',
            severity: 'error'
          })
        } else if (new Date(value) < new Date(new Date().setHours(0, 0, 0, 0))) {
          errors.push({
            field,
            message: 'تاريخ البداية لا يمكن أن يكون في الماضي',
            severity: 'warning'
          })
        }
        break

      case 'end_date':
        if (!value) {
          errors.push({
            field,
            message: 'يرجى تحديد تاريخ نهاية العقد',
            severity: 'error'
          })
        } else if (data.start_date && new Date(value) <= new Date(data.start_date)) {
          errors.push({
            field,
            message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
            severity: 'error'
          })
        }
        break

      case 'contract_amount':
        if (!value || value <= 0) {
          errors.push({
            field,
            message: 'يرجى إدخال مبلغ العقد',
            severity: 'error'
          })
        } else if (value < 1) {
          errors.push({
            field,
            message: 'مبلغ العقد يجب أن يكون أكبر من صفر',
            severity: 'error'
          })
        } else if (value > 1000000) {
          errors.push({
            field,
            message: 'مبلغ العقد كبير جداً، يرجى المراجعة',
            severity: 'warning'
          })
        }
        break

      case 'monthly_amount':
        if (value && value < 0) {
          errors.push({
            field,
            message: 'المبلغ الشهري لا يمكن أن يكون سالباً',
            severity: 'error'
          })
        }
        break

      case 'contract_date':
        if (!value) {
          errors.push({
            field,
            message: 'يرجى تحديد تاريخ العقد',
            severity: 'error'
          })
        }
        break

      case 'vehicle_id':
        // Vehicle is optional but add warning if contract type suggests it's needed
        if (!value && data.contract_type && ['rental', 'daily_rental', 'weekly_rental', 'monthly_rental'].includes(data.contract_type)) {
          errors.push({
            field,
            message: 'يُنصح بتحديد المركبة لهذا النوع من العقود',
            severity: 'warning'
          })
        }
        break
    }

    return errors
  }, [data, requiredFields])

  // Get required field message
  const getRequiredFieldMessage = (field: keyof ContractFormData): string => {
    const messages: Record<keyof ContractFormData, string> = {
      customer_id: 'يرجى اختيار العميل',
      vehicle_id: 'يرجى اختيار المركبة',
      contract_type: 'يرجى اختيار نوع العقد',
      contract_date: 'يرجى تحديد تاريخ العقد',
      start_date: 'يرجى تحديد تاريخ بداية العقد',
      end_date: 'يرجى تحديد تاريخ نهاية العقد',
      contract_amount: 'يرجى إدخال مبلغ العقد',
      monthly_amount: 'يرجى إدخال المبلغ الشهري',
      description: 'يرجى إدخال وصف العقد',
      terms: 'يرجى إدخال شروط العقد',
      contract_number: 'يرجى إدخال رقم العقد',
      status: 'يرجى تحديد حالة العقد',
      created_by: 'يرجى تحديد منشئ العقد',
      cost_center_id: 'يرجى تحديد مركز التكلفة'
    }
    return messages[field] || `${field} مطلوب`
  }

  // Validate entire form
  const validateForm = useCallback(() => {
    const allErrors: FormValidationError[] = []
    const allWarnings: FormValidationError[] = []

    // Validate each field in the data
    Object.entries(data).forEach(([field, value]) => {
      const fieldErrors = validateField(String(field) as keyof ContractFormData, value)
      fieldErrors.forEach(error => {
        if (error.severity === 'error') {
          allErrors.push(error)
        } else {
          allWarnings.push(error)
        }
      })
    })

    // Check for missing required fields
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && (data[field] as string).trim() === '') || 
          (typeof data[field] === 'number' && (data[field] as number) <= 0)) {
        if (!allErrors.find(e => e.field === field)) {
          allErrors.push({
            field,
            message: getRequiredFieldMessage(field),
            severity: 'error'
          })
        }
      }
    })

    const result: FormValidationResult = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      touchedFields
    }

    setValidationResult(result)
    return result
  }, [data, validateField, touchedFields, requiredFields, getRequiredFieldMessage])

  // Mark field as touched
  const markFieldTouched = useCallback((field: keyof ContractFormData) => {
    setTouchedFields(prev => new Set([...prev, field]))
  }, [])

  // Validate single field
  const validateSingleField = useCallback((field: keyof ContractFormData, value: any) => {
    const fieldErrors = validateField(field, value)
    return {
      hasError: fieldErrors.some(e => e.severity === 'error'),
      hasWarning: fieldErrors.some(e => e.severity === 'warning'),
      errors: fieldErrors.filter(e => e.severity === 'error'),
      warnings: fieldErrors.filter(e => e.severity === 'warning'),
      messages: fieldErrors.map(e => e.message)
    }
  }, [validateField])

  // Auto-validate on data change
  useEffect(() => {
    if (validateOnChange) {
      validateForm()
    }
  }, [data, validateOnChange, validateForm])

  // Get field validation status
  const getFieldStatus = useCallback((field: keyof ContractFormData) => {
    const fieldTouched = touchedFields.has(field)
    const fieldErrors = validationResult.errors.filter(e => e.field === field)
    const fieldWarnings = validationResult.warnings.filter(e => e.field === field)
    
    return {
      touched: fieldTouched,
      hasError: fieldErrors.length > 0,
      hasWarning: fieldWarnings.length > 0,
      errors: fieldErrors,
      warnings: fieldWarnings,
      isRequired: requiredFields.includes(field),
      errorMessage: fieldErrors[0]?.message,
      warningMessage: fieldWarnings[0]?.message
    }
  }, [touchedFields, validationResult, requiredFields])

  // Clear validation for field
  const clearFieldValidation = useCallback((field: keyof ContractFormData) => {
    setValidationResult(prev => ({
      ...prev,
      errors: prev.errors.filter(e => e.field !== field),
      warnings: prev.warnings.filter(e => e.field !== field)
    }))
  }, [])

  return {
    validationResult,
    validateForm,
    validateSingleField,
    markFieldTouched,
    getFieldStatus,
    clearFieldValidation,
    isValid: validationResult.isValid,
    hasErrors: validationResult.errors.length > 0,
    hasWarnings: validationResult.warnings.length > 0,
    requiredFields
  }
}