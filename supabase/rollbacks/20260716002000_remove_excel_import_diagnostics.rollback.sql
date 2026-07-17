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

REVOKE ALL ON FUNCTION public.diagnose_payment_triggers_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_payment_triggers_v1() TO service_role;

CREATE OR REPLACE FUNCTION public.diagnose_customer_payment_batch_v1(
  p_company_id uuid,
  p_customer_id uuid,
  p_contract_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_message text;
  v_detail text;
  v_hint text;
  v_context text;
  v_sqlstate text;
  v_result jsonb;
BEGIN
  BEGIN
    v_result := public.create_customer_payment_batch_v1(
      p_company_id,
      p_customer_id,
      'cash',
      NULL,
      NULL,
      'QAR',
      jsonb_build_array(jsonb_build_object(
        'invoice_id', p_invoice_id,
        'contract_id', p_contract_id,
        'payment_date', p_payment_date,
        'amount', p_amount,
        'reference_number', 'diagnostic-rollback',
        'notes', 'Diagnostic payment that must be rolled back.'
      )),
      'diagnostic-rollback:' || gen_random_uuid()::text,
      p_actor_id
    );

    RAISE EXCEPTION 'diagnostic rollback after successful insert'
      USING ERRCODE = 'P0001';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      v_message = MESSAGE_TEXT,
      v_detail = PG_EXCEPTION_DETAIL,
      v_hint = PG_EXCEPTION_HINT,
      v_context = PG_EXCEPTION_CONTEXT,
      v_sqlstate = RETURNED_SQLSTATE;

    RETURN jsonb_build_object(
      'sqlstate', v_sqlstate,
      'message', v_message,
      'detail', v_detail,
      'hint', v_hint,
      'context', v_context,
      'successful_result_before_rollback', v_result
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.diagnose_customer_payment_batch_v1(
  uuid, uuid, uuid, uuid, date, numeric, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_customer_payment_batch_v1(
  uuid, uuid, uuid, uuid, date, numeric, uuid
) TO service_role;
