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
COMMENT ON FUNCTION public.diagnose_customer_payment_batch_v1(
  uuid, uuid, uuid, uuid, date, numeric, uuid
) IS 'Temporary rollback-only diagnostic for customer payment batch errors.';
