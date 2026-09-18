CREATE OR REPLACE FUNCTION generate_historical_invoices_safe(
  p_start_date DATE DEFAULT '2023-01-01',
  p_end_date DATE DEFAULT '2025-10-31'
)
RETURNS TABLE (
  contract_id_out UUID,
  contract_number_out TEXT,
  invoice_date_out DATE,
  invoice_number_out TEXT,
  amount_out NUMERIC,
  status_out TEXT,
  message_out TEXT
) AS $$
DECLARE
  v_contract RECORD;
  v_invoice_date DATE;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_company_id UUID;
  v_exists BOOLEAN;
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
      -- Check if invoice already exists
      SELECT EXISTS (
        SELECT 1 FROM invoices inv
        WHERE inv.contract_id = v_contract.id 
        AND inv.invoice_date >= v_invoice_date 
        AND inv.invoice_date < v_invoice_date + INTERVAL '1 month'
      ) INTO v_exists;
      
      IF NOT v_exists THEN
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
          contract_id_out := v_contract.id;
          contract_number_out := v_contract.contract_number;
          invoice_date_out := v_invoice_date;
          invoice_number_out := v_invoice_number;
          amount_out := v_contract.monthly_amount;
          status_out := 'success';
          message_out := 'Invoice created successfully';
          RETURN NEXT;
            
        EXCEPTION 
          WHEN unique_violation THEN
            -- Invoice already exists (duplicate)
            contract_id_out := v_contract.id;
            contract_number_out := v_contract.contract_number;
            invoice_date_out := v_invoice_date;
            invoice_number_out := v_invoice_number;
            amount_out := v_contract.monthly_amount;
            status_out := 'skipped';
            message_out := 'Invoice already exists';
            RETURN NEXT;
              
          WHEN OTHERS THEN
            -- Other error (probably journal entry)
            contract_id_out := v_contract.id;
            contract_number_out := v_contract.contract_number;
            invoice_date_out := v_invoice_date;
            invoice_number_out := v_invoice_number;
            amount_out := v_contract.monthly_amount;
            status_out := 'error';
            message_out := SQLERRM;
            RETURN NEXT;
        END;
      ELSE
        -- Invoice already exists
        contract_id_out := v_contract.id;
        contract_number_out := v_contract.contract_number;
        invoice_date_out := v_invoice_date;
        invoice_number_out := v_invoice_number;
        amount_out := v_contract.monthly_amount;
        status_out := 'exists';
        message_out := 'Invoice already exists';
        RETURN NEXT;
      END IF;
      
      -- Move to next month
      v_invoice_date := (v_invoice_date + INTERVAL '1 month')::DATE;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;
;
