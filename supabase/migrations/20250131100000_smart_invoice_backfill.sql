-- ================================================================
-- SMART INVOICE BACKFILL FUNCTION
-- ================================================================
-- This function efficiently generates missing invoices for contracts
-- using set-based operations instead of loops
-- ================================================================

CREATE OR REPLACE FUNCTION smart_backfill_contract_invoices(
  p_company_id UUID,
  p_contract_id UUID DEFAULT NULL,
  p_update_wrong_dates BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  contract_id UUID,
  contract_number VARCHAR,
  invoices_created INTEGER,
  invoices_updated INTEGER,
  invoices_skipped INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_created INTEGER := 0;
  v_total_updated INTEGER := 0;
  v_total_skipped INTEGER := 0;
  v_contract RECORD;
BEGIN
  RAISE NOTICE '🚀 Starting smart backfill for company %', p_company_id;
  
  -- Step 1: Update existing invoices with wrong due dates (if enabled)
  IF p_update_wrong_dates THEN
    RAISE NOTICE '📝 Step 1: Updating existing invoices with wrong due dates...';
    
    WITH updated_invoices AS (
      UPDATE invoices i
      SET 
        due_date = DATE_TRUNC('month', COALESCE(i.due_date, i.invoice_date))::DATE,
        invoice_date = DATE_TRUNC('month', COALESCE(i.invoice_date, i.due_date))::DATE,
        updated_at = NOW()
      WHERE i.company_id = p_company_id
        AND i.contract_id IS NOT NULL
        AND (p_contract_id IS NULL OR i.contract_id = p_contract_id)
        AND (i.status IS NULL OR i.status != 'cancelled')
        -- Only update if due_date is not already on the 1st
        AND (
          (i.due_date IS NOT NULL AND EXTRACT(DAY FROM i.due_date) != 1)
          OR (i.due_date IS NULL AND i.invoice_date IS NOT NULL AND EXTRACT(DAY FROM i.invoice_date) != 1)
        )
        -- Only update unpaid invoices to avoid affecting paid ones
        AND (i.payment_status = 'unpaid' OR i.payment_status IS NULL)
      RETURNING i.id
    )
    SELECT COUNT(*) INTO v_total_updated FROM updated_invoices;
    
    RAISE NOTICE '✅ Updated % invoice(s) to have due_date on 1st of month', v_total_updated;
  END IF;
  
  -- Step 2: Generate missing invoices for each contract
  RAISE NOTICE '📝 Step 2: Generating missing invoices...';
  
  -- Loop through contracts
  FOR v_contract IN
    SELECT 
      c.id,
      c.contract_number,
      c.company_id,
      c.customer_id,
      c.start_date,
      c.end_date,
      c.monthly_amount,
      c.contract_amount
    FROM contracts c
    WHERE c.company_id = p_company_id
      AND c.status = 'active'
      AND (p_contract_id IS NULL OR c.id = p_contract_id)
      AND c.start_date IS NOT NULL
    ORDER BY c.contract_number
  LOOP
    DECLARE
      v_created INTEGER := 0;
      v_skipped INTEGER := 0;
      v_first_invoice_month DATE;
      v_last_invoice_month DATE;
    BEGIN
      -- First invoice should be on 1st of the month AFTER contract start
      v_first_invoice_month := DATE_TRUNC('month', v_contract.start_date + INTERVAL '1 month')::DATE;
      
      -- Last invoice should be on 1st of current month (or contract end month if ended)
      v_last_invoice_month := DATE_TRUNC('month', COALESCE(v_contract.end_date, CURRENT_DATE))::DATE;
      
      RAISE NOTICE '📋 Contract %: Generating invoices from % to %', 
        v_contract.contract_number, v_first_invoice_month, v_last_invoice_month;
      
      -- Generate missing invoices using bulk insert with generate_series
      WITH expected_months AS (
        SELECT generate_series(
          v_first_invoice_month,
          v_last_invoice_month,
          '1 month'::INTERVAL
        )::DATE as invoice_month
      ),
      existing_invoices AS (
        SELECT DISTINCT DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE as invoice_month
        FROM invoices
        WHERE contract_id = v_contract.id
          AND (status IS NULL OR status != 'cancelled')
      ),
      missing_months AS (
        SELECT em.invoice_month
        FROM expected_months em
        LEFT JOIN existing_invoices ei ON em.invoice_month = ei.invoice_month
        WHERE ei.invoice_month IS NULL
      ),
      invoice_numbers AS (
        SELECT 
          mm.invoice_month,
          'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || 
          LPAD((ROW_NUMBER() OVER (ORDER BY mm.invoice_month) + 
                (SELECT COUNT(*) FROM invoices WHERE company_id = v_contract.company_id))::TEXT, 5, '0') as invoice_number
        FROM missing_months mm
      ),
      inserted_invoices AS (
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
        )
        SELECT
          v_contract.company_id,
          v_contract.customer_id,
          v_contract.id,
          i_n.invoice_number,
          i_n.invoice_month, -- invoice_date = 1st of month
          i_n.invoice_month, -- due_date = 1st of month
          COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0),
          COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0),
          0, -- tax_amount
          0, -- discount_amount
          0, -- paid_amount
          COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0), -- balance_due
          'sent',
          'unpaid',
          'service',
          'فاتورة إيجار شهرية - ' || TO_CHAR(i_n.invoice_month, 'YYYY-MM') || ' - عقد #' || v_contract.contract_number,
          NOW(),
          NOW()
        FROM invoice_numbers i_n
        RETURNING id
      )
      SELECT COUNT(*) INTO v_created FROM inserted_invoices;
      
      -- Count skipped (months that already had invoices)
      SELECT COUNT(*) INTO v_skipped
      FROM expected_months em
      INNER JOIN existing_invoices ei ON em.invoice_month = ei.invoice_month;
      
      v_total_created := v_total_created + v_created;
      v_total_skipped := v_total_skipped + v_skipped;
      
      RAISE NOTICE '✅ Contract %: Created %, Skipped %', 
        v_contract.contract_number, v_created, v_skipped;
      
      -- Return results for this contract
      RETURN QUERY SELECT 
        v_contract.id,
        v_contract.contract_number,
        v_created,
        0::INTEGER, -- updated count (handled separately)
        v_skipped,
        'Processed successfully'::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Failed to process contract %: %', v_contract.contract_number, SQLERRM;
      
      RETURN QUERY SELECT 
        v_contract.id,
        v_contract.contract_number,
        0::INTEGER,
        0::INTEGER,
        0::INTEGER,
        ('Error: ' || SQLERRM)::TEXT;
    END;
  END LOOP;
  
  RAISE NOTICE '🎉 Backfill complete: Created %, Updated %, Skipped %', 
    v_total_created, v_total_updated, v_total_skipped;
    
  RETURN;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION smart_backfill_contract_invoices IS 
'Efficiently generates missing invoices for contracts using set-based operations. 
Updates existing invoices with wrong due dates to 1st of month (unpaid only).
Creates new invoices for missing months.';

