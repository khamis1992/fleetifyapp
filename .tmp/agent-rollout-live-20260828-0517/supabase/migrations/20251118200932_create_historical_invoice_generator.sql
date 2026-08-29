CREATE OR REPLACE FUNCTION generate_historical_invoices_safe(
  p_start_date DATE DEFAULT '2023-01-01',
  p_end_date DATE DEFAULT '2025-10-31'
)
RETURNS TABLE (
  contract_id UUID,
  contract_number TEXT,
  invoice_date DATE,
  invoice_number TEXT,
  amount NUMERIC,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  v_contract RECORD;
  v_invoice_date DATE;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_company_id UUID;
BEGIN
  -- Loop through all active contracts
  FOR v_contract IN 
    SELECT c.id, c.contract_number, c.customer_id, c.start_date, c.end_date, 
           c.monthly_amount, c.company_id
    FROM contracts c
    WHERE c.status = 'active'
    ORDER BY c.start_date
  LOOP
    -- Get company_id
    v_company_id := v_contract.company_id;
    
    -- Generate invoices for each month
    v_invoice_date := DATE_TRUNC('month', GREATEST(v_contract.start_date, p_start_date))::DATE;
    
    WHILE v_invoice_date <= LEAST(COALESCE(v_contract.end_date, CURRENT_DATE), p_end_date) LOOP
      -- Skip if invoice already exists
      IF NOT EXISTS (
        SELECT 1 FROM invoices 
        WHERE contract_id = v_contract.id 
        AND invoice_date >= v_invoice_date 
        AND invoice_date < v_invoice_date + INTERVAL '1 month'
      ) THEN
        -- Generate invoice number
        v_invoice_number := 'INV-' || v_contract.contract_number || '-' || 
                           TO_CHAR(v_invoice_date, 'YYYY-MM');
        
        -- Try to insert invoice
        BEGIN
          INSERT INTO invoices (
            company_id,
            customer_id,
            contract_id,
            invoice_number,
            invoice_date,
            due_date,
            invoice_type,
            subtotal,
            tax_amount,
            discount_amount,
            total_amount,
            paid_amount,
            balance_due,
            currency,
            status,
            payment_status,
            notes
          ) VALUES (
            v_company_id,
            v_contract.customer_id,
            v_contract.id,
            v_invoice_number,
            v_invoice_date,
            v_invoice_date + INTERVAL '15 days',
            'sales',
            v_contract.monthly_amount,
            0,
            0,
            v_contract.monthly_amount,
            0,
            v_contract.monthly_amount,
            'KWD',
            'sent',
            'unpaid',
            'Historical invoice (backfill) for ' || TO_CHAR(v_invoice_date, 'YYYY-MM')
          )
          RETURNING id INTO v_invoice_id;
          
          -- Return success
          RETURN QUERY SELECT 
            v_contract.id,
            v_contract.contract_number,
            v_invoice_date,
            v_invoice_number,
            v_contract.monthly_amount,
            'success'::TEXT,
            'Invoice created successfully'::TEXT;
            
        EXCEPTION 
          WHEN unique_violation THEN
            -- Invoice already exists (duplicate)
            RETURN QUERY SELECT 
              v_contract.id,
              v_contract.contract_number,
              v_invoice_date,
              v_invoice_number,
              v_contract.monthly_amount,
              'skipped'::TEXT,
              'Invoice already exists'::TEXT;
              
          WHEN OTHERS THEN
            -- Other error (probably journal entry)
            RETURN QUERY SELECT 
              v_contract.id,
              v_contract.contract_number,
              v_invoice_date,
              v_invoice_number,
              v_contract.monthly_amount,
              'error'::TEXT,
              SQLERRM::TEXT;
        END;
      ELSE
        -- Invoice already exists
        RETURN QUERY SELECT 
          v_contract.id,
          v_contract.contract_number,
          v_invoice_date,
          v_invoice_number,
          v_contract.monthly_amount,
          'exists'::TEXT,
          'Invoice already exists'::TEXT;
      END IF;
      
      -- Move to next month
      v_invoice_date := (v_invoice_date + INTERVAL '1 month')::DATE;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;
;
