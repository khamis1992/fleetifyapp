-- Fix 153 payments with future dates marked as 'completed'
-- A payment cannot be 'completed' if it's dated in the future
-- Changing status to 'pending' to reflect they are scheduled/expected payments

UPDATE payments
SET 
  payment_status = 'pending',
  processing_notes = COALESCE(processing_notes, '') || ' [Auto-fixed: Changed from completed to pending - future date detected on 2026-01-10]'
WHERE payment_date > CURRENT_DATE
  AND payment_status = 'completed';

-- Add comment
COMMENT ON TABLE payments IS 'Payment records - future-dated payments auto-corrected 2026-01-10';;
