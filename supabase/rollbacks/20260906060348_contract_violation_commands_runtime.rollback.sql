BEGIN;
DROP FUNCTION IF EXISTS public.create_manual_contract_traffic_violation_v1(uuid,uuid,uuid,text,date,numeric,uuid,text,text,text);
DROP FUNCTION IF EXISTS public.cancel_traffic_violation_atomic_v1(uuid,text,uuid);
-- Keep request identities and the uniqueness constraint: rollback must not erase
-- provenance of any violations created after the forward migration.
COMMIT;
