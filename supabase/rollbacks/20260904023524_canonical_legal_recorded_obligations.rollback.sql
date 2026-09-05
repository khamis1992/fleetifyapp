-- Roll back all consumers first. Do not use CASCADE or remove shared settlement.
BEGIN;
DROP FUNCTION public.canonical_legal_recorded_obligations_v1(uuid,uuid,date,uuid[]);
COMMIT;
