-- WARNING: applying this rollback restores the production failure mode where
-- convert_contract_to_legal_collection_v2 references missing helper functions.

BEGIN;

DROP FUNCTION IF EXISTS public.check_contract_identity_verified_v1(uuid, uuid);
DROP FUNCTION IF EXISTS public.check_contract_has_verified_signed_lease_v1(uuid, uuid);

COMMIT;
