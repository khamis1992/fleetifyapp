BEGIN;

DROP INDEX IF EXISTS public.idx_legal_claim_snapshots_contract_id;

-- The function body is restored by reapplying the preceding unified legal
-- claim migration when a full rollback is required.

COMMIT;
