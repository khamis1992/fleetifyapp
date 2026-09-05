BEGIN;
-- Disable new callers only. Retain immutable request history and its guards as
-- well as receipts and v1. A forward migration is required to re-enable the RPC;
-- do not rerun the original CREATE TABLE migration over retained evidence.
DROP FUNCTION IF EXISTS public.create_invoice_payment_with_late_fee_v2(
  uuid, uuid, numeric, numeric, uuid, date, text, text, text, text, uuid
);
COMMIT;
