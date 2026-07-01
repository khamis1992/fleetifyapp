-- Cancelled payments are audit records, not active financial transactions.
-- Duplicate-prevention indexes must therefore ignore rows where
-- payment_status = 'cancelled', otherwise a corrected replacement payment
-- can be blocked by the cancelled original row.

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS uq_payment_unique_transaction;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS prevent_duplicate_contract_payments;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS uq_payment_invoice_unique;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS prevent_duplicate_invoice_payments;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS uq_payment_contract_unique;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS unique_payment_per_invoice_date_amount;

DROP INDEX IF EXISTS public.idx_payments_unique_transaction;
DROP INDEX IF EXISTS public.prevent_duplicate_contract_payments;
DROP INDEX IF EXISTS public.prevent_duplicate_invoice_payments;
DROP INDEX IF EXISTS public.unique_payment_per_invoice_date_amount;

CREATE INDEX IF NOT EXISTS idx_payments_unique_transaction
ON public.payments (
  company_id,
  COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(contract_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(invoice_id, '00000000-0000-0000-0000-000000000000'::uuid),
  payment_date,
  amount,
  transaction_type
)
WHERE payment_status IS DISTINCT FROM 'cancelled';

COMMENT ON INDEX public.idx_payments_unique_transaction IS
'Speeds up duplicate detection for active payment transactions while allowing cleanup of existing historical duplicates.';

CREATE INDEX IF NOT EXISTS prevent_duplicate_contract_payments_lookup
ON public.payments (
  company_id,
  customer_id,
  contract_id,
  payment_date,
  amount,
  transaction_type
)
WHERE contract_id IS NOT NULL
  AND payment_status IS DISTINCT FROM 'cancelled';

COMMENT ON INDEX public.prevent_duplicate_contract_payments_lookup IS
'Speeds up active contract duplicate lookups without blocking historical duplicate rows.';

CREATE INDEX IF NOT EXISTS prevent_duplicate_invoice_payments_lookup
ON public.payments (
  company_id,
  invoice_id,
  payment_date,
  amount,
  transaction_type
)
WHERE invoice_id IS NOT NULL
  AND payment_status IS DISTINCT FROM 'cancelled';

COMMENT ON INDEX public.prevent_duplicate_invoice_payments_lookup IS
'Speeds up active invoice duplicate lookups without blocking replacement payments after cancellation.';
