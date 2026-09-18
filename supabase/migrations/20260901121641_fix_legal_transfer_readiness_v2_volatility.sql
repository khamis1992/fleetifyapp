-- The readiness v1 function performs operational-alert maintenance and row
-- locking. Its v2 wrapper must therefore be VOLATILE; marking it STABLE makes
-- PostgREST execute the nested work in a read-only transaction and return 405.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.get_legal_transfer_readiness_v2(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'public.get_legal_transfer_readiness_v2(uuid,uuid) does not exist';
  END IF;
END;
$preflight$;

ALTER FUNCTION public.get_legal_transfer_readiness_v2(uuid, uuid) VOLATILE;

COMMENT ON FUNCTION public.get_legal_transfer_readiness_v2(uuid, uuid) IS
  'Returns legal-transfer readiness and may maintain operational alert tasks through v1; intentionally VOLATILE so nested row locking is allowed.';

NOTIFY pgrst, 'reload schema';

COMMIT;
