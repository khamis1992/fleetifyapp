-- Step 1: Identify and delete duplicate payments (keeping the earliest one)
-- This deletes payments where there's an earlier payment with the same details

DELETE FROM public.payments p1
WHERE p1.id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, customer_id, contract_id, payment_date::date, amount
        ORDER BY created_at ASC
      ) as row_num
    FROM public.payments
    WHERE created_at >= NOW() - INTERVAL '60 days'
  ) ranked
  WHERE row_num > 1
);

-- Step 2: Add unique constraint now that duplicates are removed
ALTER TABLE public.payments
ADD CONSTRAINT prevent_duplicate_contract_payments
UNIQUE (company_id, customer_id, contract_id, payment_date, amount);

COMMENT ON CONSTRAINT prevent_duplicate_contract_payments ON public.payments IS
'Prevents duplicate payments for the same contract, date, and amount';;
