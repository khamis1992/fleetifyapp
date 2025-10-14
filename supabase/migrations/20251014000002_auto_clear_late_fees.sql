-- Migration: Auto-clear late fees for historical payments where customer paid enough
-- Purpose: Retroactively apply late fee clearing logic to existing payment records
-- 
-- Business Logic:
-- If a customer paid more than (rent + current month's fine), 
-- the excess likely covered a previous month's late fee.
-- This migration identifies and clears those late fees with proper notes.
--
-- Created: 2025-10-14
-- Author: Automated Late Fee Clearing System

-- Step 1: Create a temporary function to process late fee clearing
CREATE OR REPLACE FUNCTION process_late_fee_clearing()
RETURNS TABLE (
  processed_count INTEGER,
  cleared_fees_total NUMERIC,
  affected_customers INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_processed_count INTEGER := 0;
  v_cleared_fees_total NUMERIC := 0;
  v_affected_customers INTEGER := 0;
  v_customer_record RECORD;
  v_receipt_record RECORD;
  v_previous_receipt RECORD;
  v_excess_amount NUMERIC;
  v_cleared_note TEXT;
  v_current_note TEXT;
BEGIN
  -- Loop through all customers
  FOR v_customer_record IN 
    SELECT DISTINCT customer_id, company_id
    FROM rental_payment_receipts
    ORDER BY customer_id
  LOOP
    -- For each customer, find receipts in chronological order
    FOR v_receipt_record IN
      SELECT *
      FROM rental_payment_receipts
      WHERE customer_id = v_customer_record.customer_id
        AND company_id = v_customer_record.company_id
      ORDER BY payment_date ASC
    LOOP
      -- Calculate if this payment has excess (more than rent + current fine)
      v_excess_amount := v_receipt_record.total_paid - (v_receipt_record.rent_amount + v_receipt_record.fine);
      
      -- If excess exists, look for previous unpaid late fee
      IF v_excess_amount > 0 THEN
        -- Find the most recent previous receipt with unpaid late fee
        SELECT *
        INTO v_previous_receipt
        FROM rental_payment_receipts
        WHERE customer_id = v_customer_record.customer_id
          AND company_id = v_customer_record.company_id
          AND payment_date < v_receipt_record.payment_date
          AND fine > 0
          AND pending_balance >= fine
          AND pending_balance > 0
        ORDER BY payment_date DESC
        LIMIT 1;
        
        -- If found and excess covers the late fee
        IF FOUND AND v_excess_amount >= v_previous_receipt.fine THEN
          -- Clear the previous month's late fee
          v_cleared_note := format(
            'تم دفع غرامة التأخير (%s ريال) من شهر %s في تاريخ %s',
            v_previous_receipt.fine,
            v_previous_receipt.month,
            TO_CHAR(v_receipt_record.payment_date, 'DD/MM/YYYY')
          );
          
          -- Update previous receipt
          UPDATE rental_payment_receipts
          SET 
            pending_balance = GREATEST(0, pending_balance - fine),
            payment_status = CASE
              WHEN (pending_balance - fine) = 0 THEN 'paid'
              WHEN (pending_balance - fine) > 0 THEN 'partial'
              ELSE payment_status
            END,
            notes = CASE
              WHEN notes IS NULL OR notes = '' THEN v_cleared_note
              ELSE notes || E'\n\n' || v_cleared_note
            END,
            updated_at = NOW()
          WHERE id = v_previous_receipt.id;
          
          -- Add note to current payment
          v_current_note := format(
            'تم تطبيق %s ريال لسداد غرامة شهر %s (%s ريال)',
            v_excess_amount,
            v_previous_receipt.month,
            v_previous_receipt.fine
          );
          
          UPDATE rental_payment_receipts
          SET 
            notes = CASE
              WHEN notes IS NULL OR notes = '' THEN v_current_note
              ELSE notes || E'\n\n' || v_current_note
            END,
            updated_at = NOW()
          WHERE id = v_receipt_record.id;
          
          -- Increment counters
          v_processed_count := v_processed_count + 1;
          v_cleared_fees_total := v_cleared_fees_total + v_previous_receipt.fine;
          v_affected_customers := v_affected_customers + 1;
          
          RAISE NOTICE 'Cleared late fee of % QAR from % for customer %', 
            v_previous_receipt.fine, 
            v_previous_receipt.month,
            v_customer_record.customer_id;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Return summary
  RETURN QUERY SELECT v_processed_count, v_cleared_fees_total, v_affected_customers;
END;
$$;

-- Step 2: Execute the late fee clearing function
DO $$
DECLARE
  v_result RECORD;
BEGIN
  -- Run the processing function
  SELECT * INTO v_result FROM process_late_fee_clearing();
  
  -- Log the results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Late Fee Clearing Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Receipts processed: %', v_result.processed_count;
  RAISE NOTICE 'Total cleared fees: % QAR', v_result.cleared_fees_total;
  RAISE NOTICE 'Affected customers: %', v_result.affected_customers;
  RAISE NOTICE '========================================';
END;
$$;

-- Step 3: Clean up the temporary function
DROP FUNCTION IF EXISTS process_late_fee_clearing();

-- Step 4: Add comment to migration
COMMENT ON TABLE rental_payment_receipts IS 'Enhanced with automatic late fee clearing logic - Migration 20251014000002';
