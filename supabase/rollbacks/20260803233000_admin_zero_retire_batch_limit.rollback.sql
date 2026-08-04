-- Rollback: remove the bounded admin retirement command.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_retire_paid_zero_invoice_placeholders(uuid, boolean, integer);

COMMIT;
