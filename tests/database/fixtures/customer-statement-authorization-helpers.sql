-- Read-only live helper definitions; no production data.
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT profile.company_id
  FROM public.profiles AS profile
  WHERE profile.user_id = (SELECT auth.uid())
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_finance_action_authorized(p_actor_id uuid, p_company_id uuid, p_permission_ids text[], p_allowed_roles text[])
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_super_admin boolean := false;
BEGIN
  IF p_actor_id IS NULL OR p_company_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = p_actor_id
      AND role.role::text = 'super_admin'
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin
     AND public.get_user_company_id() IS DISTINCT FROM p_company_id
  THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_permissions permission
    WHERE permission.user_id = p_actor_id
      AND permission.permission_id = ANY(COALESCE(p_permission_ids, ARRAY[]::text[]))
      AND permission.granted = false
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_permissions permission
    WHERE permission.user_id = p_actor_id
      AND permission.permission_id = ANY(COALESCE(p_permission_ids, ARRAY[]::text[]))
      AND permission.granted = true
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = p_actor_id
      AND role.role::text = ANY(COALESCE(p_allowed_roles, ARRAY[]::text[]))
      AND (
        role.role::text = 'super_admin'
        OR role.company_id IS NULL
        OR role.company_id = p_company_id
      )
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.is_finance_action_authorized(uuid,uuid,text[],text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance_action_authorized(uuid,uuid,text[],text[]) TO service_role;

