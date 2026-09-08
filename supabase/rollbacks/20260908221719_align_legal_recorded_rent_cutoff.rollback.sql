BEGIN;
DO $rollback$
DECLARE v_name text; v_oid regprocedure;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4'] LOOP
    v_oid:=CASE WHEN v_name='calculate_legal_claim_breakdown_v3'
      THEN 'legal_memo_calc_private.before_cutoff_calculate_legal_claim_breakdown_v3(uuid,uuid,date)'::regprocedure
      ELSE 'legal_memo_calc_private.before_cutoff_calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure END;
    EXECUTE replace(pg_get_functiondef(v_oid),'legal_memo_calc_private.before_cutoff_'||v_name||'(', 'legal_memo_calc_private.'||v_name||'(');
    EXECUTE 'DROP FUNCTION '||v_oid::text;
  END LOOP;
END;
$rollback$;
COMMIT;
