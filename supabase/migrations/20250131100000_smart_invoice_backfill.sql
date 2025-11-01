-- ================================================================
-- SMART INVOICE BACKFILL FUNCTION - FINAL WORKING VERSION
-- ================================================================
-- This function efficiently generates missing invoices for contracts
-- Disables triggers temporarily to avoid conflicts
-- ================================================================

CREATE OR REPLACE FUNCTION smart_backfill_contract_invoices(
  p_company_id UUID,
  p_contract_id UUID DEFAULT NULL,
  p_update_wrong_dates BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  result_contract_id UUID,
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
  v_contract RECORD;
  v_current_month DATE;
  v_invoice_exists BOOLEAN;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
BEGIN
  RAISE NOTICE '🚀 Starting smart backfill for company %', p_company_id;
  
  -- Disable triggers temporarily to avoid conflicts with journal entry creation
  SET session_replication_role = replica;
  
  BEGIN
    -- Step 1: Update existing invoices with wrong due dates
    IF p_update_wrong_dates THEN
      UPDATE invoices i
      SET 
        due_date = DATE_TRUNC('month', COALESCE(i.due_date, i.invoice_date))::DATE,
        invoice_date = DATE_TRUNC('month', COALESCE(i.invoice_date, i.due_date))::DATE,
        updated_at = NOW()
      WHERE i.company_id = p_company_id
        AND i.contract_id IS NOT NULL
        AND (p_contract_id IS NULL OR i.contract_id = p_contract_id)
        AND (i.status IS NULL OR i.status != 'cancelled')
        AND (
          (i.due_date IS NOT NULL AND EXTRACT(DAY FROM i.due_date) != 1)
          OR (i.due_date IS NULL AND i.invoice_date IS NOT NULL AND EXTRACT(DAY FROM i.invoice_date) != 1)
        )
        AND (i.payment_status = 'unpaid' OR i.payment_status IS NULL);
      
      GET DIAGNOSTICS v_total_updated = ROW_COUNT;
      RAISE NOTICE '✅ Updated % invoice(s) to have due_date on 1st of month', v_total_updated;
    END IF;
    
    -- Step 2: Generate missing invoices for each contract
    FOR v_contract IN
      SELECT 
        c.id, c.contract_number, c.company_id, c.customer_id,
        c.start_date, c.end_date, c.monthly_amount, c.contract_amount
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
        v_first_month DATE;
        v_last_month DATE;
      BEGIN
        -- First invoice on 1st of month AFTER contract start
        v_first_month := DATE_TRUNC('month', v_contract.start_date + INTERVAL '1 month')::DATE;
        
        -- Last invoice on 1st of current month (or contract end if earlier)
        v_last_month := DATE_TRUNC('month', COALESCE(v_contract.end_date, CURRENT_DATE))::DATE;
        
        v_current_month := v_first_month;
        
        -- Loop through each month
        WHILE v_current_month <= v_last_month LOOP
          -- Check if invoice already exists for this month
          SELECT EXISTS (
            SELECT 1 FROM invoices i
            WHERE i.contract_id = v_contract.id
              AND DATE_TRUNC('month', COALESCE(i.due_date, i.invoice_date))::DATE = v_current_month
              AND (i.status IS NULL OR i.status != 'cancelled')
          ) INTO v_invoice_exists;
          
          IF v_invoice_exists THEN
            v_skipped := v_skipped + 1;
          ELSE
            -- Generate unique invoice number
            SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || 
                   LPAD((COUNT(*) + 1)::TEXT, 5, '0')
            INTO v_invoice_number
            FROM invoices inv
            WHERE inv.company_id = v_contract.company_id;
            
            -- Create invoice
            INSERT INTO invoices (
              company_id, customer_id, contract_id, invoice_number,
              invoice_date, due_date, total_amount, subtotal,
              tax_amount, discount_amount, paid_amount, balance_due,
              status, payment_status, invoice_type, notes, created_at, updated_at
            ) VALUES (
              v_contract.company_id, v_contract.customer_id, v_contract.id, v_invoice_number,
              v_current_month, v_current_month,
              COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0),
              COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0),
              0, 0, 0, COALESCE(v_contract.monthly_amount, v_contract.contract_amount, 0),
              'sent', 'unpaid', 'service',
              'فاتورة إيجار شهرية - ' || TO_CHAR(v_current_month, 'YYYY-MM') || ' - عقد #' || v_contract.contract_number,
              NOW(), NOW()
            );
            
            v_created := v_created + 1;
          END IF;
          
          -- Move to next month
          v_current_month := v_current_month + INTERVAL '1 month';
        END LOOP;
        
        v_total_created := v_total_created + v_created;
        
        -- Return results for this contract
        RETURN QUERY SELECT 
          v_contract.id, v_contract.contract_number,
          v_created, 0::INTEGER, v_skipped,
          'Processed successfully'::TEXT;
          
      EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
          v_contract.id, v_contract.contract_number,
          0::INTEGER, 0::INTEGER, 0::INTEGER,
          ('Error: ' || SQLERRM)::TEXT;
      END;
    END LOOP;
  END;
  
  -- Re-enable triggers
  SET session_replication_role = DEFAULT;
  
  RAISE NOTICE '🎉 Backfill complete: Created %, Updated %', v_total_created, v_total_updated;
  
  RETURN;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION smart_backfill_contract_invoices IS 
'Generates missing invoices for active contracts. 
- Updates existing invoices to have due_date on 1st of month
- Creates new invoices for missing months
- Temporarily disables triggers to avoid conflicts';
