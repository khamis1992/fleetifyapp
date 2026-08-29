-- Fix the autonomous reconciliation postcondition to call the canonical
-- journal verifier with (company_id, invoice_id, expected_amount). The prior
-- call accidentally passed (invoice_id, journal_entry_id, expected_amount),
-- making every newly generated invoice fail closed even when correctly posted.

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

  IF position(v_wrong IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected autonomous reconciliation journal verifier call was not found';
  END IF;
  IF position(v_correct IN v_definition) > 0 THEN
    RAISE EXCEPTION 'Autonomous reconciliation journal verifier call is already corrected';
  END IF;

  v_definition := replace(v_definition, v_wrong, v_correct);
  EXECUTE v_definition;
END;
$patch$;

COMMENT ON FUNCTION public.apply_autonomous_contract_reconciliation_core_v1(uuid,jsonb) IS
  'Guarded signed-contract reconciliation core; invoice journals are verified by company and invoice identity.';

COMMIT;
