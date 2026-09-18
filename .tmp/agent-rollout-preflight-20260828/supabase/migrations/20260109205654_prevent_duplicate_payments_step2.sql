-- Step 2: Add index for duplicate detection performance
CREATE INDEX IF NOT EXISTS idx_payments_duplicate_check
ON public.payments (company_id, customer_id, payment_date, amount)
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_contract_duplicate_check
ON public.payments (company_id, customer_id, contract_id, payment_date, amount)
WHERE customer_id IS NOT NULL AND contract_id IS NOT NULL;;
