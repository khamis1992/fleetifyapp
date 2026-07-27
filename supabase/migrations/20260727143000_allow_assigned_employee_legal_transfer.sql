-- Allow the employee responsible for a contract to complete the legal-transfer
-- workflow even when they do not have a manager/legal department role.

CREATE OR REPLACE FUNCTION public.can_prepare_contract_for_legal_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_profile AS (
    SELECT profile.id, profile.role, profile.company_id
    FROM public.profiles profile
    WHERE profile.user_id = auth.uid()
      AND profile.company_id = p_company_id
      AND COALESCE(profile.is_active, true)
    LIMIT 1
  )
  SELECT
    COALESCE(auth.role(), '') = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND public.get_user_company_id() = p_company_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.user_roles role
          WHERE role.user_id = auth.uid()
            AND role.role::text IN (
              'super_admin', 'admin', 'company_admin', 'manager',
              'accountant', 'sales_agent', 'legal', 'employee_workspace'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM current_profile profile
          WHERE profile.role::text IN (
            'super_admin', 'admin', 'company_admin', 'manager',
            'accountant', 'sales_agent', 'legal', 'employee_workspace',
            'employee', 'مساحة العمل فقط'
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.contracts contract
          JOIN current_profile profile
            ON profile.id = contract.assigned_to_profile_id
           AND profile.company_id = contract.company_id
          WHERE contract.id = p_contract_id
            AND contract.company_id = p_company_id
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_prepare_contract_for_legal_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_prepare_contract_for_legal_v1(uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.can_prepare_contract_for_legal_v1(uuid, uuid)
IS 'Allows legal-transfer preparation/conversion for privileged users and for the profile assigned to the target contract.';
