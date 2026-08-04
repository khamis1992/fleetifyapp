BEGIN;

DROP FUNCTION IF EXISTS public.complete_automated_invoice_reminder_delivery(
  uuid, boolean, text
);
DROP FUNCTION IF EXISTS public.claim_automated_invoice_reminder_delivery(
  uuid, uuid, text, date
);
DROP TABLE IF EXISTS public.automated_invoice_reminder_deliveries;

COMMIT;
