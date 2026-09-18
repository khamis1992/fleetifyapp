-- Runs the permanent-deletion workflow inside a subtransaction and always
-- rolls it back. This exposes the exact PostgreSQL failure without changing
-- contract, finance, legal, document, or violation records.

CREATE OR REPLACE FUNCTION public.diagnose_contract_permanent_deletion_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_message text;
  v_detail text;
  v_hint text;
  v_context text;
  v_state text;
BEGIN
  IF COALESCE(auth.role()::text, '') <> 'service_role' THEN
    RAISE EXCEPTION 'Deletion diagnostics are restricted to the service role'
      USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_result := public.delete_contract_with_financial_reversals_v2(
      p_company_id,
      p_contract_id,
      'Safe rollback-only permanent deletion diagnostic',
      'company',
      'reverse_and_cancel',
      p_actor_id
    );

    RAISE EXCEPTION '__contract_delete_probe_rollback__'
      USING ERRCODE = 'PZ001';
  EXCEPTION
    WHEN SQLSTATE 'PZ001' THEN
      RETURN jsonb_build_object(
        'success', true,
        'rolled_back', true,
        'workflow_result', v_result
      );
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS
        v_state = RETURNED_SQLSTATE,
        v_message = MESSAGE_TEXT,
        v_detail = PG_EXCEPTION_DETAIL,
        v_hint = PG_EXCEPTION_HINT,
        v_context = PG_EXCEPTION_CONTEXT;

      RETURN jsonb_build_object(
        'success', false,
        'rolled_back', true,
        'sqlstate', v_state,
        'message', v_message,
        'detail', v_detail,
        'hint', v_hint,
        'context', v_context
      );
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.diagnose_contract_permanent_deletion_v1(
  uuid, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_contract_permanent_deletion_v1(
  uuid, uuid, uuid
) TO service_role;
COMMENT ON FUNCTION public.diagnose_contract_permanent_deletion_v1(
  uuid, uuid, uuid
) IS
'Executes permanent contract deletion in a rollback-only subtransaction and returns exact failure diagnostics.';
