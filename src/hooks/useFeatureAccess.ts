import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BatchFeatureResult {
  featureCode: string;
  hasAccess: boolean;
}

/**
 * Hook to check multiple features at once (avoids calling hooks in loops)
 */
export const useFeaturesAccess = (featureCodes: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['features-access', user?.profile?.company_id, featureCodes],
    queryFn: async (): Promise<BatchFeatureResult[]> => {
      if (!user?.profile?.company_id || featureCodes.length === 0) {
        return featureCodes.map(code => ({
          featureCode: code,
          hasAccess: false
        }));
      }

      // Check all features in parallel
      const companyId = user.profile?.company_id;
      if (!companyId) {
        return featureCodes.map(code => ({ featureCode: code, hasAccess: false }));
      }

      const results = await Promise.all(
        featureCodes.map(async (featureCode) => {
          const { data, error } = await supabase.rpc('has_feature_access', {
            company_id_param: companyId,
            feature_code_param: featureCode
          });

          if (error) {
            console.error('Error checking feature access:', error);
            return { featureCode, hasAccess: false };
          }

          return { featureCode, hasAccess: data || false };
        })
      );

      return results;
    },
    enabled: !!user?.profile?.company_id && featureCodes.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Hook to check a single feature (kept for backward compatibility)
 */
export const useFeatureAccess = (featureCode: string) => {
  const { data, isLoading, error } = useFeaturesAccess([featureCode]);

  return {
    data: data?.[0]?.hasAccess || false,
    isLoading,
    error
  };
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
    staleTime: 10 * 60 * 1000,
  });
};
