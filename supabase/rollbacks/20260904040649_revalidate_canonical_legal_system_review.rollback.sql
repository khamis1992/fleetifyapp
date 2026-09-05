-- Roll back before 20260904034603. Keep all review/audit/financial records.
BEGIN;
DO $restore$
BEGIN
  EXECUTE replace(pg_get_functiondef('legal_claim_internal.legacy_auto_review_v1(uuid,uuid,uuid)'::regprocedure),
    'legal_claim_internal.legacy_auto_review_v1(', 'public.auto_verify_legal_transfer_review_v1(');
END;
$restore$;
REVOKE ALL ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auto_verify_legal_transfer_review_v1(uuid,uuid,uuid) TO service_role;
DROP FUNCTION legal_claim_internal.auto_verify_review_v2(uuid,uuid,uuid);
DROP FUNCTION legal_claim_internal.legacy_auto_review_v1(uuid,uuid,uuid);
COMMIT;
