-- get_user_company_id() is called by RLS policies and privileged RPCs. Some
-- callers deliberately run with an empty search_path, so every object inside
-- this SECURITY DEFINER helper must be schema-qualified.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'public.profiles is required before hardening get_user_company_id()';
  END IF;

  IF to_regprocedure('public.get_user_company_id()') IS NULL THEN
    RAISE EXCEPTION 'public.get_user_company_id() does not exist';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT profile.company_id
  FROM public.profiles AS profile
  WHERE profile.user_id = (SELECT auth.uid())
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_user_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_company_id()
TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_user_company_id() IS
  'Returns the authenticated user company id; safe under an empty search_path for RLS and atomic RPC callers.';

COMMIT;
