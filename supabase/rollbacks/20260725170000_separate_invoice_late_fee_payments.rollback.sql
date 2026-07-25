DROP FUNCTION IF EXISTS public.create_invoice_payment_with_late_fee_v1(
  uuid, uuid, numeric, numeric, uuid, date, text, text, text, text, uuid
);

-- Restore the previous invoice-only allocation validator and trigger behavior
-- by reapplying migrations 20260712052000 and 20260712052500 if rollback is required.
