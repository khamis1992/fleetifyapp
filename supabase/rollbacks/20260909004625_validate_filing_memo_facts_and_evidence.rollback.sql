BEGIN;
DO $restore$
BEGIN
  EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.before_active_traffic_evidence(uuid,uuid,date)'::regprocedure),
    'legal_memo_calc_private.before_active_traffic_evidence(', 'legal_memo_calc_private.read_traffic(');
  EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.before_snapshot_facts_validator(uuid,uuid,jsonb)'::regprocedure),
    'legal_memo_calc_private.before_snapshot_facts_validator(', 'public.validate_taqadi_filing_payload_v1_pre_failure_containment(');
END;
$restore$;
REVOKE ALL ON FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb) TO authenticated,service_role;
DROP FUNCTION legal_memo_calc_private.validate_snapshot_facts(uuid,uuid,jsonb);
DROP FUNCTION legal_memo_calc_private.before_snapshot_facts_validator(uuid,uuid,jsonb);
DROP FUNCTION legal_memo_calc_private.before_active_traffic_evidence(uuid,uuid,date);
COMMIT;
