UPDATE payments
SET customer_id = (
    SELECT c.id 
    FROM customers c
    WHERE c.company_id = payments.company_id
    ORDER BY c.created_at ASC
    LIMIT 1
)
WHERE payments.customer_id IS NULL
  AND payments.contract_id IS NULL
RETURNING payments.id, payments.payment_number, payments.customer_id;;
