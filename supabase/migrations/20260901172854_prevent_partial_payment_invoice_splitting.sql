BEGIN;

-- The application records partial receipts against the existing invoice and
-- leaves its balance_due open. This legacy RPC did the inverse: it created a
-- new invoice from a payment and was callable by browser roles. Keeping it
-- executable allows old clients to reintroduce split/duplicate obligations.
REVOKE EXECUTE ON FUNCTION public.create_invoice_from_payment(
  uuid,
  uuid,
  uuid,
  numeric,
  date,
  text
) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.create_invoice_from_payment(
  uuid,
  uuid,
  uuid,
  numeric,
  date,
  text
) IS
  'Disabled for browser roles. Partial payments must be allocated to the existing invoice; the remaining balance stays on that invoice.';

COMMIT;
