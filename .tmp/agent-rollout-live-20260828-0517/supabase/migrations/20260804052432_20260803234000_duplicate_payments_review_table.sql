-- Build a review queue of probable duplicate receipts produced by the two
-- Excel imports (PAY-1758229515% on 2025-09-18 and PBC-% on 2026-07-02).
-- Pairs share contract + exact amount with payment dates at most 4 days apart.
-- Nothing is modified: finance reviews and reverses each pair through the
-- standard approval-gated reversal flow.

BEGIN;

CREATE TABLE IF NOT EXISTS public._review_duplicate_payments_20260803 (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid,
  contract_id uuid,
  contract_number text,
  keep_payment_id uuid,
  keep_payment_number text,
  drop_payment_id uuid,
  drop_payment_number text,
  amount numeric,
  keep_payment_date date,
  drop_payment_date date,
  review_status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public._review_duplicate_payments_20260803 (
  company_id, contract_id, contract_number,
  keep_payment_id, keep_payment_number,
  drop_payment_id, drop_payment_number,
  amount, keep_payment_date, drop_payment_date
)
SELECT
  pbc.company_id,
  pbc.contract_id,
  contract.contract_number,
  pay.id,
  pay.payment_number,
  pbc.id,
  pbc.payment_number,
  pbc.amount,
  pay.payment_date,
  pbc.payment_date
FROM public.payments pbc
JOIN public.payments pay
  ON pay.company_id = pbc.company_id
 AND pay.contract_id = pbc.contract_id
 AND pay.id <> pbc.id
 AND pay.payment_number LIKE 'PAY-1758229515%'
 AND abs(pay.amount - pbc.amount) <= 0.005
 AND abs(pay.payment_date - pbc.payment_date) <= 4
JOIN public.contracts contract
  ON contract.id = pbc.contract_id
WHERE pbc.payment_number LIKE 'PBC-%'
  AND lower(COALESCE(pbc.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
  AND lower(COALESCE(pay.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
ORDER BY pbc.contract_id, pbc.payment_date;

COMMENT ON TABLE public._review_duplicate_payments_20260803 IS
  'Finance review queue for probable duplicate receipts from the 2025-09-18 (PAY) and 2026-07-02 (PBC) Excel imports; rows are reversed only through the approved reversal flow after human review.';

COMMIT;;
