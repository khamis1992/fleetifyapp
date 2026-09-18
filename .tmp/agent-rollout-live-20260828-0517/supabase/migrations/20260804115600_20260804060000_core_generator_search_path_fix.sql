BEGIN;

DO $$
DECLARE
  v_def text;
  v_target text := 'SET search_path TO ''''';
  v_replacement text := 'SET search_path TO pg_catalog, public';
BEGIN
  v_def := pg_get_functiondef(
    'public.system_generate_invoice_for_contract_month_core(uuid,date)'::regprocedure
  );

  IF v_def NOT LIKE '%' || v_target || '%' THEN
    RAISE EXCEPTION 'core generator search_path marker not found; aborting for manual review';
  END IF;

  v_def := replace(v_def, v_target, v_replacement);
  EXECUTE v_def;
END;
$$;

COMMIT;;
