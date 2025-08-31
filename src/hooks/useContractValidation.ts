import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ValidationAlert {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  conflicts?: any[];
  amount?: number;
  count?: number;
}

export interface ValidationResult {
  valid: boolean;
  alerts: ValidationAlert[];
  warnings: ValidationAlert[];
  errors: ValidationAlert[];
}

export interface ContractFormData {
  customer_id?: string;
  vehicle_id?: string;
  start_date?: string;
  end_date?: string;
  contract_amount?: number;
  monthly_amount?: number;
  contract_type?: string;
}

export const useContractValidation = () => {
  const [validation, setValidation] = useState<ValidationResult>({
    valid: true,
    alerts: [],
    warnings: [],
    errors: []
  });
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidationTime, setLastValidationTime] = useState<Date | null>(null);
  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isValidUUID = (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  const cleanFormDataForValidation = (formData: ContractFormData): ContractFormData => {
    const cleaned = { ...formData };
    
    // Convert empty strings to null for UUID fields
    if (cleaned.customer_id === '' || cleaned.customer_id === undefined) {
      cleaned.customer_id = undefined;
    }
    if (cleaned.vehicle_id === '' || cleaned.vehicle_id === undefined) {
      cleaned.vehicle_id = undefined;
    }
    
    return cleaned;
  };

  const hasValidData = (formData: ContractFormData): boolean => {
    const customerId = formData.customer_id?.trim();
    const vehicleId = formData.vehicle_id?.trim();
    
    // Return false if both are empty, null, or undefined
    if ((!customerId || customerId === '') && (!vehicleId || vehicleId === '')) {
      return false;
    }
    
    // Skip validation if contract amount is zero or negative (still setting up)
    if (formData.contract_amount !== undefined && formData.contract_amount <= 0) {
      return false;
    }
    
    // Validate UUID format if provided
    if (customerId && customerId !== '' && !isValidUUID(customerId)) {
      return false;
    }
    if (vehicleId && vehicleId !== '' && !isValidUUID(vehicleId)) {
      return false;
    }
    
    return true;
  };

  const validateContract = useCallback(async (formData: ContractFormData, retryCount = 0) => {
    // Return early if no meaningful data to validate
    if (!formData || !hasValidData(formData)) {
      const emptyResult = { valid: true, alerts: [], warnings: [], errors: [] };
      setValidation(emptyResult);
      setLastValidationTime(new Date());
      return emptyResult;
    }

    setIsValidating(true);
    const startTime = Date.now();
    
    try {
      const cleanedData = cleanFormDataForValidation(formData);
      const { data, error } = await supabase.rpc('validate_contract_realtime', {
        contract_data: cleanedData as any
      });

      if (error) {
        console.error('Validation error:', error);
        
        // Optimized retry logic for transient errors
        if (retryCount < 2 && (error.code === '503' || error.message.includes('network') || error.message.includes('timeout'))) {
          await new Promise(resolve => setTimeout(resolve, Math.min(500, Math.pow(2, retryCount) * 200)));
          return validateContract(formData, retryCount + 1);
        }
        
        const errorResult = {
          valid: false,
          alerts: [],
          warnings: [],
          errors: [{
            type: 'validation_error',
            severity: 'high' as const,
            message: error.message.includes('insufficient_privilege') 
              ? 'ليس لديك صلاحية كافية للتحقق من البيانات'
              : 'خطأ في التحقق من البيانات: ' + (error.message || 'خطأ غير محدد')
          }]
        };
        
        setValidation(errorResult);
        setValidationHistory(prev => [...prev.slice(-4), errorResult]);
        setLastValidationTime(new Date());
        return errorResult;
      }

      const result = (data as unknown as ValidationResult) || { valid: true, alerts: [], warnings: [], errors: [] };
      
      // Enhanced validation result with metadata
      const enhancedResult = {
        ...result,
        validationTime: Date.now() - startTime,
        retryCount,
        timestamp: new Date()
      };
      
      setValidation(result);
      setValidationHistory(prev => [...prev.slice(-4), result]);
      setLastValidationTime(new Date());
      
      return result;
    } catch (error) {
      console.error('Validation failed:', error);
      
      // Optimized retry for network errors
      if (retryCount < 2 && (error instanceof TypeError || error.message.includes('fetch'))) {
        await new Promise(resolve => setTimeout(resolve, Math.min(500, Math.pow(2, retryCount) * 200)));
        return validateContract(formData, retryCount + 1);
      }
      
      const errorResult = {
        valid: false,
        alerts: [],
        warnings: [],
        errors: [{
          type: 'validation_failed',
          severity: 'high' as const,
          message: 'فشل في التحقق من البيانات: ' + (error.message || 'خطأ في الاتصال')
        }]
      };
      
      setValidation(errorResult);
      setValidationHistory(prev => [...prev.slice(-4), errorResult]);
      setLastValidationTime(new Date());
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const validateVehicleAvailability = useCallback(async (
    vehicleId: string,
    startDate: string,
    endDate: string,
    excludeContractId?: string
  ) => {
    try {
      const { data, error } = await supabase.rpc('check_vehicle_availability_realtime', {
        vehicle_id_param: vehicleId,
        start_date_param: startDate,
        end_date_param: endDate,
        exclude_contract_id_param: excludeContractId
      });

      if (error) {
        console.error('Vehicle availability check error:', error);
        return { available: false, reason: 'check_failed', message: 'فشل في التحقق من توفر المركبة' };
      }

      return data;
    } catch (error) {
      console.error('Vehicle availability check failed:', error);
      return { available: false, reason: 'check_failed', message: 'فشل في التحقق من توفر المركبة' };
    }
  }, []);

  const validateCustomerEligibility = useCallback(async (customerId: string) => {
    try {
      const { data, error } = await supabase.rpc('check_customer_eligibility_realtime', {
        customer_id_param: customerId
      });

      if (error) {
        console.error('Customer eligibility check error:', error);
        return { eligible: false, reason: 'check_failed', message: 'فشل في التحقق من أهلية العميل' };
      }

      return data;
    } catch (error) {
      console.error('Customer eligibility check failed:', error);
      return { eligible: false, reason: 'check_failed', message: 'فشل في التحقق من أهلية العميل' };
    }
  }, []);

  // Optimized debounced validation function
  const debouncedValidation = useCallback((formData: ContractFormData) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout (reduced from 500ms to 200ms)
    timeoutRef.current = setTimeout(() => {
      validateContract(formData);
    }, 200);
  }, [validateContract]);

  return {
    validation,
    isValidating,
    validateContract,
    validateVehicleAvailability,
    validateCustomerEligibility,
    debouncedValidation
  };
};