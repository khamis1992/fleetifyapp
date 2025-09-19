-- Update existing payments with calculated confidence scores
-- This migration recalculates confidence for payments that have null or 0 confidence

-- First, let's create a function to calculate basic confidence for existing linked payments
CREATE OR REPLACE FUNCTION calculate_basic_confidence(
  payment_amount NUMERIC,
  contract_monthly_amount NUMERIC,
  payment_agreement_number TEXT,
  contract_number TEXT
) RETURNS INTEGER AS $$
DECLARE
  confidence INTEGER := 30; -- Base confidence
  amount_diff NUMERIC;
BEGIN
  -- Check agreement number match
  IF payment_agreement_number IS NOT NULL AND contract_number IS NOT NULL THEN
    IF LOWER(payment_agreement_number) LIKE '%' || LOWER(contract_number) || '%' 
       OR LOWER(contract_number) LIKE '%' || LOWER(payment_agreement_number) || '%' THEN
      confidence := confidence + 40;
    END IF;
  END IF;

  -- Check amount match
  IF payment_amount IS NOT NULL AND contract_monthly_amount IS NOT NULL AND contract_monthly_amount > 0 THEN
    amount_diff := ABS(payment_amount - contract_monthly_amount) / contract_monthly_amount;
    IF amount_diff <= 0.02 THEN
      confidence := confidence + 30;
    ELSIF amount_diff <= 0.05 THEN
      confidence := confidence + 25;
    ELSIF amount_diff <= 0.1 THEN
      confidence := confidence + 15;
    ELSIF amount_diff <= 0.2 THEN
      confidence := confidence + 8;
    END IF;
  END IF;

  RETURN LEAST(confidence, 100);
END;
$$ LANGUAGE plpgsql;

-- Update linked payments with calculated confidence
UPDATE payments 
SET linking_confidence = calculate_basic_confidence(
  payments.amount,
  contracts.monthly_amount,
  payments.agreement_number,
  contracts.contract_number
)
FROM contracts
WHERE payments.contract_id = contracts.id 
  AND (payments.linking_confidence IS NULL OR payments.linking_confidence = 0);

-- Update unlinked payments with base confidence
UPDATE payments 
SET linking_confidence = 25
WHERE contract_id IS NULL 
  AND (linking_confidence IS NULL OR linking_confidence = 0);

-- Clean up the function
DROP FUNCTION calculate_basic_confidence(NUMERIC, NUMERIC, TEXT, TEXT);