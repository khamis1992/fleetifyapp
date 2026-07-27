-- Restore the previous legal-transfer permission helper.

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
              'accountant', 'sales_agent', 'legal'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.contracts contract
          JOIN public.profiles profile
            ON profile.id = contract.assigned_to_profile_id
           AND profile.company_id = contract.company_id
          WHERE contract.id = p_contract_id
            AND contract.company_id = p_company_id
            AND profile.user_id = auth.uid()
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_prepare_contract_for_legal_v1(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_prepare_contract_for_legal_v1(uuid, uuid)
  TO authenticated, service_role;
