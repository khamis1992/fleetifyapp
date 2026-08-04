-- Rollback: restore the uncapped canonical paid assignment in the finance
-- repair gateway (pre-20260803220000 behavior).

BEGIN;

DO $$
DECLARE
  v_def text;
  v_target text := 'v_paid := CASE WHEN COALESCE(v_contract.contract_amount, 0) > 0 THEN LEAST(public.canonical_contract_paid_amount(v_contract.id), v_contract.contract_amount) ELSE public.canonical_contract_paid_amount(v_contract.id) END;';
  v_replacement text := 'v_paid := public.canonical_contract_paid_amount(v_contract.id);';
  v_occurrences integer;
BEGIN
  v_def := pg_get_functiondef(
    'public.system_agent_apply_finance_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)'::regprocedure
  );

  SELECT count(*)
  INTO v_occurrences
  FROM regexp_matches(v_def, regexp_replace(v_target, '([().\[\]:])', '\\\1', 'g'), 'g');

  IF v_occurrences <> 1 THEN
    RAISE EXCEPTION
      'Canonical finance gateway shape changed (% occurrences); rollback aborted for manual review',
      v_occurrences;
  END IF;

  v_def := replace(v_def, v_target, v_replacement);
  EXECUTE v_def;
END;
$$;

COMMIT;
