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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseDuplicate(value: unknown): DuplicateCustomer | null {
  if (!isRecord(value)) return null;
  const id = requiredString(value.id);
  const companyId = requiredString(value.company_id);
  if (!id || !companyId) return null;

  return {
    id,
    company_id: companyId,
    name: requiredString(value.name) || 'عميل غير مسمى',
    customer_type: requiredString(value.customer_type) || 'individual',
    duplicate_field: requiredString(value.duplicate_field) || 'unknown',
    duplicate_value: requiredString(value.duplicate_value) || '',
    company_name: requiredString(value.company_name) || undefined,
  };
}

function parseDuplicateResult(
  value: unknown,
  companyId: string,
  excludeCustomerId?: string
): DuplicateCheckResult {
  if (!isRecord(value) || !Array.isArray(value.duplicates)) {
    return { has_duplicates: false, duplicates: [], count: 0 };
  }

  const duplicates = value.duplicates
    .map(parseDuplicate)
    .filter((duplicate): duplicate is DuplicateCustomer => Boolean(duplicate))
    .filter(duplicate => duplicate.company_id === companyId && duplicate.id !== excludeCustomerId);

  return {
    has_duplicates: duplicates.length > 0,
    duplicates,
    count: duplicates.length,
  };
}

export const useCustomerDuplicateCheck = (
  customerData: CustomerData,
  enabled = true,
  excludeCustomerId?: string
) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['customer-duplicate-check', companyId, customerData, excludeCustomerId],
    queryFn: async (): Promise<DuplicateCheckResult> => {
      if (!companyId) throw new Error('Company context is unavailable');

      const { data, error } = await supabase.rpc('check_duplicate_customer', {
        p_company_id: companyId,
        p_customer_type: customerData.customer_type,
        p_national_id: customerData.national_id || undefined,
        p_passport_number: customerData.passport_number || undefined,
        p_phone: customerData.phone || undefined,
        p_email: customerData.email || undefined,
        p_company_name: customerData.company_name || undefined,
        p_commercial_register: customerData.commercial_register || undefined,
        p_exclude_customer_id: excludeCustomerId || undefined,
      });

      if (error) throw error;
      return parseDuplicateResult(data, companyId, excludeCustomerId);
    },
    enabled: enabled && Boolean(companyId) && Boolean(
      customerData.national_id ||
      customerData.passport_number ||
      customerData.phone ||
      customerData.email ||
      customerData.commercial_register ||
      (customerData.customer_type === 'corporate' && customerData.company_name)
    ),
    staleTime: 0,
  });
};
