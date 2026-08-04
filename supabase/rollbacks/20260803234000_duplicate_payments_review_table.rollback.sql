-- Rollback: drop the duplicate-payments review queue (no financial data was
-- modified by the migration, so dropping the queue is a complete rollback).

BEGIN;

DROP TABLE IF EXISTS public._review_duplicate_payments_20260803;

COMMIT;
