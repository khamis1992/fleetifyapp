import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label: string;
  /** Field name for form registration */
  name: string;
  /** Error message to display */
  error?: string;
  /** Success message when field is valid */
  successMessage?: string;
  /** Helper text below the field */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Show success state when valid */
  showSuccess?: boolean;
  /** Custom icon for the input */
  icon?: React.ReactNode;
  /** Register function from react-hook-form */
  register?: any;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      name,
      error,
      successMessage,
      helperText,
      required = false,
      showSuccess = true,
      icon,
      register,
      className,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const isValid = showSuccess && !hasError && props.value;

    return (
      <div className="space-y-1.5">
        <Label
          htmlFor={name}
          className={cn(
            'text-sm font-medium',
            hasError && 'text-red-600',
            isValid && 'text-green-600'
          )}
        >
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </Label>

        <div className="relative">
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {icon}
            </div>
          )}

          <Input
            id={name}
            ref={ref}
            {...(register ? register(name) : {})}
            className={cn(
              'transition-all duration-200',
              icon && 'pr-10',
              hasError && 'border-red-500 focus-visible:ring-red-500/20',
              isValid && 'border-green-500 focus-visible:ring-green-500/20',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${name}-error` : undefined}
            {...props}
          />

          {/* Status icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {hasError && <AlertCircle className="h-4 w-4 text-red-500" />}
            {isValid && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </div>
        </div>

        {/* Messages */}
        {hasError && (
          <p
            id={`${name}-error`}
            className="text-sm text-red-600 flex items-center gap-1 animate-in slide-in-from-top-1"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        {isValid && successMessage && (
          <p className="text-sm text-green-600 flex items-center gap-1 animate-in slide-in-from-top-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {successMessage}
          </p>
        )}

        {!hasError && helperText && (
          <p className="text-xs text-neutral-500 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

// Validation message component for custom use
interface ValidationMessageProps {
  type: 'error' | 'success' | 'info' | 'warning';
  message: string;
  className?: string;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type,
  message,
  className,
}) => {
  const styles = {
    error: 'text-red-600 bg-red-50',
    success: 'text-green-600 bg-green-50',
    info: 'text-blue-600 bg-blue-50',
    warning: 'text-amber-600 bg-amber-50',
  };

  const icons = {
    error: <AlertCircle className="h-4 w-4" />,
    success: <CheckCircle2 className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
        styles[type],
        className
      )}
    >
      {icons[type]}
      {message}
    </div>
  );
};

// Arabic error messages
export const arabicErrorMessages = {
  required: 'هذا الحقل مطلوب',
  email: 'البريد الإلكتروني غير صحيح',
  phone: 'رقم الهاتف غير صحيح',
  minLength: (min: number) => `يجب أن يكون ${min} أحرف على الأقل`,
  maxLength: (max: number) => `يجب ألا يتجاوز ${max} حرف`,
  min: (min: number) => `يجب أن يكون ${min} على الأقل`,
  max: (max: number) => `يجب ألا يتجاوز ${max}`,
  pattern: 'التنسيق غير صحيح',
  date: 'التاريخ غير صحيح',
  dateRange: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية',
  positiveNumber: 'يجب أن يكون رقم موجب',
  nationalId: 'الرقم الشخصي غير صحيح',
  duplicate: 'هذه القيمة موجودة مسبقاً',
};

export default FormField;

