BEGIN;

DROP FUNCTION IF EXISTS public.cancel_contract_with_company_traffic_penalties_v1(uuid, uuid, text, boolean, uuid);
DROP FUNCTION IF EXISTS public.get_contract_cancellation_impact_v1(uuid, uuid);

DROP INDEX IF EXISTS public.idx_penalties_original_contract;
DROP INDEX IF EXISTS public.idx_penalties_company_responsibility;

ALTER TABLE public.penalties
  DROP CONSTRAINT IF EXISTS penalties_responsibility_party_check,
  DROP COLUMN IF EXISTS original_contract_number,
  DROP COLUMN IF EXISTS original_contract_id,
  DROP COLUMN IF EXISTS responsible_customer_id,
  DROP COLUMN IF EXISTS responsibility_decided_by,
  DROP COLUMN IF EXISTS responsibility_decided_at,
  DROP COLUMN IF EXISTS responsibility_reason,
  DROP COLUMN IF EXISTS responsibility_party;

COMMIT;
