BEGIN;

ALTER FUNCTION public.get_legal_transfer_readiness_v2(uuid, uuid) STABLE;
NOTIFY pgrst, 'reload schema';

COMMIT;
