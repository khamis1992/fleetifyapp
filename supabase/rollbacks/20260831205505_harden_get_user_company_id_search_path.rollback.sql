BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  SELECT company_id
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_user_company_id() FROM anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO PUBLIC;

COMMENT ON FUNCTION public.get_user_company_id() IS NULL;

COMMIT;
