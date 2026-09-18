BEGIN;

DROP FUNCTION IF EXISTS public.create_manual_contract_traffic_violation_v1(
  uuid, uuid, uuid, text, date, numeric, uuid, text, text, text
);

DROP INDEX IF EXISTS public.uq_traffic_violations_company_manual_request;

ALTER TABLE public.traffic_violations
  DROP COLUMN IF EXISTS manual_request_id;

COMMIT;
