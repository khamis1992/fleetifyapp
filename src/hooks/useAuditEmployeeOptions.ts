import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface AuditEmployeeProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  email: string;
  role: string | null;
}

export interface AuditEmployeeOption {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string | null;
}

export const mapAuditEmployeeOptions = (
  profiles: AuditEmployeeProfile[]
): AuditEmployeeOption[] =>
  profiles
    .map((profile) => {
      const arabicName = [profile.first_name_ar, profile.last_name_ar]
        .filter(Boolean)
        .join(' ')
        .trim();
      const latinName = [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

      return {
        id: profile.id,
        userId: profile.user_id,
        name: arabicName || latinName || profile.email,
        email: profile.email,
        role: profile.role,
      };
    })
    .sort((first, second) => first.name.localeCompare(second.name, 'ar'));

export function useAuditEmployeeOptions() {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['audit-employee-options', companyId],
    enabled: Boolean(companyId),
    staleTime: 60_000,
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id,user_id,first_name,last_name,first_name_ar,last_name_ar,email,role')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('first_name_ar', { ascending: true, nullsFirst: false });

      if (error) throw error;

      return mapAuditEmployeeOptions((data || []) as AuditEmployeeProfile[]);
    },
  });
}
