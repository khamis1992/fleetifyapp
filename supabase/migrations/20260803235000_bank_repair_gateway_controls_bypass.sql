-- The single-active-bank repair gateway updates only payments.bank_id on
-- completed payments, which the payment financial-controls trigger correctly
-- treats as immutable unless the sanctioned controls bypass is set. Every
-- other repair gateway sets the bypass; this one was missing it, so the 63
-- nightly bank repairs failed with "Completed payments are immutable".
--
-- Applied surgically to the verified gateway text: wrap the bank_id UPDATE
-- with the same app.financial_controls_bypass used by the canonical finance
-- gateways. No other behavior changes.

BEGIN;

DO $$
DECLARE
  v_def text;
  v_target text := 'UPDATE public.payments SET bank_id=v_bank_id,updated_at=now()';
  v_replacement text := 'PERFORM set_config(''app.financial_controls_bypass'', ''on'', true); UPDATE public.payments SET bank_id=v_bank_id,updated_at=now()';
  v_occurrences integer;
BEGIN
  v_def := pg_get_functiondef(
    'public.system_agent_apply_bank_payment_integrity_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)'::regprocedure
  );

  SELECT count(*)
  INTO v_occurrences
  FROM regexp_matches(v_def, regexp_replace(v_target, '([().\[\]:])', '\\\1', 'g'), 'g');

  IF v_occurrences <> 1 THEN
    RAISE EXCEPTION
      'Bank payment repair gateway has an unexpected shape (% occurrences); aborting for manual review',
      v_occurrences;
  END IF;

  v_def := replace(v_def, v_target, v_replacement);
  EXECUTE v_def;
END;
$$;

COMMIT;
