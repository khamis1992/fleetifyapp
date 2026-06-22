import { useForm, UseFormProps, UseFormReturn } from 'react-hook-form';
import { useMemo, useCallback } from 'react';

/**
 * نسخة محسنة من useForm تمنع مشاكل re-rendering المتكررة
 * Compatible wrapper for react-hook-form that prevents re-rendering issues
 */
export function useCompatibleForm<TFieldValues extends Record<string, any> = Record<string, any>>(
  props?: UseFormProps<TFieldValues>
): UseFormReturn<TFieldValues> {
  // استخدام useMemo لمنع إعادة إنشاء الخيارات في كل render
  const memoizedOptions = useMemo(() => ({
    // تحسين إعادة التحقق لتقليل re-renders
    mode: 'onBlur' as const,
    reValidateMode: 'onBlur' as const,
    // دمج الخيارات المرسلة
    ...props,
    // تحسين الافتراضيات
    defaultValues: props?.defaultValues || ({} as any),
  }), [props?.defaultValues, props?.mode, props?.reValidateMode, props?.resolver]);

  const form = useForm<TFieldValues>(memoizedOptions);

  // تحسين handleSubmit لمنع إعادة الإنشاء
  const optimizedHandleSubmit = useCallback(
    (onValid: (data: TFieldValues) => void | Promise<void>, onInvalid?: (errors: any) => void) => {
      return form.handleSubmit(onValid, onInvalid);
    },
    [form.handleSubmit]
  );

  // إرجاع الـ form مع التحسينات
  return {
    ...form,
    handleSubmit: optimizedHandleSubmit,
  };
}

// إعادة تصدير الأنواع المطلوبة
export type { UseFormProps, UseFormReturn } from 'react-hook-form';