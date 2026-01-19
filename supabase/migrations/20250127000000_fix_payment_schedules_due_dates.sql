-- ================================================================
-- FIX PAYMENT SCHEDULES DUE DATES
-- ================================================================
-- Update all payment schedules to have due dates on the 1st of each month
-- instead of using the contract start date day
-- ================================================================

-- Function to update payment schedule due dates to 1st of month
CREATE OR REPLACE FUNCTION fix_payment_schedule_due_dates()
RETURNS TABLE (
  updated_count INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_contract_start_date DATE;
  v_first_month DATE;
  v_month_offset INTEGER;
  v_new_due_date DATE;
  v_updated INTEGER := 0;
  v_table_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'contract_payment_schedules'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE NOTICE '⚠️ Table contract_payment_schedules does not exist. Skipping payment schedule updates.';
    RETURN QUERY SELECT 0::INTEGER, 'Table contract_payment_schedules does not exist'::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '🔄 Starting to fix payment schedule due dates...';
  
  -- Loop through all payment schedules
  FOR v_schedule IN
    SELECT 
      cps.id,
      cps.contract_id,
      cps.due_date,
      cps.installment_number,
      c.start_date,
      c.end_date
    FROM contract_payment_schedules cps
    INNER JOIN contracts c ON cps.contract_id = c.id
    WHERE cps.due_date IS NOT NULL
      AND EXTRACT(DAY FROM cps.due_date) != 1  -- Only update if not already on 1st
    ORDER BY cps.contract_id, cps.installment_number
  LOOP
    -- Get contract start date
    v_contract_start_date := v_schedule.start_date;
    
    -- Calculate first month (1st of the month after contract start)
    v_first_month := DATE_TRUNC('month', v_contract_start_date)::DATE + INTERVAL '1 month';
    
    -- Calculate month offset (0 = first month, 1 = second month, etc.)
    v_month_offset := v_schedule.installment_number - 1;
    
    -- Calculate new due date (1st of the month)
    v_new_due_date := v_first_month + (v_month_offset || ' months')::INTERVAL;
    
    -- Update the payment schedule
    UPDATE contract_payment_schedules
    SET 
      due_date = v_new_due_date,
      updated_at = NOW()
    WHERE id = v_schedule.id;
    
    v_updated := v_updated + 1;
    
    -- Log every 100 updates
    IF v_updated % 100 = 0 THEN
      RAISE NOTICE '  Updated % payment schedules...', v_updated;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Completed: Updated % payment schedules', v_updated;
  
  RETURN QUERY SELECT v_updated, 'Updated ' || v_updated || ' payment schedules to have due dates on the 1st of each month';
END;
$$;

-- Function to update invoice due dates to 1st of month
CREATE OR REPLACE FUNCTION fix_invoice_due_dates()
RETURNS TABLE (
  updated_count INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_contract_start_date DATE;
  v_invoice_month DATE;
  v_new_due_date DATE;
  v_updated INTEGER := 0;
  v_column_exists BOOLEAN;
BEGIN
  -- Check if contract_id column exists in invoices table
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices'
    AND column_name = 'contract_id'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE NOTICE '⚠️ Column invoices.contract_id does not exist. Skipping invoice updates.';
    RETURN QUERY SELECT 0::INTEGER, 'Column invoices.contract_id does not exist'::TEXT;
    RETURN;
  END IF;

  RAISE NOTICE '🔄 Starting to fix invoice due dates...';
  
  -- Loop through all invoices with contract_id
  FOR v_invoice IN
    SELECT 
      i.id,
      i.contract_id,
      i.due_date,
      i.invoice_date,
      c.start_date
    FROM invoices i
    INNER JOIN contracts c ON i.contract_id = c.id
    WHERE i.contract_id IS NOT NULL
      AND i.due_date IS NOT NULL
      AND EXTRACT(DAY FROM i.due_date) != 1  -- Only update if not already on 1st
    ORDER BY i.contract_id, i.due_date
  LOOP
    -- Calculate new due date (1st of the invoice month)
    v_invoice_month := DATE_TRUNC('month', v_invoice.due_date)::DATE;
    v_new_due_date := v_invoice_month;
    
    -- Update the invoice
    UPDATE invoices
    SET 
      due_date = v_new_due_date,
      updated_at = NOW()
    WHERE id = v_invoice.id;
    
    v_updated := v_updated + 1;
    
    -- Log every 100 updates
    IF v_updated % 100 = 0 THEN
      RAISE NOTICE '  Updated % invoices...', v_updated;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Completed: Updated % invoices', v_updated;
  
  RETURN QUERY SELECT v_updated, 'Updated ' || v_updated || ' invoices to have due dates on the 1st of each month';
END;
$$;

-- Update the calculate_payment_due_dates function to use 1st of month
CREATE OR REPLACE FUNCTION calculate_payment_due_dates(contract_id_param uuid)
RETURNS TABLE(
    installment_number integer,
    due_date date,
    amount numeric,
    status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    contract_record contracts%ROWTYPE;
    monthly_amount numeric;
    payment_date date;
    first_month_date date;
    installment_count integer;
BEGIN
    -- الحصول على بيانات العقد
    SELECT * INTO contract_record
    FROM contracts
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    monthly_amount := contract_record.monthly_amount;
    
    -- بدء من اليوم الأول من الشهر التالي لتاريخ بداية العقد
    first_month_date := DATE_TRUNC('month', contract_record.start_date)::DATE + INTERVAL '1 month';
    payment_date := first_month_date;
    installment_count := 1;
    
    -- إنشاء جدول أقساط افتراضي بناءً على مدة العقد
    WHILE payment_date <= COALESCE(contract_record.end_date, contract_record.start_date + INTERVAL '12 months')
    LOOP
        RETURN QUERY SELECT 
            installment_count,
            payment_date,
            monthly_amount,
            CASE 
                WHEN payment_date < CURRENT_DATE THEN 'overdue'::text
                WHEN payment_date = CURRENT_DATE THEN 'due_today'::text
                ELSE 'upcoming'::text
            END;
        
        payment_date := payment_date + INTERVAL '1 month';
        installment_count := installment_count + 1;
    END LOOP;
END;
$$;

-- Comment on functions
COMMENT ON FUNCTION fix_payment_schedule_due_dates IS 'Updates all payment schedule due dates to be on the 1st of each month';
COMMENT ON FUNCTION fix_invoice_due_dates IS 'Updates all invoice due dates to be on the 1st of each month';
COMMENT ON FUNCTION calculate_payment_due_dates IS 'Calculates payment due dates starting from the 1st of the month after contract start';

-- ================================================================
-- EXECUTE THE FIX FUNCTIONS
-- ================================================================
-- Run the functions to update existing data
-- ================================================================

-- Update payment schedules
DO $$
DECLARE
  result RECORD;
BEGIN
  RAISE NOTICE '🔄 Starting to execute fix_payment_schedule_due_dates()...';
  BEGIN
    SELECT * INTO result FROM fix_payment_schedule_due_dates();
    RAISE NOTICE '✅ Payment schedules updated: % rows', result.updated_count;
    RAISE NOTICE '📝 Message: %', result.message;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Warning: Could not update payment schedules: %', SQLERRM;
      RAISE NOTICE 'This is normal if the table does not exist yet.';
  END;
END $$;

-- Update invoices
DO $$
DECLARE
  result RECORD;
BEGIN
  RAISE NOTICE '🔄 Starting to execute fix_invoice_due_dates()...';
  BEGIN
    SELECT * INTO result FROM fix_invoice_due_dates();
    RAISE NOTICE '✅ Invoices updated: % rows', result.updated_count;
    RAISE NOTICE '📝 Message: %', result.message;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Warning: Could not update invoices: %', SQLERRM;
      RAISE NOTICE 'This is normal if the contract_id column does not exist yet.';
  END;
END $$;
