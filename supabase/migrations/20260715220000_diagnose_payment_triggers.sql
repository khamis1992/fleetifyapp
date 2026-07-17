CREATE OR REPLACE FUNCTION public.diagnose_payment_triggers_v1()
RETURNS TABLE (
  trigger_name text,
  function_name text,
  trigger_definition text,
  function_definition text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    trigger_row.tgname::text,
    function_row.proname::text,
    pg_catalog.pg_get_triggerdef(trigger_row.oid)::text,
    pg_catalog.pg_get_functiondef(function_row.oid)::text
  FROM pg_catalog.pg_trigger trigger_row
  JOIN pg_catalog.pg_class table_row
    ON table_row.oid = trigger_row.tgrelid
  JOIN pg_catalog.pg_namespace schema_row
    ON schema_row.oid = table_row.relnamespace
  JOIN pg_catalog.pg_proc function_row
    ON function_row.oid = trigger_row.tgfoid
  WHERE schema_row.nspname = 'public'
    AND table_row.relname = 'payments'
    AND NOT trigger_row.tgisinternal
  ORDER BY trigger_row.tgname;
$$;

REVOKE ALL ON FUNCTION public.diagnose_payment_triggers_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.diagnose_payment_triggers_v1() FROM anon;
REVOKE ALL ON FUNCTION public.diagnose_payment_triggers_v1() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_payment_triggers_v1() TO service_role;

COMMENT ON FUNCTION public.diagnose_payment_triggers_v1() IS
  'Temporary service-role-only diagnostic for payment trigger definitions.';
