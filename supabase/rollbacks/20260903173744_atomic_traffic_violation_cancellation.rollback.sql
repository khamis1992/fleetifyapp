BEGIN;

DROP FUNCTION IF EXISTS public.cancel_traffic_violation_atomic_v1(uuid, text, uuid);

COMMIT;
