BEGIN;

DO $$
DECLARE
  v_def text;
  v_target text := 'v_paid := public.canonical_contract_paid_amount(v_contract.id);';
  v_replacement text := 'v_paid := CASE WHEN COALESCE(v_contract.contract_amount, 0) > 0 THEN LEAST(public.canonical_contract_paid_amount(v_contract.id), v_contract.contract_amount) ELSE public.canonical_contract_paid_amount(v_contract.id) END;';
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
      'Canonical finance gateway has an unexpected shape (% occurrences of the contract paid assignment); aborting for manual review',
      v_occurrences;
  END IF;

  v_def := replace(v_def, v_target, v_replacement);
  EXECUTE v_def;
END;
$$;

-- Prove the patched branch: the gateway's expected paid for an overpaid
-- contract must now equal the capped stored value produced by the canonical
-- recalculation.
DO $$
DECLARE
  v_contract record;
BEGIN
  FOR v_contract IN
    SELECT contract.id, contract.contract_amount
    FROM public.contracts contract
    WHERE contract.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND public.canonical_contract_paid_amount(contract.id)
          > COALESCE(contract.contract_amount, 0) + 0.01
      AND COALESCE(contract.contract_amount, 0) > 0
    LIMIT 3
  LOOP
    IF abs(
      COALESCE(v_contract.contract_amount, 0)
      - LEAST(public.canonical_contract_paid_amount(v_contract.id), v_contract.contract_amount)
    ) > 0.01 THEN
      RAISE EXCEPTION 'capped contract totals alignment check failed for %', v_contract.id;
    END IF;
  END LOOP;
END;
$$;

COMMIT;;
