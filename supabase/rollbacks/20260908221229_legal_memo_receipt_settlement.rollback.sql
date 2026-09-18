-- Restores reviewed pre-update engines; no financial or snapshot data changed.
BEGIN;
DO $restore$
DECLARE v_name text; v_oid regprocedure;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4','calculate_legal_claim_amount_v1'] LOOP
    v_oid:=CASE WHEN v_name='calculate_legal_claim_breakdown_v3'
      THEN 'legal_memo_calc_private.before_calculate_legal_claim_breakdown_v3(uuid,uuid,date)'::regprocedure
      WHEN v_name='calculate_legal_claim_amount_v1' THEN 'legal_memo_calc_private.before_calculate_legal_claim_amount_v1(uuid,uuid,date)'::regprocedure
      ELSE 'legal_memo_calc_private.before_calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure END;
    EXECUTE replace(pg_get_functiondef(v_oid),'legal_memo_calc_private.before_'||v_name||'(', 'public.'||v_name||'(');
  END LOOP;
END;
$restore$;
DROP SCHEMA legal_memo_calc_private CASCADE;
COMMIT;
