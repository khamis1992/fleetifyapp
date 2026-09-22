-- Rollback of 20260921153000_one_journal_per_invoice.sql
-- Restores nothing automatically: cancelled duplicate families stay retired
-- (re-posting them would reintroduce the duplicates); only the preventive
-- unique index is dropped.
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP INDEX IF EXISTS public.uq_one_live_invoice_journal_per_invoice;
NOTIFY pgrst,'reload schema';
COMMIT;
