-- Rollback: remove the admin retirement command entirely. Both the 223000 and
-- 230000 variants are admin-only commands with no dependent schema, so dropping
-- the function restores the pre-223000 state. Data changes produced by an
-- apply run are ordinary financial documents and are reverted through the
-- standard reversal flow, not by dropping this function.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_retire_paid_zero_invoice_placeholders(uuid, boolean);

COMMIT;
