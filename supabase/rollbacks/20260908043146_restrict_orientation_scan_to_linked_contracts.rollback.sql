-- Restore only the previous selection definition. This does not undo any
-- corrections, remove source history or change the worker's policy.
DO $rollback$
DECLARE v_definition text;
BEGIN
  v_definition:=pg_get_functiondef('public.contract_orientation_candidates_v1(uuid,integer,uuid)'::regprocedure);
  IF position('  JOIN public.contracts ctr ON ctr.id=d.contract_id AND ctr.company_id=d.company_id' IN v_definition)=0 THEN
    RAISE EXCEPTION 'Candidate function changed; review rollback'; END IF;
  EXECUTE replace(v_definition,'  JOIN public.contracts ctr ON ctr.id=d.contract_id AND ctr.company_id=d.company_id','');
END;
$rollback$;
