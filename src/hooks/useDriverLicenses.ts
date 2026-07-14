import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  driverLicensesTable,
  type DriverLicenseRow,
} from '@/integrations/supabase/driverLicensesClient';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { DriverLicense, ExpiringLicense } from '@/types/customer';

const toDriverLicense = (row: DriverLicenseRow): DriverLicense => ({
  ...row,
  issue_date: row.issue_date ?? undefined,
  front_image_url: row.front_image_url ?? undefined,
  back_image_url: row.back_image_url ?? undefined,
  verified_by: row.verified_by ?? undefined,
  verified_at: row.verified_at ?? undefined,
  verification_notes: row.verification_notes ?? undefined,
  notes: row.notes ?? undefined,
  created_by: row.created_by ?? undefined,
});

const formatCustomerName = (customer: {
  customer_type: string | null;
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  company_name: string | null;
  company_name_ar: string | null;
}) => {
  const joinName = (...parts: Array<string | null>) =>
    parts.filter(Boolean).join(' ').trim();

  if (customer.customer_type === 'individual') {
    return (
      joinName(customer.first_name_ar, customer.last_name_ar) ||
      joinName(customer.first_name, customer.last_name) ||
      'غير معروف'
    );
  }

  return customer.company_name_ar || customer.company_name || 'غير معروف';
};

/**
 * Hook to fetch driver licenses for a specific customer
 * @param customerId - Customer ID to fetch licenses for
 * @param options - React Query options
 * @returns Query result with driver licenses
 */
export const useDriverLicenses = (
  customerId: string | undefined,
  options?: { enabled?: boolean }
) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['driver-licenses', customerId, companyId],
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required');
      if (!companyId) throw new Error('Company ID is required');

      const { data, error } = await driverLicensesTable()
        .select('*')
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching driver licenses:', error);
        throw error;
      }

      return (data || []).map(toDriverLicense);
    },
    enabled: options?.enabled !== false && !!customerId && !!companyId,
  });
};

/**
 * Hook to fetch a single driver license by ID
 * @param licenseId - License ID to fetch
 * @param options - React Query options
 * @returns Query result with driver license
 */
export const useDriverLicense = (
  licenseId: string | undefined,
  options?: { enabled?: boolean }
) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['driver-license', licenseId, companyId],
    queryFn: async () => {
      if (!licenseId) throw new Error('License ID is required');
      if (!companyId) throw new Error('Company ID is required');

      const { data, error } = await driverLicensesTable()
        .select('*')
        .eq('id', licenseId)
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('Error fetching driver license:', error);
        throw error;
      }

      return toDriverLicense(data);
    },
    enabled: options?.enabled !== false && !!licenseId && !!companyId,
  });
};

/**
 * Hook to fetch expiring licenses (within specified days threshold)
 * @param daysThreshold - Number of days to look ahead (default: 30)
 * @param options - React Query options
 * @returns Query result with expiring licenses
 */
export const useExpiringLicenses = (
  daysThreshold: number = 30,
  options?: { enabled?: boolean }
) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['expiring-licenses', daysThreshold, companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      const normalizedThreshold = Math.max(0, Math.floor(daysThreshold));
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + normalizedThreshold);
      const todayIso = today.toISOString().slice(0, 10);
      const endDateIso = endDate.toISOString().slice(0, 10);

      const { data: licenses, error } = await driverLicensesTable()
        .select('*')
        .eq('company_id', companyId)
        .eq('verification_status', 'verified')
        .gte('expiry_date', todayIso)
        .lte('expiry_date', endDateIso)
        .order('expiry_date', { ascending: true });

      if (error) {
        console.error('Error fetching expiring licenses:', error);
        throw error;
      }

      if (!licenses?.length) return [];

      const customerIds = [...new Set(licenses.map((license) => license.customer_id))];
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select(
          'id, customer_type, first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar'
        )
        .eq('company_id', companyId)
        .in('id', customerIds);

      if (customersError) throw customersError;

      const customersById = new Map(
        (customers || []).map((customer) => [customer.id, customer])
      );
      const dayMs = 24 * 60 * 60 * 1000;
      const todayUtc = Date.parse(`${todayIso}T00:00:00Z`);

      return licenses.map<ExpiringLicense>((license) => {
        const customer = customersById.get(license.customer_id);
        return {
          license_id: license.id,
          customer_id: license.customer_id,
          customer_name: customer ? formatCustomerName(customer) : 'غير معروف',
          license_number: license.license_number,
          expiry_date: license.expiry_date,
          days_until_expiry: Math.round(
            (Date.parse(`${license.expiry_date}T00:00:00Z`) - todayUtc) / dayMs
          ),
          company_id: license.company_id,
        };
      });
    },
    enabled: options?.enabled !== false && !!companyId,
  });
};

/**
 * Hook to count driver licenses for a customer
 * @param customerId - Customer ID to count licenses for
 * @param options - React Query options
 * @returns Query result with license count
 */
export const useDriverLicensesCount = (
  customerId: string | undefined,
  options?: { enabled?: boolean }
) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['driver-licenses-count', customerId, companyId],
    queryFn: async () => {
      if (!customerId) {
        return 0;
      }
      if (!companyId) throw new Error('Company ID is required');

      const { count, error } = await driverLicensesTable()
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error counting driver licenses:', error);
        throw error;
      }

      return count || 0;
    },
    enabled: options?.enabled !== false && !!customerId && !!companyId,
  });
};
