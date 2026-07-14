BEGIN;

DROP INDEX IF EXISTS public.idx_customer_notes_company_customer_created;
ALTER TABLE public.customer_notes DROP CONSTRAINT IF EXISTS customer_notes_call_status_check;
ALTER TABLE public.customer_notes DROP COLUMN IF EXISTS call_status;

COMMIT;
