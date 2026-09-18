-- This legacy BEFORE trigger updates the same invoice row that fired it,
-- causing SQLSTATE 27000 on every status repair. The canonical journal
-- trigger (trg_invoice_journal_entry) already owns invoice journal creation.
DROP TRIGGER IF EXISTS invoice_auto_journal_trigger ON public.invoices;
DROP FUNCTION IF EXISTS public.get_invoice_trigger_diagnostics();
