import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { FormValidationError } from '@/hooks/useContractFormValidation'
import { cn } from '@/lib/utils'

interface FormErrorSummaryProps {
  errors: FormValidationError[]
  warnings: FormValidationError[]
  className?: string
  onFieldFocus?: (field: string) => void
  onDismiss?: () => void
  showSuccessWhenValid?: boolean
}

export const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  warnings,
  className,
  onFieldFocus,
  onDismiss,
  showSuccessWhenValid = true
}) => {
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0
  const isValid = !hasErrors && !hasWarnings

  if (isValid && !showSuccessWhenValid) {
    return null
  }

  const getFieldDisplayName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      customer_id: 'العميل',
      vehicle_id: 'المركبة',
      contract_type: 'نوع العقد',
      contract_date: 'تاريخ العقد',
      start_date: 'تاريخ البداية',
      end_date: 'تاريخ النهاية',
      contract_amount: 'مبلغ العقد',
      monthly_amount: 'المبلغ الشهري',
      description: 'الوصف',
      terms: 'الشروط'
    }
    return fieldNames[field] || field
  }

  if (isValid) {
    return (
      <Alert className={cn("border-green-500 bg-green-50", className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">النموذج صحيح</AlertTitle>
        <AlertDescription className="text-green-700">
          جميع البيانات المطلوبة تم إدخالها بشكل صحيح. يمكنك الآن إنشاء العقد.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <AlertTitle className="flex items-center gap-2">
                أخطاء في النموذج
                <Badge variant="destructive" className="text-xs">
                  {errors.length}
                </Badge>
              </AlertTitle>
              <AlertDescription className="mt-2">
                <div className="space-y-2">
                  <p className="text-sm">يرجى إصلاح الأخطاء التالية قبل المتابعة:</p>
                  <ul className="space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="flex items-center justify-between text-sm">
                        <span>
                          <strong>{getFieldDisplayName(String(error.field))}:</strong> {error.message}
                        </span>
                        {onFieldFocus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onFieldFocus(String(error.field))}
                          >
                            انتقال
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Alert>
      )}

      {hasWarnings && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <AlertTitle className="text-yellow-800 flex items-center gap-2">
                تحذيرات
                <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 text-xs">
                  {warnings.length}
                </Badge>
              </AlertTitle>
              <AlertDescription className="text-yellow-700 mt-2">
                <div className="space-y-2">
                  <p className="text-sm">يُنصح بمراجعة النقاط التالية:</p>
                  <ul className="space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index} className="flex items-center justify-between text-sm">
                        <span>
                          <strong>{getFieldDisplayName(String(warning.field))}:</strong> {warning.message}
                        </span>
                        {onFieldFocus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-yellow-700 hover:text-yellow-800"
                            onClick={() => onFieldFocus(String(warning.field))}
                          >
                            مراجعة
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
    </div>
  )
}