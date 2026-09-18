-- Align recorded rent with the same cutoff already disclosed by the claim engine.
-- No invoice/payment DML. Retention continues to use the original as-of date.
BEGIN;
DO $patch$
DECLARE v_name text; v_oid regprocedure; v_def text; v_new text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4'] LOOP
    v_oid:=CASE WHEN v_name='calculate_legal_claim_breakdown_v3'
      THEN 'legal_memo_calc_private.calculate_legal_claim_breakdown_v3(uuid,uuid,date)'::regprocedure
      ELSE 'legal_memo_calc_private.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure END;
    IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=v_oid) IS DISTINCT FROM
      (CASE WHEN v_name='calculate_legal_claim_breakdown_v3' THEN 'e7624daa5cf7c757e8f053f9714003fe'
        ELSE 'da1c4e9c91285bd1521697634666b487' END) THEN
      RAISE EXCEPTION 'Claim engine changed since cutoff review: %',v_name;
    END IF;
    v_def:=pg_get_functiondef(v_oid);
    EXECUTE replace(v_def,'legal_memo_calc_private.'||v_name||'(', 'legal_memo_calc_private.before_cutoff_'||v_name||'(');
    IF v_name='calculate_legal_claim_breakdown_v3' THEN
      v_new:=replace(v_def,'  due_invoice_components AS (',$boundary$  recorded_rent_boundary AS (
    SELECT LEAST(p_as_of_date,COALESCE(p.vehicle_returned_at,p_as_of_date),
      COALESCE(CASE WHEN p.termination_date_status='confirmed' THEN p.termination_date END,p_as_of_date),
      COALESCE(cd.judgment_date,p_as_of_date),COALESCE(cd.outcome_date,p_as_of_date)) AS cutoff
    FROM contract_row c LEFT JOIN profile p ON TRUE LEFT JOIN case_dates cd ON TRUE
  ),
  due_invoice_components AS ($boundary$);
      v_new:=replace(v_new,'i.due_date <= p_as_of_date','i.due_date <= (SELECT cutoff FROM recorded_rent_boundary)');
      v_new:=replace(v_new,'s.due_date <= p_as_of_date','s.due_date <= (SELECT cutoff FROM recorded_rent_boundary)');
    ELSE
      v_new:=replace(v_def,'invoice.due_date <= v_effective_date',
        'invoice.due_date <= LEAST(v_effective_date,(v_breakdown->>''rent_cutoff_date'')::date)');
      v_new:=replace(v_new,'invoice.due_date > v_effective_date',
        'invoice.due_date > LEAST(v_effective_date,(v_breakdown->>''rent_cutoff_date'')::date)');
    END IF;
    IF v_new=v_def THEN RAISE EXCEPTION 'Cutoff patch did not match'; END IF;
    EXECUTE v_new;
  END LOOP;
END;
$patch$;
REVOKE ALL ON FUNCTION legal_memo_calc_private.before_cutoff_calculate_legal_claim_breakdown_v3(uuid,uuid,date),
  legal_memo_calc_private.before_cutoff_calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])
  FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
