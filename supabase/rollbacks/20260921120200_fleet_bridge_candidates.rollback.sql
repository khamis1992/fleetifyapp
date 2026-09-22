-- Rollback of 20260921120200_fleet_bridge_candidates.sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP FUNCTION IF EXISTS public.get_fleet_bridge_candidates_v1(uuid, date);
NOTIFY pgrst,'reload schema';
COMMIT;
