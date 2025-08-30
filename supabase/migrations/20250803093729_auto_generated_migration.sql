-- Update draft invoices for contract CNT-25-0017 to 'sent' status and fix balance_due calculation
UPDATE invoices 
SET 
  status = 'sent',
  balance_due = total_amount - paid_amount,
  updated_at = now()
WHERE contract_id IN (
  SELECT id FROM contracts WHERE contract_number = 'CNT-25-0017'
) AND status = 'draft';