BEGIN;
DO $restore$
BEGIN
  EXECUTE replace(pg_get_functiondef('legal_memo_calc_private.before_snapshot_details_validator(uuid,uuid,jsonb)'::regprocedure),
    'legal_memo_calc_private.before_snapshot_details_validator(', 'public.validate_taqadi_filing_payload_v1_pre_failure_containment(');
END;
$restore$;
REVOKE ALL ON FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.validate_taqadi_filing_payload_v1_pre_failure_containment(uuid,uuid,jsonb) TO authenticated,service_role;
DROP FUNCTION legal_memo_calc_private.validate_snapshot_statement(uuid,uuid,jsonb,jsonb);
DROP FUNCTION legal_memo_calc_private.before_snapshot_details_validator(uuid,uuid,jsonb);
COMMIT;
