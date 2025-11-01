-- ================================================================
-- AUTOMATIC INVOICE GENERATION SYSTEM
-- ================================================================
-- Creates functions to automatically generate invoices for active contracts
-- Invoices are created on the 1st of each month
-- Due date is also the 1st of the month
-- ================================================================

-- ================================================================
-- FUNCTION 1: Generate Single Invoice for Contract Month
-- ================================================================
CREATE OR REPLACE FUNCTION generate_invoice_for_contract_month(
  p_contract_id UUID,
  p_invoice_month DATE -- First day of the month (e.g., 2024-01-01)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_total_amount DECIMAL(15,3);
  v_invoice_date DATE;
  v_due_date DATE;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'Contract not found: %', p_contract_id;
  END IF;

  -- Check if contract is active in this month
  IF v_contract.start_date > p_invoice_month OR 
     (v_contract.end_date IS NOT NULL AND v_contract.end_date < p_invoice_month) THEN
    RAISE NOTICE 'Contract % is not active in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;

  -- Check if invoice already exists for this month
  -- Check if there's already an invoice for this contract in the same month/year
  -- Use due_date to determine the month (since invoice_month column doesn't exist)
  -- Also check invoice_date as fallback in case due_date is NULL
  IF EXISTS (
    SELECT 1 FROM invoices
    WHERE contract_id = p_contract_id
      AND (
        (due_date IS NOT NULL AND DATE_TRUNC('month', due_date)::DATE = p_invoice_month)
        OR (due_date IS NULL AND invoice_date IS NOT NULL AND DATE_TRUNC('month', invoice_date)::DATE = p_invoice_month)
      )
      AND status != 'cancelled'
  ) THEN
    RAISE NOTICE 'Invoice already exists for contract % in month %', p_contract_id, p_invoice_month;
    RETURN NULL;
  END IF;

  -- Set invoice date and due date to the 1st of the month
  v_invoice_date := p_invoice_month;
  v_due_date := p_invoice_month;

  -- Calculate total amount (monthly rental amount)
  v_total_amount := COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0);

  -- Generate invoice number
  SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD((COUNT(*) + 1)::TEXT, 5, '0')
  INTO v_invoice_number
  FROM invoices
  WHERE company_id = v_contract.company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());

  -- Create invoice
  INSERT INTO invoices (
    company_id,
    customer_id,
    contract_id,
    invoice_number,
    invoice_date,
    due_date,
    total_amount,
    subtotal,
    tax_amount,
    discount_amount,
    paid_amount,
    balance_due,
    status,
    payment_status,
    invoice_type,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_contract.company_id,
    v_contract.customer_id,
    v_contract.id,
    v_invoice_number,
    v_invoice_date,
    v_due_date,
    v_total_amount,
    v_total_amount,
    0,
    0,
    0,
    v_total_amount,
    'sent',
    'unpaid',
    'service',
    'فاتورة إيجار شهرية - ' || TO_CHAR(p_invoice_month, 'YYYY-MM') || ' - عقد #' || v_contract.contract_number,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_invoice_id;

  RAISE NOTICE '✅ Created invoice % for contract % - Month: %', v_invoice_number, v_contract.contract_number, p_invoice_month;
  
  RETURN v_invoice_id;
END;
$$;

-- ================================================================
-- FUNCTION 2: Generate Invoices for All Active Contracts (Single Month)
-- ================================================================
CREATE OR REPLACE FUNCTION generate_monthly_invoices_for_date(
  p_company_id UUID,
  p_invoice_month DATE -- First day of the month
)
RETURNS TABLE (
  contract_id UUID,
  invoice_id UUID,
  invoice_number VARCHAR(50),
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_invoice_id UUID;
  v_count INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  RAISE NOTICE '📅 Generating invoices for month: % (Company: %)', p_invoice_month, p_company_id;

  -- Loop through all active contracts
  FOR v_contract IN
    SELECT c.*
    FROM contracts c
    WHERE c.company_id = p_company_id
      AND c.status = 'active'
      AND c.start_date <= p_invoice_month
      AND (c.end_date IS NULL OR c.end_date >= p_invoice_month)
    ORDER BY c.contract_number
  LOOP
    BEGIN
      -- Generate invoice for this contract
      v_invoice_id := generate_invoice_for_contract_month(v_contract.id, p_invoice_month);
      
      IF v_invoice_id IS NOT NULL THEN
        v_count := v_count + 1;
        
        -- Return success row
        RETURN QUERY SELECT 
          v_contract.id,
          v_invoice_id,
          (SELECT invoice_number FROM invoices WHERE id = v_invoice_id),
          'created'::TEXT;
      ELSE
        v_skipped := v_skipped + 1;
        
        -- Return skipped row
        RETURN QUERY SELECT 
          v_contract.id,
          NULL::UUID,
          NULL::VARCHAR(50),
          'skipped'::TEXT;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create invoice for contract %: %', v_contract.contract_number, SQLERRM;
      
      -- Return error row
      RETURN QUERY SELECT 
        v_contract.id,
        NULL::UUID,
        NULL::VARCHAR(50),
        ('error: ' || SQLERRM)::TEXT;
    END;
  END LOOP;

  RAISE NOTICE '✅ Completed: % invoices created, % skipped', v_count, v_skipped;
END;
$$;

-- ================================================================
-- FUNCTION 3: Backfill Historical Invoices
-- ================================================================
-- This function creates all missing invoices from contract start date to today
CREATE OR REPLACE FUNCTION backfill_contract_invoices(
  p_company_id UUID,
  p_contract_id UUID DEFAULT NULL -- If NULL, process all contracts
)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR(50),
  months_processed INTEGER,
  invoices_created INTEGER,
  invoices_skipped INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_current_month DATE;
  v_invoice_id UUID;
  v_months_count INTEGER;
  v_created_count INTEGER;
  v_skipped_count INTEGER;
BEGIN
  RAISE NOTICE '🔄 Starting backfill process...';

  -- Loop through contracts
  FOR v_contract IN
    SELECT c.*
    FROM contracts c
    WHERE c.company_id = p_company_id
      AND c.status = 'active'
      AND (p_contract_id IS NULL OR c.id = p_contract_id)
    ORDER BY c.start_date
  LOOP
    v_months_count := 0;
    v_created_count := 0;
    v_skipped_count := 0;

    RAISE NOTICE '📋 Processing contract: % (Start: %)', v_contract.contract_number, v_contract.start_date;

    -- Start from the first day of the contract start month
    v_current_month := DATE_TRUNC('month', v_contract.start_date)::DATE;

    -- Loop through each month from start date to today
    WHILE v_current_month <= DATE_TRUNC('month', CURRENT_DATE)::DATE LOOP
      -- Skip if contract has ended before this month
      IF v_contract.end_date IS NOT NULL AND v_current_month > v_contract.end_date THEN
        EXIT;
      END IF;

      v_months_count := v_months_count + 1;

      -- Try to create invoice for this month
      BEGIN
        v_invoice_id := generate_invoice_for_contract_month(v_contract.id, v_current_month);
        
        IF v_invoice_id IS NOT NULL THEN
          v_created_count := v_created_count + 1;
        ELSE
          v_skipped_count := v_skipped_count + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create invoice for contract % month %: %', 
          v_contract.contract_number, v_current_month, SQLERRM;
        v_skipped_count := v_skipped_count + 1;
      END;

      -- Move to next month
      v_current_month := (v_current_month + INTERVAL '1 month')::DATE;
    END LOOP;

    -- Return summary for this contract
    RETURN QUERY SELECT 
      v_contract.id,
      v_contract.contract_number,
      v_months_count,
      v_created_count,
      v_skipped_count;

    RAISE NOTICE '✅ Contract %: % months processed, % created, % skipped',
      v_contract.contract_number, v_months_count, v_created_count, v_skipped_count;
  END LOOP;

  RAISE NOTICE '🎉 Backfill process completed!';
END;
$$;

-- ================================================================
-- FUNCTION 4: Scheduled Monthly Invoice Generation (Run on 28th)
-- ================================================================
-- This function should be called on the 28th of each month
-- It creates invoices for the NEXT month (due on the 1st)
DROP FUNCTION IF EXISTS run_monthly_invoice_generation();
CREATE OR REPLACE FUNCTION run_monthly_invoice_generation()
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  invoices_created INTEGER,
  invoices_skipped INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company RECORD;
  v_next_month DATE;
  v_created INTEGER;
  v_skipped INTEGER;
BEGIN
  -- Calculate next month (first day)
  v_next_month := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')::DATE;
  
  RAISE NOTICE '📅 Running monthly invoice generation for month: %', v_next_month;

  -- Loop through all companies
  FOR v_company IN
    SELECT id, name FROM companies
    WHERE (subscription_status = 'active' OR subscription_status IS NULL)
       AND (subscription_expires_at IS NULL OR subscription_expires_at > CURRENT_DATE)
  LOOP
    v_created := 0;
    v_skipped := 0;

    RAISE NOTICE '🏢 Processing company: %', v_company.name;

    -- Count invoices created
    SELECT COUNT(*) INTO v_created
    FROM generate_monthly_invoices_for_date(v_company.id, v_next_month)
    WHERE status = 'created';

    SELECT COUNT(*) INTO v_skipped
    FROM generate_monthly_invoices_for_date(v_company.id, v_next_month)
    WHERE status = 'skipped';

    -- Return summary for this company
    RETURN QUERY SELECT 
      v_company.id,
      v_company.name,
      v_created,
      v_skipped;
  END LOOP;

  RAISE NOTICE '✅ Monthly invoice generation completed!';
END;
$$;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================
GRANT EXECUTE ON FUNCTION generate_invoice_for_contract_month(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_monthly_invoices_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_contract_invoices(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION run_monthly_invoice_generation() TO authenticated;
GRANT EXECUTE ON FUNCTION run_monthly_invoice_generation() TO service_role;

-- ================================================================
-- COMMENTS
-- ================================================================
COMMENT ON FUNCTION generate_invoice_for_contract_month IS 'Generates a single invoice for a contract for a specific month';
COMMENT ON FUNCTION generate_monthly_invoices_for_date IS 'Generates invoices for all active contracts for a specific month';
COMMENT ON FUNCTION backfill_contract_invoices IS 'Creates all missing historical invoices for contracts from start date to today';
COMMENT ON FUNCTION run_monthly_invoice_generation IS 'Main scheduled function to run on 28th of each month to generate next months invoices';

-- ================================================================
-- USAGE INSTRUCTIONS
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ AUTOMATIC INVOICE GENERATION SYSTEM INSTALLED';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 USAGE:';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣ To backfill all missing invoices (from contract start to today):';
  RAISE NOTICE '   SELECT * FROM backfill_contract_invoices(''company_id_here'');';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣ To backfill invoices for a specific contract:';
  RAISE NOTICE '   SELECT * FROM backfill_contract_invoices(''company_id'', ''contract_id'');';
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣ To manually generate invoices for a specific month:';
  RAISE NOTICE '   SELECT * FROM generate_monthly_invoices_for_date(''company_id'', ''2024-01-01'');';
  RAISE NOTICE '';
  RAISE NOTICE '4️⃣ To run monthly generation (as scheduled on 28th):';
  RAISE NOTICE '   SELECT * FROM run_monthly_invoice_generation();';
  RAISE NOTICE '';
  RAISE NOTICE '📅 IMPORTANT:';
  RAISE NOTICE '   - Invoice date: 1st of the month';
  RAISE NOTICE '   - Due date: 1st of the month';
  RAISE NOTICE '   - Generation schedule: Run on 28th of each month';
  RAISE NOTICE '   - Creates invoices for NEXT month';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ TO SETUP AUTOMATIC SCHEDULING:';
  RAISE NOTICE '   Use Supabase Edge Functions with pg_cron or external scheduler';
  RAISE NOTICE '====================================================================';
END $$;

