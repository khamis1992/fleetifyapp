WITH duplicate_payments AS (
  SELECT 
      id,
      company_id,
      customer_id,
      contract_id,
      payment_date::date as payment_date,
      amount,
      created_at,
      ROW_NUMBER() OVER (
        PARTITION BY company_id, customer_id, contract_id, payment_date::date, amount
        ORDER BY created_at ASC
      ) as row_num
  FROM payments
  WHERE customer_id IS NOT NULL
)
DELETE FROM payments
WHERE id IN (
  SELECT id FROM duplicate_payments WHERE row_num > 1
)
RETURNING id, payment_number;;
