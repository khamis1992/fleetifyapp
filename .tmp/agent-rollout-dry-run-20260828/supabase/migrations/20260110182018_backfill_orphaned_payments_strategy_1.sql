UPDATE payments
SET customer_id = contracts.customer_id
FROM contracts
WHERE payments.customer_id IS NULL
  AND payments.contract_id = contracts.id
  AND contracts.customer_id IS NOT NULL
RETURNING payments.id, payments.payment_number, contracts.customer_id;;
