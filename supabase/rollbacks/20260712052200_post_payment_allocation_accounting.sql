-- Rollback is allowed only before allocation adjustment journals are used.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payment_allocation_change_log
    WHERE journal_entry_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'Rollback stopped: allocation accounting journals exist. Reverse those allocation changes before removing this control.'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS post_payment_allocation_change_accounting_trigger
  ON public.payment_allocation_change_log;
DROP FUNCTION IF EXISTS public.post_payment_allocation_change_accounting();
DROP FUNCTION IF EXISTS public.create_payment_allocation_adjustment_journal(uuid, uuid);
DROP FUNCTION IF EXISTS public.resolve_payment_posting_account(uuid, text);

DROP INDEX IF EXISTS public.uq_payment_allocation_change_log_journal;

ALTER TABLE public.payment_allocation_change_log
  DROP CONSTRAINT IF EXISTS payment_allocation_change_log_journal_entry_id_fkey,
  DROP COLUMN IF EXISTS journal_entry_id,
  DROP COLUMN IF EXISTS accounting_delta,
  DROP COLUMN IF EXISTS accounting_before_allocated,
  DROP COLUMN IF EXISTS accounting_after_allocated;
