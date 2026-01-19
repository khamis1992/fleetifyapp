-- ================================================================
-- FIX MISSING INVOICES AFTER CONTRACT DATA UPDATES
-- ================================================================
-- Purpose: Re-create missing invoices for active contracts after data updates
-- This function intelligently detects missing invoices and creates them
-- Date: 2025-11-02
-- ================================================================

CREATE OR REPLACE FUNCTION fix_missing_invoices_for_contracts(
  p_company_id UUID DEFAULT NULL,
  p_contract_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR,
  customer_name VARCHAR,
  invoices_created INTEGER,
  invoices_skipped INTEGER,
  total_amount NUMERIC,
  months_covered TEXT,
  status TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_current_month DATE;
  v_first_month DATE;
  v_last_month DATE;
  v_invoice_exists BOOLEAN;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_created_count INTEGER;
  v_skipped_count INTEGER;
  v_total_amount NUMERIC;
  v_months_covered TEXT[];
  v_monthly_amount NUMERIC;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  RAISE NOTICE '🔍 Starting fix missing invoices process...';
  
  -- Determine date range
  IF p_from_date IS NULL THEN
    v_first_month := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')::DATE;
  ELSE
    v_first_month := DATE_TRUNC('month', p_from_date)::DATE;
  END IF;
  
  IF p_to_date IS NULL THEN
    v_last_month := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')::DATE;
  ELSE
    v_last_month := DATE_TRUNC('month', p_to_date)::DATE;
  END IF;
  
  RAISE NOTICE '📅 Date range: % to %', v_first_month, v_last_month;
  
  -- Disable triggers temporarily to avoid conflicts
  SET session_replication_role = replica;
  
  BEGIN
    -- Loop through active contracts
    FOR v_contract IN
      SELECT 
        c.id,
        c.contract_number,
        c.company_id,
        c.customer_id,
        c.start_date,
        c.end_date,
        c.status,
        -- Try multiple fields for monthly amount
        COALESCE(
          c.monthly_rent,
          c.monthly_amount,
          c.contract_amount / NULLIF(
            GREATEST(
              1,
              EXTRACT(EPOCH FROM (COALESCE(c.end_date, CURRENT_DATE) - c.start_date)) / (30 * 24 * 60 * 60)
            )::INTEGER,
            0
          ),
          0
        ) as monthly_amount,
        cust.first_name || ' ' || COALESCE(cust.last_name, '') as customer_name
      FROM contracts c
      LEFT JOIN customers cust ON c.customer_id = cust.id
      WHERE c.status = 'active'
        AND c.start_date IS NOT NULL
        AND (p_company_id IS NULL OR c.company_id = p_company_id)
        AND (p_contract_id IS NULL OR c.id = p_contract_id)
        AND (
          -- Contract overlaps with date range
          (c.end_date IS NULL OR c.end_date >= v_first_month)
          AND c.start_date <= v_last_month
        )
      ORDER BY c.contract_number
    LOOP
      v_created_count := 0;
      v_skipped_count := 0;
      v_total_amount := 0;
      v_months_covered := ARRAY[]::TEXT[];
      
      -- Determine contract's actual date range
      v_start_date := GREATEST(
        DATE_TRUNC('month', v_contract.start_date + INTERVAL '1 month')::DATE,
        v_first_month
      );
      
      v_end_date := LEAST(
        COALESCE(
          DATE_TRUNC('month', v_contract.end_date)::DATE,
          v_last_month
        ),
        v_last_month
      );
      
      -- Skip if no valid date range
      IF v_start_date > v_end_date THEN
        RETURN QUERY SELECT 
          v_contract.id,
          v_contract.contract_number,
          v_contract.customer_name,
          0::INTEGER,
          0::INTEGER,
          0::NUMERIC,
          'No valid period'::TEXT,
          'skipped'::TEXT,
          'Contract date range does not overlap with requested period'::TEXT;
        CONTINUE;
      END IF;
      
      v_current_month := v_start_date;
      v_monthly_amount := COALESCE(v_contract.monthly_amount, 0);
      
      -- Loop through each month in range
      WHILE v_current_month <= v_end_date LOOP
        BEGIN
          -- Check if invoice already exists for this month and contract
          SELECT EXISTS (
            SELECT 1 
            FROM invoices i
            WHERE i.contract_id = v_contract.id
              AND i.company_id = v_contract.company_id
              AND DATE_TRUNC('month', COALESCE(i.due_date, i.invoice_date))::DATE = v_current_month
              AND (i.status IS NULL OR i.status != 'cancelled')
              AND (i.payment_status != 'paid' OR i.payment_status IS NULL)
          ) INTO v_invoice_exists;
          
          IF v_invoice_exists THEN
            v_skipped_count := v_skipped_count + 1;
          ELSE
            -- Generate unique invoice number
            SELECT 'INV-' || TO_CHAR(v_current_month, 'YYYYMM') || '-' || 
                   LPAD((COALESCE(MAX(SUBSTRING(invoice_number FROM '[0-9]+$')::INTEGER), 0) + 1)::TEXT, 5, '0')
            INTO v_invoice_number
            FROM invoices
            WHERE company_id = v_contract.company_id
              AND invoice_number LIKE 'INV-' || TO_CHAR(v_current_month, 'YYYYMM') || '-%';
            
            -- If no invoice found, start from 1
            IF v_invoice_number IS NULL THEN
              v_invoice_number := 'INV-' || TO_CHAR(v_current_month, 'YYYYMM') || '-00001';
            END IF;
            
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
              v_current_month,
              v_current_month,
              v_monthly_amount,
              v_monthly_amount,
              0,
              0,
              0,
              v_monthly_amount,
              'sent',
              'unpaid',
              'service',
              'فاتورة إيجار شهرية - ' || TO_CHAR(v_current_month, 'YYYY-MM') || ' - عقد #' || v_contract.contract_number,
              NOW(),
              NOW()
            )
            RETURNING id INTO v_invoice_id;
            
            v_created_count := v_created_count + 1;
            v_total_amount := v_total_amount + v_monthly_amount;
            v_months_covered := array_append(v_months_covered, TO_CHAR(v_current_month, 'YYYY-MM'));
            
            RAISE NOTICE '✅ Created invoice % for contract % - Month: %', 
              v_invoice_number, v_contract.contract_number, v_current_month;
              
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to create invoice for contract % month %: %', 
            v_contract.contract_number, v_current_month, SQLERRM;
          v_skipped_count := v_skipped_count + 1;
        END;
        
        -- Move to next month
        v_current_month := (v_current_month + INTERVAL '1 month')::DATE;
      END LOOP;
      
      -- Return results for this contract
      RETURN QUERY SELECT 
        v_contract.id,
        v_contract.contract_number,
        v_contract.customer_name,
        v_created_count::INTEGER,
        v_skipped_count::INTEGER,
        v_total_amount,
        array_to_string(v_months_covered, ', ')::TEXT,
        CASE 
          WHEN v_created_count > 0 THEN 'success'
          WHEN v_skipped_count > 0 THEN 'skipped'
          ELSE 'no_action'
        END::TEXT,
        NULL::TEXT;
        
    END LOOP;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in fix_missing_invoices_for_contracts: %', SQLERRM;
    RETURN QUERY SELECT 
      NULL::UUID,
      NULL::VARCHAR,
      NULL::VARCHAR,
      0::INTEGER,
      0::INTEGER,
      0::NUMERIC,
      NULL::TEXT,
      'error'::TEXT,
      SQLERRM::TEXT;
  END;
  
  -- Re-enable triggers
  SET session_replication_role = DEFAULT;
  
  RAISE NOTICE '✅ Fix missing invoices process completed!';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION fix_missing_invoices_for_contracts TO authenticated;
GRANT EXECUTE ON FUNCTION fix_missing_invoices_for_contracts TO service_role;

-- Add comment
COMMENT ON FUNCTION fix_missing_invoices_for_contracts IS 
'Fixes missing invoices for active contracts after data updates.
- Checks all active contracts for missing invoices
- Uses updated contract data (monthly_rent, monthly_amount)
- Creates invoices for missing months within date range
- Skips existing invoices
- Returns detailed results per contract';

-- ================================================================
-- HELPER FUNCTION: Check Missing Invoices Report
-- ================================================================
CREATE OR REPLACE FUNCTION check_missing_invoices_report(
  p_company_id UUID DEFAULT NULL,
  p_contract_id UUID DEFAULT NULL
)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR,
  customer_name VARCHAR,
  contract_start_date DATE,
  contract_end_date DATE,
  monthly_amount NUMERIC,
  expected_invoices INTEGER,
  existing_invoices INTEGER,
  missing_invoices INTEGER,
  missing_months TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_current_month DATE;
  v_first_month DATE;
  v_last_month DATE;
  v_expected_count INTEGER;
  v_existing_count INTEGER;
  v_missing_months TEXT[];
BEGIN
  v_first_month := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')::DATE;
  v_last_month := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')::DATE;
  
  FOR v_contract IN
    SELECT 
      c.id,
      c.contract_number,
      c.start_date,
      c.end_date,
      COALESCE(c.monthly_rent, c.monthly_amount, 0) as monthly_amount,
      cust.first_name || ' ' || COALESCE(cust.last_name, '') as customer_name
    FROM contracts c
    LEFT JOIN customers cust ON c.customer_id = cust.id
    WHERE c.status = 'active'
      AND c.start_date IS NOT NULL
      AND (p_company_id IS NULL OR c.company_id = p_company_id)
      AND (p_contract_id IS NULL OR c.id = p_contract_id)
  LOOP
    v_expected_count := 0;
    v_existing_count := 0;
    v_missing_months := ARRAY[]::TEXT[];
    
    v_first_month := DATE_TRUNC('month', v_contract.start_date + INTERVAL '1 month')::DATE;
    v_last_month := LEAST(
      COALESCE(DATE_TRUNC('month', v_contract.end_date)::DATE, CURRENT_DATE),
      CURRENT_DATE
    );
    
    v_current_month := v_first_month;
    
    WHILE v_current_month <= v_last_month LOOP
      v_expected_count := v_expected_count + 1;
      
      -- Check if invoice exists
      SELECT COUNT(*) INTO v_existing_count
      FROM invoices
      WHERE contract_id = v_contract.id
        AND DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE = v_current_month
        AND (status IS NULL OR status != 'cancelled');
      
      IF v_existing_count = 0 THEN
        v_missing_months := array_append(v_missing_months, TO_CHAR(v_current_month, 'YYYY-MM'));
      END IF;
      
      v_current_month := (v_current_month + INTERVAL '1 month')::DATE;
    END LOOP;
    
    -- Count existing invoices
    SELECT COUNT(*) INTO v_existing_count
    FROM invoices
    WHERE contract_id = v_contract.id
      AND DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE >= v_first_month
      AND DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE <= v_last_month
      AND (status IS NULL OR status != 'cancelled');
    
    RETURN QUERY SELECT 
      v_contract.id,
      v_contract.contract_number,
      v_contract.customer_name,
      v_contract.start_date,
      v_contract.end_date,
      v_contract.monthly_amount,
      v_expected_count::INTEGER,
      v_existing_count::INTEGER,
      (v_expected_count - v_existing_count)::INTEGER,
      v_missing_months;
      
  END LOOP;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_missing_invoices_report TO authenticated;
GRANT EXECUTE ON FUNCTION check_missing_invoices_report TO service_role;

-- ================================================================
-- COMPLETION MESSAGE
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Missing Invoices Fix Functions Created Successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Functions:';
    RAISE NOTICE '   1. fix_missing_invoices_for_contracts() - Creates missing invoices';
    RAISE NOTICE '   2. check_missing_invoices_report() - Shows missing invoices report';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 To check missing invoices:';
    RAISE NOTICE '   SELECT * FROM check_missing_invoices_report(''company-id'');';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 To fix missing invoices:';
    RAISE NOTICE '   SELECT * FROM fix_missing_invoices_for_contracts(''company-id'');';
    RAISE NOTICE '';
    RAISE NOTICE '   Or for specific contract:';
    RAISE NOTICE '   SELECT * FROM fix_missing_invoices_for_contracts(NULL, ''contract-id'');';
    RAISE NOTICE '';
    RAISE NOTICE '   Or for specific date range:';
    RAISE NOTICE '   SELECT * FROM fix_missing_invoices_for_contracts(''company-id'', NULL, ''2024-01-01'', ''2024-12-31'');';
END $$;

