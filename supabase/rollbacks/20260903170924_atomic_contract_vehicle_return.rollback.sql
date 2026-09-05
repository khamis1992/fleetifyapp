BEGIN;

DROP FUNCTION IF EXISTS public.record_contract_vehicle_return_v1(
  uuid, timestamptz, integer, numeric, text, jsonb, jsonb, jsonb, jsonb, text, uuid
);

COMMIT;
