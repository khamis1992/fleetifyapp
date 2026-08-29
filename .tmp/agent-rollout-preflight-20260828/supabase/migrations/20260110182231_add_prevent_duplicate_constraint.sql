-- Add prevent duplicate contract payments constraint
ALTER TABLE payments 
ADD CONSTRAINT prevent_duplicate_contract_payments
UNIQUE (company_id, customer_id, contract_id, payment_date, amount);;
