import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyScopeContext, hasGlobalAccess } from '@/lib/companyScope';
import { queryKeys } from '@/utils/queryKeys';

export interface Company {
  id: string;
  name: string;
  name_ar?: string | null;
  email?: string | null;
  phone?: string | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  created_at?: string;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  active_modules?: string[] | null;
  business_type?: string | null;
  currency?: string | null;
  commercial_register?: string | null;
  license_number?: string | null;
  address_ar?: string | null;
  office_latitude?: number | null;
  office_longitude?: number | null;
  allowed_radius?: number | null;
  work_start_time?: string | null;
  work_end_time?: string | null;
  auto_checkout_enabled?: boolean | null;
}

export const useCompanies = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.companies.list(),
    queryFn: async (): Promise<Company[]> => {
      const context = getCompanyScopeContext(user);
      
      // Only users with global access can fetch all companies
      if (!hasGlobalAccess(context)) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, name_ar, email, phone, subscription_status, subscription_plan, created_at, address, address_ar, country, city, active_modules, business_type, currency, commercial_register, license_number, office_latitude, office_longitude, allowed_radius, work_start_time, work_end_time, auto_checkout_enabled')
        .order('name');
      
      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user && hasGlobalAccess(getCompanyScopeContext(user))
  });
};
