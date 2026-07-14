DROP FUNCTION IF EXISTS public.create_manual_invoice_v1(uuid, text, date, text, date, uuid, uuid, text, numeric, text, text, uuid, uuid, uuid, jsonb, uuid, uuid);
DROP INDEX IF EXISTS public.uq_invoices_manual_idempotency;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS manual_idempotency_key;
