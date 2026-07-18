CREATE OR REPLACE FUNCTION public.get_invoice_trigger_diagnostics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'trigger_name', trigger.tgname,
        'trigger_definition', pg_get_triggerdef(trigger.oid),
        'function_name', procedure.proname,
        'function_definition', pg_get_functiondef(procedure.oid)
      )
      ORDER BY trigger.tgname
    ),
    '[]'::jsonb
  )
  FROM pg_trigger trigger
  JOIN pg_proc procedure ON procedure.oid = trigger.tgfoid
  WHERE trigger.tgrelid = 'public.invoices'::regclass
    AND NOT trigger.tgisinternal;
$$;

REVOKE ALL ON FUNCTION public.get_invoice_trigger_diagnostics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_trigger_diagnostics() TO service_role;
