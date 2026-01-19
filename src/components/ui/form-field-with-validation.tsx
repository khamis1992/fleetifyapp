import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, CheckCircle, Asterisk } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormFieldWithValidationProps {
  id: string
  label: string
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'select' | 'textarea'
  value: string | number
  onChange: (value: string | number) => void
  onBlur?: () => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  
  // Validation props
  hasError?: boolean
  hasWarning?: boolean
  errorMessage?: string
  warningMessage?: string
  successMessage?: string
  
  // Select specific props
  selectOptions?: Array<{ value: string; label: string }>
  selectPlaceholder?: string
  
  // Additional props
  helperText?: string
  children?: React.ReactNode
}

export const FormFieldWithValidation: React.FC<FormFieldWithValidationProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  className,
  hasError = false,
  hasWarning = false,
  errorMessage,
  warningMessage,
  successMessage,
  selectOptions = [],
  selectPlaceholder,
  helperText,
  children
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
    onChange(newValue)
  }

  const renderInput = () => {
    const inputClassName = cn(
      "transition-colors duration-200",
      hasError && "border-destructive focus:border-destructive",
      hasWarning && !hasError && "border-yellow-500 focus:border-yellow-500",
      !hasError && !hasWarning && value && "border-green-500",
      className
    )

    switch (type) {
      case 'select':
        return (
          <Select 
            value={value.toString()} 
            onValueChange={(val) => onChange(val)}
            disabled={disabled}
          >
            <SelectTrigger className={inputClassName}>
              <SelectValue placeholder={selectPlaceholder || placeholder} />
            </SelectTrigger>
            <SelectContent>
              {children}
            </SelectContent>
          </Select>
        )
      
      case 'textarea':
        return (
          <Textarea
            id={id}
            value={value.toString()}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={inputClassName}
            rows={4}
          />
        )
      
      default:
        return (
          <Input
            id={id}
            type={type}
            value={value.toString()}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={inputClassName}
          />
        )
    }
  }

  const getStatusIcon = () => {
    if (hasError) return <AlertCircle className="h-4 w-4 text-destructive" />
    if (hasWarning) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    if (value && !hasError && !hasWarning) return <CheckCircle className="h-4 w-4 text-green-500" />
    return null
  }

  const getStatusMessage = () => {
    if (hasError && errorMessage) {
      return (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )
    }
    
    if (hasWarning && warningMessage) {
      return (
        <Alert className="mt-2 border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">{warningMessage}</AlertDescription>
        </Alert>
      )
    }
    
    if (successMessage && value && !hasError && !hasWarning) {
      return (
        <Alert className="mt-2 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )
    }
    
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label 
          htmlFor={id} 
          className={cn(
            "flex items-center gap-1 text-sm font-medium",
            hasError && "text-destructive",
            hasWarning && !hasError && "text-yellow-600"
          )}
        >
          {label}
          {required && (
            <Asterisk className="h-3 w-3 text-destructive" />
          )}
        </Label>
        
        <div className="flex items-center gap-2">
          {required && (
            <Badge variant="secondary" className="text-xs">
              مطلوب
            </Badge>
          )}
          {getStatusIcon()}
        </div>
      </div>
      
      {renderInput()}
      
      {helperText && !hasError && !hasWarning && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      
      {getStatusMessage()}
    </div>
  )
}

// Pre-configured field components for common contract form fields
export const CustomerField: React.FC<Omit<FormFieldWithValidationProps, 'type'>> = (props) => (
  <FormFieldWithValidation 
    {...props} 
    type="select" 
    helperText="ابحث عن العميل بالاسم أو رقم الهوية"
  />
)

export const VehicleField: React.FC<Omit<FormFieldWithValidationProps, 'type'>> = (props) => (
  <FormFieldWithValidation 
    {...props} 
    type="select" 
    helperText="اختر المركبة المتاحة"
  />
)

export const ContractTypeField: React.FC<Omit<FormFieldWithValidationProps, 'type'>> = (props) => (
  <FormFieldWithValidation 
    {...props} 
    type="select" 
    helperText="اختر النوع المناسب للعقد"
    required
  />
)

export const DateField: React.FC<Omit<FormFieldWithValidationProps, 'type'>> = (props) => (
  <FormFieldWithValidation 
    {...props} 
    type="date" 
    helperText="التاريخ بصيغة يوم/شهر/سنة"
  />
)

export const AmountField: React.FC<Omit<FormFieldWithValidationProps, 'type'>> = (props) => (
  <FormFieldWithValidation 
    {...props} 
    type="number" 
    helperText="المبلغ بالريال السعودي"
  />
)