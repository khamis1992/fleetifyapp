import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';

export const useTenants = () => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['tenants', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tenants:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!companyId
  });
};