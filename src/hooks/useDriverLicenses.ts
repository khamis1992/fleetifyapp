import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { DriverLicense, ExpiringLicense } from '@/types/customer';

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
  const { companyId, filter } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['driver-licenses', customerId, companyId],
    queryFn: async () => {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const query = supabase
        .from('driver_licenses')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      // Apply company scoping
      if (filter.company_id) {
        query.eq('company_id', filter.company_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching driver licenses:', error);
        throw error;
      }

      return (data || []) as DriverLicense[];
    },
    enabled: options?.enabled !== false && !!customerId,
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
  const { companyId, filter } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['driver-license', licenseId, companyId],
    queryFn: async () => {
      if (!licenseId) {
        throw new Error('License ID is required');
      }

      const query = supabase
        .from('driver_licenses')
        .select('*')
        .eq('id', licenseId)
        .single();

      // Apply company scoping
      if (filter.company_id) {
        query.eq('company_id', filter.company_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching driver license:', error);
        throw error;
      }

      return data as DriverLicense;
    },
    enabled: options?.enabled !== false && !!licenseId,
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
      const { data, error } = await supabase.rpc('get_expiring_licenses', {
        days_threshold: daysThreshold,
      });

      if (error) {
        console.error('Error fetching expiring licenses:', error);
        throw error;
      }

      return (data || []) as ExpiringLicense[];
    },
    enabled: options?.enabled !== false,
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
  const { companyId, filter } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['driver-licenses-count', customerId, companyId],
    queryFn: async () => {
      if (!customerId) {
        return 0;
      }

      const query = supabase
        .from('driver_licenses')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId);

      // Apply company scoping
      if (filter.company_id) {
        query.eq('company_id', filter.company_id);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error counting driver licenses:', error);
        throw error;
      }

      return count || 0;
    },
    enabled: options?.enabled !== false && !!customerId,
  });
};
