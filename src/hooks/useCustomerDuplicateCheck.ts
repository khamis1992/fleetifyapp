import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface DuplicateCustomer {
  id: string;
  name: string;
  customer_type: string;
  duplicate_field: string;
  duplicate_value: string;
  company_id: string;
  company_name?: string;
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

      // إضافة logging للتشخيص
      console.log('🔍 [DUPLICATE_CHECK] Searching with:', {
        companyId,
        customerType: customerData.customer_type,
        nationalId: customerData.national_id,
        phone: customerData.phone,
        email: customerData.email
      });

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

      // إضافة logging للنتائج
      const result = data as any;
      
      // تصفية العملاء من الشركات الأخرى
      if (result && result.duplicates) {
        const filteredDuplicates = result.duplicates.filter((d: any) => d.company_id === companyId);
        
        console.log('🔍 [DUPLICATE_CHECK] Original Results:', {
          hasDuplicates: result?.has_duplicates,
          count: result?.count,
          totalDuplicates: result?.duplicates?.length || 0,
          sameCompanyDuplicates: filteredDuplicates.length
        });

        // تحديث النتائج لتشمل فقط العملاء من نفس الشركة
        const filteredResult = {
          has_duplicates: filteredDuplicates.length > 0,
          duplicates: filteredDuplicates,
          count: filteredDuplicates.length
        };

        console.log('🔍 [DUPLICATE_CHECK] Filtered Results:', {
          hasDuplicates: filteredResult.has_duplicates,
          count: filteredResult.count,
          duplicates: filteredResult.duplicates.map((d: any) => ({
            id: d.id,
            name: d.name,
            companyId: d.company_id,
            duplicateField: d.duplicate_field
          }))
        });

        return filteredResult as DuplicateCheckResult;
      }

      return result as DuplicateCheckResult;
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