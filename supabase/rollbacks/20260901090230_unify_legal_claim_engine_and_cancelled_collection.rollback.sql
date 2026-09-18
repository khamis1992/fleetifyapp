BEGIN;

DROP TRIGGER IF EXISTS trg_freeze_initial_judgment_claim_snapshot ON public.legal_cases;
DROP FUNCTION IF EXISTS public.freeze_initial_judgment_claim_snapshot_v1();
DROP FUNCTION IF EXISTS public.convert_contract_to_legal_collection_v2(uuid, uuid, text, text, text, boolean, text, uuid);
DROP FUNCTION IF EXISTS public.freeze_legal_claim_snapshot_v1(uuid, uuid, uuid, text, date, text, uuid[], uuid);
DROP FUNCTION IF EXISTS public.complete_legal_transfer_readiness_v2(uuid, uuid, jsonb, text, uuid);
DROP FUNCTION IF EXISTS public.get_legal_transfer_readiness_v2(uuid, uuid);
DROP FUNCTION IF EXISTS public.calculate_legal_claim_statement_v4(uuid, uuid, date, text, uuid[]);
DROP TABLE IF EXISTS public.legal_claim_snapshots;

ALTER TABLE public.legal_cases
  DROP CONSTRAINT IF EXISTS legal_cases_vehicle_custody_at_transfer_check,
  DROP COLUMN IF EXISTS source_contract_status,
  DROP COLUMN IF EXISTS vehicle_custody_at_transfer,
  DROP COLUMN IF EXISTS vehicle_returned_at_transfer,
  DROP COLUMN IF EXISTS claim_calculation_version,
  DROP COLUMN IF EXISTS claim_calculated_at;

COMMIT;
