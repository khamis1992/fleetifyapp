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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateContract = useCallback(async (formData: ContractFormData) => {
    // Return early if no meaningful data to validate
    if (!formData || (!formData.customer_id && !formData.vehicle_id)) {
      setValidation({ valid: true, alerts: [], warnings: [], errors: [] });
      return;
    }

    setIsValidating(true);
    
    try {
      const { data, error } = await supabase.rpc('validate_contract_realtime', {
        contract_data: formData as any
      });

      if (error) {
        console.error('Validation error:', error);
        setValidation({
          valid: false,
          alerts: [],
          warnings: [],
          errors: [{
            type: 'validation_error',
            severity: 'high',
            message: 'خطأ في التحقق من البيانات'
          }]
        });
        return;
      }

      setValidation((data as unknown as ValidationResult) || { valid: true, alerts: [], warnings: [], errors: [] });
    } catch (error) {
      console.error('Validation failed:', error);
      setValidation({
        valid: false,
        alerts: [],
        warnings: [],
        errors: [{
          type: 'validation_failed',
          severity: 'high',
          message: 'فشل في التحقق من البيانات'
        }]
      });
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

  // Debounced validation function
  const debouncedValidation = useCallback((formData: ContractFormData) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      validateContract(formData);
    }, 500);
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