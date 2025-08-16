import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface DuplicateCustomer {
  id: string;
  name: string;
  customer_type: string;
  duplicate_field: string;
  duplicate_value: string;
}

export interface DuplicateCheckResult {
  has_duplicates: boolean;
  duplicates: DuplicateCustomer[];
  count: number;
}

export interface CustomerData {
  customer_type: string;
  national_id?: string;
  passport_number?: string;
  phone?: string;
  email?: string;
  company_name?: string;
  commercial_register?: string;
}

export const useCustomerDuplicateCheck = (
  customerData: CustomerData,
  enabled: boolean = true,
  excludeCustomerId?: string
) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-duplicate-check', companyId, customerData, excludeCustomerId],
    queryFn: async (): Promise<DuplicateCheckResult> => {
      if (!companyId) {
        throw new Error("No company access available");
      }

      const { data, error } = await supabase.rpc('check_duplicate_customer', {
        p_company_id: companyId,
        p_customer_type: customerData.customer_type,
        p_national_id: customerData.national_id || null,
        p_passport_number: customerData.passport_number || null,
        p_phone: customerData.phone || null,
        p_email: customerData.email || null,
        p_company_name: customerData.company_name || null,
        p_commercial_register: customerData.commercial_register || null,
        p_exclude_customer_id: excludeCustomerId || null
      });

      if (error) {
        console.error('Error checking customer duplicates:', error);
        throw error;
      }

      return data as unknown as DuplicateCheckResult;
    },
    enabled: enabled && !!companyId && (
      !!customerData.national_id || 
      !!customerData.passport_number || 
      !!customerData.phone || 
      !!customerData.email || 
      (customerData.customer_type === 'company' && !!customerData.company_name && !!customerData.commercial_register)
    ),
    staleTime: 0, // Always fresh for duplicate checks
  });
};