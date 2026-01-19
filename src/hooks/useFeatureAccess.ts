import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if the current user's company has access to a specific feature
 */
export const useFeatureAccess = (featureCode: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feature-access', featureCode, user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return false;
      }

      const { data, error } = await supabase.rpc('has_feature_access', {
        company_id_param: user.profile.company_id,
        feature_code_param: featureCode
      });

      if (error) {
        console.error('Error checking feature access:', error);
        return false;
      }

      return data || false;
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get all available features for the current user's company
 */
export const useCompanyFeatures = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['company-features', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('feature_gates')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching features:', error);
        return [];
      }

      // Filter features based on company's plan
      const companyData = await supabase
        .from('companies')
        .select(`
          current_plan_id,
          subscription_plans!inner(plan_code)
        `)
        .eq('id', user.profile.company_id)
        .single();

      if (companyData.error) {
        return [];
      }

      const companyPlan = companyData.data?.subscription_plans?.plan_code || 'free';

      return data.filter(feature => 
        !feature.required_plans || 
        feature.required_plans.length === 0 || 
        feature.required_plans.includes(companyPlan)
      );
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};