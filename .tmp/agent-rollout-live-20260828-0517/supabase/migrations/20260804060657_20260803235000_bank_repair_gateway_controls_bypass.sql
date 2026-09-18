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

COMMIT;;
