BEGIN;

DO $patch$
DECLARE
  v_definition text;
  v_wrong constant text := 'v_invoice.id, v_invoice.journal_entry_id, v_invoice.total_amount';
  v_correct constant text := 'v_contract.company_id, v_invoice.id, v_invoice.total_amount';
BEGIN
  SELECT pg_get_functiondef(
    'public.apply_autonomous_contract_reconciliation_core_v1(uuid,jsonb)'::regprocedure
  ) INTO v_definition;

  IF position(v_correct IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Corrected autonomous reconciliation journal verifier call was not found';
  END IF;
  IF position(v_wrong IN v_definition) > 0 THEN
    RAISE EXCEPTION 'Legacy autonomous reconciliation journal verifier call is already restored';
  END IF;

  v_definition := replace(v_definition, v_correct, v_wrong);
  EXECUTE v_definition;
END;
$patch$;

COMMIT;
