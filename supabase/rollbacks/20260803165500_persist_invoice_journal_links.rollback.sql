-- Restore the previous AFTER INSERT trigger timing. Historical links safely
-- backfilled by the forward migration are intentionally retained.

BEGIN;

DROP TRIGGER IF EXISTS zz_persist_invoice_reference_journal_link ON public.invoices;
DROP FUNCTION IF EXISTS public.persist_invoice_reference_journal_link_before_insert();

DROP TRIGGER IF EXISTS trg_invoice_journal_entry ON public.invoices;
CREATE TRIGGER trg_invoice_journal_entry
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.trg_invoice_journal_entry_fn();

COMMENT ON TRIGGER trg_invoice_journal_entry ON public.invoices IS NULL;

COMMIT;
