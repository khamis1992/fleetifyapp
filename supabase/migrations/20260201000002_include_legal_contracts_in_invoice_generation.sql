-- ================================================================
-- Migration: Include Legal Contracts in Automatic Invoice Generation
-- Created: 2026-02-01
-- Description: Update invoice generation to include contracts under legal procedure
-- Impact: MEDIUM - Ensures invoices are created for all active contracts
-- ================================================================

-- ============================================================================
-- Update generate_monthly_invoices_for_date function
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_monthly_invoices_for_date(
  p_company_id UUID,
  p_invoice_month DATE -- First day of the month (e.g., 2024-02-01)
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

  -- Loop through all active contracts (including legal procedure and suspended)
  FOR v_contract IN
    SELECT c.*
    FROM contracts c
    WHERE c.company_id = p_company_id
      AND c.status IN ('active', 'under_legal_procedure', 'suspended')  -- ✅ تضمين العقود القانونية
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
          (SELECT i.invoice_number FROM invoices i WHERE i.id = v_invoice_id),
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

-- ============================================================================
-- Update backfill_contract_invoices function
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_contract_invoices(
  p_company_id UUID,
  p_contract_id UUID DEFAULT NULL
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

  -- Loop through contracts (including legal procedure and suspended)
  FOR v_contract IN
    SELECT c.*
    FROM contracts c
    WHERE c.company_id = p_company_id
      AND c.status IN ('active', 'under_legal_procedure', 'suspended')  -- ✅ تضمين العقود القانونية
      AND (p_contract_id IS NULL OR c.id = p_contract_id)
    ORDER BY c.start_date
  LOOP
    v_months_count := 0;
    v_created_count := 0;
    v_skipped_count := 0;

    RAISE NOTICE '📋 Processing contract: % (Start: %)', v_contract.contract_number, v_contract.start_date;

    -- Start from the first day of the month AFTER the contract start date
    v_current_month := DATE_TRUNC('month', v_contract.start_date + INTERVAL '1 month')::DATE;

    -- Loop through each month from start date to today
    WHILE v_current_month <= DATE_TRUNC('month', CURRENT_DATE)::DATE LOOP
      v_months_count := v_months_count + 1;
      
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
      v_current_month := v_current_month + INTERVAL '1 month';
    END LOOP;

    -- Return summary for this contract
    RETURN QUERY SELECT 
      v_contract.id,
      v_contract.contract_number,
      v_months_count,
      v_created_count,
      v_skipped_count;
  END LOOP;

  RAISE NOTICE '✅ Backfill completed!';
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION generate_monthly_invoices_for_date IS 
'Generates invoices for all active contracts (including legal procedure and suspended) for a specific month';

COMMENT ON FUNCTION backfill_contract_invoices IS 
'Creates all missing historical invoices for contracts (including legal procedure and suspended) from start date to today';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Invoice generation functions updated successfully!';
    RAISE NOTICE '📋 Now includes contracts with status:';
    RAISE NOTICE '   - active';
    RAISE NOTICE '   - under_legal_procedure';
    RAISE NOTICE '   - suspended';
    RAISE NOTICE '';
    RAISE NOTICE '💡 To generate missing invoices for legal contracts, run:';
    RAISE NOTICE '   SELECT * FROM generate_monthly_invoices_for_date(''company_id'', ''2026-02-01'');';
END $$;
