-- Rollback: remove the proposal apply command. Corrections already applied
-- through it are ordinary financial documents and are reverted through the
-- standard reversal flow, not by dropping this function.

BEGIN;

DROP FUNCTION IF EXISTS public.apply_contract_terms_scan_proposal(uuid, text);

COMMIT;
