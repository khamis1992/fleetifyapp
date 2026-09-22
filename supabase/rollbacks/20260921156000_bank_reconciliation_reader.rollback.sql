-- Rollback of 20260921156000_bank_reconciliation_reader.sql
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP FUNCTION IF EXISTS public.get_bank_reconciliation_v1(uuid);
NOTIFY pgrst,'reload schema';
COMMIT;
