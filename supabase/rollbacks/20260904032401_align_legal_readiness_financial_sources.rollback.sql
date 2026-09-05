-- Roll back before the canonical legal engine migration. No financial DML.
BEGIN;
DO $restore$
BEGIN
  EXECUTE replace(pg_get_functiondef('legal_claim_internal.legacy_readiness_v2(uuid,uuid)'::regprocedure),
    'legal_claim_internal.legacy_readiness_v2(', 'public.get_legal_transfer_readiness_v2(');
END;
$restore$;
REVOKE ALL ON FUNCTION public.get_legal_transfer_readiness_v2(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_legal_transfer_readiness_v2(uuid,uuid) TO authenticated,service_role;
DROP FUNCTION legal_claim_internal.get_readiness_v3(uuid,uuid);
DROP FUNCTION legal_claim_internal.read_readiness_finances_v1(uuid,uuid,date);
DROP FUNCTION legal_claim_internal.legacy_readiness_v2(uuid,uuid);
COMMIT;
