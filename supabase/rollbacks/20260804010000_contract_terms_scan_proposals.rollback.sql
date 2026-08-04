-- Rollback: drop the contract terms scan proposals table.

BEGIN;

DROP TABLE IF EXISTS public.contract_terms_scan_proposals;

COMMIT;
