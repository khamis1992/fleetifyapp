-- Backfilled tasks are intentionally preserved as an immutable work/audit trail.
-- Rolling back the bridge migration stops future synchronization.

BEGIN;
COMMIT;
