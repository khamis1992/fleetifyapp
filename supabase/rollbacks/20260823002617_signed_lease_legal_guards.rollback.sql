-- Rollback signed lease verification guards

BEGIN;

-- Drop the view
DROP VIEW IF EXISTS public.legal_contracts_without_signed_lease;

-- Restore original convert_contract_to_legal_v1 function
DROP FUNCTION IF EXISTS public.convert_contract_to_legal_v1(uuid, uuid, text, text, text, boolean, uuid);

ALTER FUNCTION public.convert_contract_to_legal_v1_pre_signed_lease_guard(uuid, uuid, text, text, text, boolean, uuid)
  RENAME TO convert_contract_to_legal_v1;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.check_contract_identity_verified_v1(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_contract_has_verified_signed_lease_v1(uuid, uuid);

COMMIT;
