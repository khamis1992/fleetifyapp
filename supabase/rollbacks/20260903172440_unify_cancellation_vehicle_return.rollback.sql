BEGIN;

DROP FUNCTION IF EXISTS public.cancel_contract_with_return_and_penalties_v2(
  uuid, uuid, text, boolean, jsonb, uuid
);

COMMIT;
