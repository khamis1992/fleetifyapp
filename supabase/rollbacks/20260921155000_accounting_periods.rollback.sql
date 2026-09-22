-- Rollback of 20260921155000_accounting_periods.sql
BEGIN;
SET LOCAL lock_timeout = '5s';

DROP TRIGGER IF EXISTS assign_journal_accounting_period ON public.journal_entries;
DROP FUNCTION IF EXISTS public.assign_journal_accounting_period();

-- Unlink entries from the periods created here, then remove those open periods.
UPDATE public.journal_entries e
SET accounting_period_id = NULL, updated_at = now()
FROM public.accounting_periods p
WHERE p.id = e.accounting_period_id
  AND e.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND p.company_id = e.company_id
  AND p.status = 'open'
  AND NOT EXISTS (
    SELECT 1 FROM public.journal_entries x
    WHERE x.accounting_period_id IS NOT NULL AND x.accounting_period_id <> p.id
      AND x.company_id = e.company_id
  );

DELETE FROM public.accounting_periods
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND status = 'open';

NOTIFY pgrst,'reload schema';
COMMIT;
