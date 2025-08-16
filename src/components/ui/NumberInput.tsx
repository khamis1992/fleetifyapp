import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { normalizeArabicDigits } from '@/utils/numberFormatter';
import { cn } from '@/lib/utils';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  onChange?: (value: string) => void;
  forceEnglishDigits?: boolean;
}

/**
 * مكون إدخال الأرقام مع إجبار استخدام الأرقام الإنجليزية
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ onChange, forceEnglishDigits = true, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      
      // تحويل الأرقام العربية إلى إنجليزية إذا كان مطلوباً
      if (forceEnglishDigits) {
        value = normalizeArabicDigits(value);
      }
      
      // تحديث القيمة في الحقل
      e.target.value = value;
      
      // استدعاء onChange إذا كان موجوداً
      if (onChange) {
        onChange(value);
      }
    };

    return (
      <Input
        ref={ref}
        type="number"
        onChange={handleChange}
        className={cn("text-left", className)}
        dir="ltr"
        {...props}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";