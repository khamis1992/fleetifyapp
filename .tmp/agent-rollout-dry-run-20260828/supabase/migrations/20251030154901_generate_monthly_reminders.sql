-- ================================================================
-- GENERATE MONTHLY REMINDERS FOR UNPAID RECEIPTS
-- ================================================================
-- Automatically generates reminders based on the day of the month:
-- Day 28: Pre-due reminders for next month
-- Day 2: First reminder with fine calculation
-- Day 3: Final reminder
-- Day 5: Warning notice
-- Day 10: Legal case creation
-- Created: 2025-01-27
-- ================================================================

CREATE OR REPLACE FUNCTION generate_monthly_reminders_for_unpaid_receipts()
RETURNS TABLE(reminders_created INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_current_date DATE := CURRENT_DATE;
  v_day_of_month INTEGER := EXTRACT(DAY FROM v_current_date);
  v_created INTEGER := 0;
  v_days_overdue INTEGER;
  v_fine_amount NUMERIC;
BEGIN
  -- Day 28: Create pre-due reminders for receipts due next month
  IF v_day_of_month = 28 THEN
    FOR v_receipt IN
      SELECT * FROM rental_payment_receipts
      WHERE payment_status = 'pending'
        AND payment_date = DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')::DATE
        AND NOT EXISTS (
          SELECT 1 FROM reminder_schedules
          WHERE receipt_id = rental_payment_receipts.id
            AND reminder_type = 'pre_due_28'
        )
    LOOP
      PERFORM generate_reminder_schedule_for_receipt(v_receipt.id, 'pre_due_28');
      v_created := v_created + 1;
    END LOOP;
  END IF;
  
  -- Day 2: Calculate fine + send first reminder for overdue receipts
  IF v_day_of_month = 2 THEN
    FOR v_receipt IN
      SELECT * FROM rental_payment_receipts
      WHERE payment_status IN ('pending', 'partial')
        AND payment_date = CURRENT_DATE - INTERVAL '1 day' -- Due date was yesterday (day 1)
        AND total_paid < rent_amount
        AND NOT EXISTS (
          SELECT 1 FROM reminder_schedules
          WHERE receipt_id = rental_payment_receipts.id
            AND reminder_type = 'reminder_2'
            AND scheduled_date = CURRENT_DATE
        )
    LOOP
      -- Calculate fine: 1 day overdue = 120 QAR
      v_days_overdue := 1;
      v_fine_amount := LEAST(v_days_overdue * 120, 3000);
      
      UPDATE rental_payment_receipts
      SET fine = v_fine_amount,
          amount_due = rent_amount + v_fine_amount,
          pending_balance = (rent_amount + v_fine_amount) - total_paid
      WHERE id = v_receipt.id;
      
      PERFORM generate_reminder_schedule_for_receipt(v_receipt.id, 'reminder_2');
      v_created := v_created + 1;
    END LOOP;
  END IF;
  
  -- Day 3: Send final reminder for overdue receipts
  IF v_day_of_month = 3 THEN
    FOR v_receipt IN
      SELECT * FROM rental_payment_receipts
      WHERE payment_status IN ('pending', 'partial')
        AND payment_date < CURRENT_DATE
        AND total_paid < rent_amount
        AND NOT EXISTS (
          SELECT 1 FROM reminder_schedules
          WHERE receipt_id = rental_payment_receipts.id
            AND reminder_type = 'reminder_3'
            AND scheduled_date = CURRENT_DATE
        )
    LOOP
      -- Update fine (2 days overdue)
      v_days_overdue := CURRENT_DATE - v_receipt.payment_date;
      v_fine_amount := LEAST(v_days_overdue * 120, 3000);
      
      UPDATE rental_payment_receipts
      SET fine = v_fine_amount,
          amount_due = rent_amount + v_fine_amount,
          pending_balance = (rent_amount + v_fine_amount) - total_paid
      WHERE id = v_receipt.id;
      
      PERFORM generate_reminder_schedule_for_receipt(v_receipt.id, 'reminder_3');
      v_created := v_created + 1;
    END LOOP;
  END IF;
  
  -- Day 5: Send warning notice
  IF v_day_of_month = 5 THEN
    FOR v_receipt IN
      SELECT * FROM rental_payment_receipts
      WHERE payment_status IN ('pending', 'partial')
        AND payment_date < CURRENT_DATE
        AND total_paid < rent_amount
        AND NOT EXISTS (
          SELECT 1 FROM reminder_schedules
          WHERE receipt_id = rental_payment_receipts.id
            AND reminder_type = 'warning_5'
        )
    LOOP
      -- Update fine (4-5 days overdue)
      v_days_overdue := CURRENT_DATE - v_receipt.payment_date;
      v_fine_amount := LEAST(v_days_overdue * 120, 3000);
      
      UPDATE rental_payment_receipts
      SET fine = v_fine_amount,
          amount_due = rent_amount + v_fine_amount,
          pending_balance = (rent_amount + v_fine_amount) - total_paid
      WHERE id = v_receipt.id;
      
      PERFORM generate_reminder_schedule_for_receipt(v_receipt.id, 'warning_5');
      v_created := v_created + 1;
    END LOOP;
  END IF;
  
  -- Day 10: Create legal cases for overdue receipts
  IF v_day_of_month = 10 THEN
    FOR v_receipt IN
      SELECT * FROM rental_payment_receipts
      WHERE payment_status IN ('pending', 'partial')
        AND payment_date < CURRENT_DATE
        AND total_paid < rent_amount
        AND NOT EXISTS (
          SELECT 1 FROM legal_cases
          WHERE customer_id = rental_payment_receipts.customer_id
            AND case_status = 'open'
            AND metadata->>'source_receipt_id' = rental_payment_receipts.id::TEXT
        )
    LOOP
      -- Update fine (9-10 days overdue)
      v_days_overdue := CURRENT_DATE - v_receipt.payment_date;
      v_fine_amount := LEAST(v_days_overdue * 120, 3000);
      
      UPDATE rental_payment_receipts
      SET fine = v_fine_amount,
          amount_due = rent_amount + v_fine_amount,
          pending_balance = (rent_amount + v_fine_amount) - total_paid
      WHERE id = v_receipt.id;
      
      -- Create legal case
      PERFORM create_legal_case_from_receipt(v_receipt.id);
      
      -- Generate reminder with case number
      PERFORM generate_reminder_schedule_for_receipt(v_receipt.id, 'legal_10');
      
      v_created := v_created + 1;
    END LOOP;
  END IF;
  
  RETURN QUERY SELECT v_created;
END;
$$;

-- Add comments
COMMENT ON FUNCTION generate_monthly_reminders_for_unpaid_receipts IS 
'Automatically generates reminders and actions based on the day of the month. Day 28: pre-due reminders. Day 2: first reminder with fine. Day 3: final reminder. Day 5: warning. Day 10: legal case creation.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_monthly_reminders_for_unpaid_receipts TO authenticated;
GRANT EXECUTE ON FUNCTION generate_monthly_reminders_for_unpaid_receipts TO service_role;;
