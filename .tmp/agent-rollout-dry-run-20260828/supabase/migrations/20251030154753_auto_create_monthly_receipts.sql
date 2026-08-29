-- ================================================================
-- AUTOMATIC MONTHLY PAYMENT RECEIPTS GENERATION SYSTEM
-- ================================================================
-- Creates automatic payment receipts for active contracts on the 28th of each month
-- Due date is set to the 1st of the next month
-- Created: 2025-01-27
-- ================================================================

-- Step 1: Ensure required columns exist in rental_payment_receipts
DO $$
BEGIN
  -- Add amount_due column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_payment_receipts' 
    AND column_name = 'amount_due'
  ) THEN
    ALTER TABLE public.rental_payment_receipts
    ADD COLUMN amount_due NUMERIC NOT NULL DEFAULT 0 CHECK (amount_due >= 0);
    
    -- Update existing records
    UPDATE public.rental_payment_receipts
    SET amount_due = rent_amount + fine;
  END IF;

  -- Add pending_balance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_payment_receipts' 
    AND column_name = 'pending_balance'
  ) THEN
    ALTER TABLE public.rental_payment_receipts
    ADD COLUMN pending_balance NUMERIC NOT NULL DEFAULT 0 CHECK (pending_balance >= 0);
    
    -- Update existing records
    UPDATE public.rental_payment_receipts
    SET pending_balance = GREATEST(0, amount_due - total_paid);
  END IF;

  -- Update payment_status check constraint to include 'paid' and 'partial'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'rental_payment_receipts' 
    AND column_name = 'payment_status'
  ) THEN
    -- Drop existing constraint if it exists
    ALTER TABLE public.rental_payment_receipts
    DROP CONSTRAINT IF EXISTS rental_payment_receipts_payment_status_check;
    
    -- Add new constraint with all required values
    ALTER TABLE public.rental_payment_receipts
    ADD CONSTRAINT rental_payment_receipts_payment_status_check 
    CHECK (payment_status IN ('pending', 'paid', 'partial', 'completed', 'cancelled', 'refunded'));
  END IF;
END $$;

-- Step 2: Create function to auto-generate monthly payment receipts
CREATE OR REPLACE FUNCTION auto_create_monthly_payment_receipts()
RETURNS TABLE(created_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_receipt_id UUID;
  v_month_text TEXT;
  v_due_date DATE;
  v_current_date DATE := CURRENT_DATE;
  v_created INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  -- Determine due date: 1st of next month
  v_due_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')::DATE;
  
  -- Format month in Arabic (next month)
  v_month_text := TO_CHAR(v_due_date, 'TMMonth YYYY');
  
  -- Loop through all active contracts
  FOR v_contract IN
    SELECT 
      c.id,
      c.company_id,
      c.customer_id,
      c.monthly_amount,
      c.start_date,
      c.end_date,
      c.vehicle_id,
      CONCAT(
        COALESCE(cust.first_name_ar, cust.first_name, ''), ' ', 
        COALESCE(cust.last_name_ar, cust.last_name, '')
      ) as customer_name
    FROM contracts c
    JOIN customers cust ON c.customer_id = cust.id
    WHERE c.status = 'active'
      AND c.monthly_amount > 0
      AND c.start_date <= v_due_date
      AND (c.end_date IS NULL OR c.end_date >= v_due_date)
  LOOP
    -- Check if receipt already exists for next month
    IF EXISTS (
      SELECT 1 FROM rental_payment_receipts
      WHERE customer_id = v_contract.customer_id
        AND company_id = v_contract.company_id
        AND payment_date = v_due_date
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Create new receipt with due date = 1st of next month
    INSERT INTO rental_payment_receipts (
      company_id,
      customer_id,
      customer_name,
      month,
      rent_amount,
      payment_date, -- Due date: 1st of next month
      fine,
      total_paid,
      amount_due,
      pending_balance,
      payment_status,
      contract_id,
      vehicle_id,
      created_at,
      updated_at
    ) VALUES (
      v_contract.company_id,
      v_contract.customer_id,
      v_contract.customer_name,
      v_month_text,
      v_contract.monthly_amount,
      v_due_date, -- Due date: 1st of next month
      0, -- No fine initially
      0, -- Not paid yet
      v_contract.monthly_amount,
      v_contract.monthly_amount,
      'pending',
      v_contract.id,
      v_contract.vehicle_id,
      NOW(),
      NOW()
    );
    
    v_created := v_created + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_created, v_skipped;
END;
$$;

-- Step 3: Add comments
COMMENT ON FUNCTION auto_create_monthly_payment_receipts IS 
'Automatically creates monthly payment receipts for all active contracts on the 28th of each month. Due date is set to the 1st of the next month.';

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION auto_create_monthly_payment_receipts TO authenticated;
GRANT EXECUTE ON FUNCTION auto_create_monthly_payment_receipts TO service_role;;
