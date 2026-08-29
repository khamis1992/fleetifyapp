-- Safety rollback: stale identity verification must not become legally valid
-- again. Requests, quarantine state, and audit records remain intact.

BEGIN;

DO $safety_rollback$
BEGIN
  IF to_regprocedure('public.expire_unverified_signed_contracts_v1(uuid,integer)') IS NULL THEN
    RAISE EXCEPTION 'Identity-expiry guard is missing; refusing an unsafe rollback';
  END IF;
END;
$safety_rollback$;

COMMIT;
