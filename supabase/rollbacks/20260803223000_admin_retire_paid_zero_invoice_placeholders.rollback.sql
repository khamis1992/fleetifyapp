-- Rollback: remove the admin retirement command. Data changes produced by an
-- apply run (reversed zero journals, regenerated invoices) are ordinary
-- financial documents and are reverted through the standard reversal flow,
-- not by dropping this function.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_retire_paid_zero_invoice_placeholders(uuid, boolean);

COMMIT;
