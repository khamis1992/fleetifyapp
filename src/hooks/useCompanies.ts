import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCompanyScopeContext, hasGlobalAccess } from '@/lib/companyScope';
import { queryKeys } from '@/utils/queryKeys';

export interface Company {
  id: string;
  name: string;
  name_ar?: string;
  email?: string;
  phone?: string;
  subscription_status?: string;
  subscription_plan?: string;
  created_at?: string;
  address?: string;
  country?: string;
  city?: string;
  active_modules?: string[];
  business_type?: string;
  currency?: string;
  commercial_register?: string;
  license_number?: string;
  address_ar?: string;
  office_latitude?: number;
  office_longitude?: number;
  allowed_radius?: number;
  work_start_time?: string;
  work_end_time?: string;
  auto_checkout_enabled?: boolean;
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