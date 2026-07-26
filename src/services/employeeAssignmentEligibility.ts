import { supabase } from '@/integrations/supabase/client';

const EMPLOYEE_PROFILE_ROLES = new Set(['employee', 'collection_agent']);

export async function getEligibleEmployeeProfileIds(companyId: string): Promise<Set<string>> {
  const [{ data: profiles, error: profilesError }, { data: employees, error: employeesError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, user_id, role, is_active')
      .eq('company_id', companyId)
      .eq('is_active', true),
    supabase
      .from('employees')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .not('user_id', 'is', null),
  ]);

  if (profilesError) throw profilesError;
  if (employeesError) throw employeesError;

  const activeEmployeeUserIds = new Set(
    (employees || []).map((employee) => employee.user_id).filter(Boolean)
  );

  return new Set(
    (profiles || [])
      .filter((profile) =>
        EMPLOYEE_PROFILE_ROLES.has(profile.role || '') ||
        Boolean(profile.user_id && activeEmployeeUserIds.has(profile.user_id))
      )
      .map((profile) => profile.id)
  );
}
