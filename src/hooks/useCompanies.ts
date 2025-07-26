import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
}

export const useCompanies = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['companies'],
    queryFn: async (): Promise<Company[]> => {
      // Only Super Admins can fetch all companies
      const isSuperAdmin = user?.roles?.includes('super_admin');
      
      if (!isSuperAdmin) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, name_ar, email, phone, subscription_status, subscription_plan, created_at, address, country, city')
        .order('name');
      
      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user && user?.roles?.includes('super_admin')
  });
};