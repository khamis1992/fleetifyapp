-- Fix the linking confidence constraint and update existing data
-- The constraint expects values between 0 and 1, but we were setting values 0-100

-- Update linked payments with calculated confidence (as decimal between 0-1)
UPDATE payments 
SET linking_confidence = LEAST(
  CASE 
    WHEN contract_id IS NOT NULL THEN
      CASE 
        WHEN agreement_number IS NOT NULL AND EXISTS (
          SELECT 1 FROM contracts c 
          WHERE c.id = payments.contract_id 
          AND (LOWER(c.contract_number) LIKE '%' || LOWER(payments.agreement_number) || '%' 
               OR LOWER(payments.agreement_number) LIKE '%' || LOWER(c.contract_number) || '%')
        ) THEN 0.85  -- High confidence for agreement number match
        WHEN EXISTS (
          SELECT 1 FROM contracts c 
          WHERE c.id = payments.contract_id 
          AND ABS(payments.amount - c.monthly_amount) / c.monthly_amount <= 0.05
        ) THEN 0.75  -- Good confidence for amount match
        ELSE 0.50    -- Base confidence for linked payments
      END
    ELSE 0.25        -- Low confidence for unlinked payments
  END,
  1.0  -- Maximum value
)
WHERE linking_confidence IS NULL OR linking_confidence = 0 OR linking_confidence > 1;