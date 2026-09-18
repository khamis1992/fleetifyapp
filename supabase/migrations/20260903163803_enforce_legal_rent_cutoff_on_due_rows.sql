-- Superseded before deployment by 20260904024349_integrate_canonical_legal_claim_rows.
-- The old whole-calculation date wrapper erased retention and could subtract
-- post-cutoff exclusions from earlier debt. It also mixed schema and case DML.
-- Frozen rejected candidate is kept in tests/database/fixtures for regression
-- evidence only. No case value is changed by this migration.
BEGIN;
COMMIT;
