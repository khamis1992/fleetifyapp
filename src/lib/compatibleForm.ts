import React, { useCallback } from 'react';
import { useForm as useHookForm, UseFormProps, UseFormReturn } from 'react-hook-form';
import { logger } from './logger';

// تحسين React Hook Form للتوافق مع React 19
export function useCompatibleForm<TFieldValues = any>(
  props?: UseFormProps<TFieldValues>
): UseFormReturn<TFieldValues> {
  const form = useHookForm(props);
  
  // معالجة مشكلة watch API مع React 19
  const compatibleWatch = useCallback((name?: any, defaultValue?: any) => {
    try {
      return form.watch(name, defaultValue);
    } catch (error) {
      logger.warn('Form watch compatibility issue:', error);
      return defaultValue;
    }
  }, [form]);
  
  // معالجة مشكلة setValue مع React 19
  const compatibleSetValue = useCallback((name: any, value: any, options?: any) => {
    try {
      return form.setValue(name, value, { 
        shouldValidate: true, 
        shouldDirty: true, 
        ...options 
      });
    } catch (error) {
      logger.warn('Form setValue compatibility issue:', error);
    }
  }, [form]);
  
  // معالجة مشكلة trigger مع React 19
  const compatibleTrigger = useCallback((name?: any, options?: any) => {
    try {
      return form.trigger(name, options);
    } catch (error) {
      logger.warn('Form trigger compatibility issue:', error);
      return Promise.resolve(false);
    }
  }, [form]);
  
  return {
    ...form,
    watch: compatibleWatch,
    setValue: compatibleSetValue,
    trigger: compatibleTrigger
  };
}

// Hook بديل للـ useForm الأصلي
export { useCompatibleForm as useForm };