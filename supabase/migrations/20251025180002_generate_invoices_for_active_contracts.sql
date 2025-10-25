-- ===============================
-- Generate Invoices for Active Contracts in العراف
-- ===============================
-- This migration creates monthly rental invoices for all active contracts
-- and matches them with existing payments
-- ===============================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_record RECORD;
  v_invoice_date DATE;
  v_due_date DATE;
  v_current_date DATE := CURRENT_DATE;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_late_fee DECIMAL(10,2);
  v_days_late INTEGER;
  v_total_invoices INTEGER := 0;
  v_month_diff INTEGER;
BEGIN
  RAISE NOTICE 'Generating invoices for العراف active contracts...';
  
  -- Loop through all active contracts
  FOR v_contract_record IN
    SELECT 
      c.id as contract_id,
      c.contract_number,
      c.start_date,
      c.end_date,
      c.monthly_amount,
      c.customer_id,
      c.vehicle_id,
      v.plate_number
    FROM contracts c
    JOIN vehicles v ON c.vehicle_id = v.id
    WHERE c.company_id = v_company_id
    AND c.status = 'active'
    AND c.vehicle_id IS NOT NULL
    ORDER BY c.start_date
  LOOP
    -- Calculate number of months between start_date and today
    v_month_diff := EXTRACT(YEAR FROM AGE(v_current_date, v_contract_record.start_date)) * 12 
                    + EXTRACT(MONTH FROM AGE(v_current_date, v_contract_record.start_date));
    
    -- Generate invoices for each month from start_date to today
    FOR i IN 0..v_month_diff LOOP
      -- Invoice date is the 1st of each month
      v_invoice_date := DATE_TRUNC('month', v_contract_record.start_date) + (i || ' months')::INTERVAL;
      
      -- Skip if invoice is in the future
      EXIT WHEN v_invoice_date > v_current_date;
      
      -- Due date is the 1st of the month
      v_due_date := v_invoice_date;
      
      -- Generate invoice number
      v_invoice_number := 'INV-' || v_contract_record.plate_number || '-' || TO_CHAR(v_invoice_date, 'YYYYMM');
      
      -- Check if invoice already exists
      IF NOT EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoice_number = v_invoice_number 
        AND company_id = v_company_id
      ) THEN
        -- Calculate late fee if payment is late
        v_days_late := GREATEST(0, v_current_date - v_due_date);
        
        IF v_days_late > 0 THEN
          -- 120 SAR per day, max 3000 SAR per month
          v_late_fee := LEAST(v_days_late * 120, 3000);
        ELSE
          v_late_fee := 0;
        END IF;
        
        -- Create invoice
        INSERT INTO invoices (
          id,
          company_id,
          customer_id,
          contract_id,
          invoice_number,
          invoice_date,
          due_date,
          subtotal,
          total_amount,
          balance_due,
          status,
          payment_status,
          invoice_type,
          notes,
          currency,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          v_company_id,
          v_contract_record.customer_id,
          v_contract_record.contract_id,
          v_invoice_number,
          v_invoice_date,
          v_due_date,
          v_contract_record.monthly_amount,
          v_contract_record.monthly_amount + v_late_fee,
          v_contract_record.monthly_amount + v_late_fee,
          CASE 
            WHEN v_late_fee > 0 THEN 'overdue'
            WHEN v_current_date > v_due_date THEN 'overdue'
            ELSE 'pending'
          END,
          CASE 
            WHEN v_late_fee > 0 THEN 'overdue'
            WHEN v_current_date > v_due_date THEN 'overdue'
            ELSE 'pending'
          END,
          'rental',
          'إيجار شهري - ' || v_contract_record.plate_number || ' - ' || TO_CHAR(v_invoice_date, 'YYYY-MM') || 
          CASE WHEN v_late_fee > 0 THEN ' | غرامة تأخير: ' || v_late_fee::text || ' ريال' ELSE '' END,
          'SAR',
          NOW(),
          NOW()
        ) RETURNING id INTO v_invoice_id;
        
        v_total_invoices := v_total_invoices + 1;
        
        -- Try to match with existing payments
        UPDATE invoices inv
        SET 
          status = 'paid',
          payment_status = 'paid',
          paid_amount = inv.total_amount,
          balance_due = 0,
          updated_at = NOW()
        FROM (
          SELECT 
            payment_date,
            amount,
            id as payment_id
          FROM payments
          WHERE company_id = v_company_id
          AND customer_id = v_contract_record.customer_id
          AND payment_date >= v_invoice_date
          AND payment_date < (v_invoice_date + INTERVAL '1 month')
          AND amount >= (v_contract_record.monthly_amount * 0.9) -- Allow 10% variance
          AND id NOT IN (
            SELECT payment_id FROM invoice_payments WHERE payment_id IS NOT NULL
          )
          LIMIT 1
        ) p
        WHERE inv.id = v_invoice_id;
        
        -- Link payment to invoice if match found
        INSERT INTO invoice_payments (
          id,
          company_id,
          invoice_id,
          payment_id,
          amount,
          created_at
        )
        SELECT 
          gen_random_uuid(),
          v_company_id,
          v_invoice_id,
          p.id,
          LEAST(p.amount, inv.total_amount),
          NOW()
        FROM payments p
        JOIN invoices inv ON inv.id = v_invoice_id
        WHERE p.company_id = v_company_id
        AND p.customer_id = v_contract_record.customer_id
        AND p.payment_date >= v_invoice_date
        AND p.payment_date < (v_invoice_date + INTERVAL '1 month')
        AND p.amount >= (v_contract_record.monthly_amount * 0.9)
        AND p.id NOT IN (
          SELECT payment_id FROM invoice_payments WHERE payment_id IS NOT NULL
        )
        AND inv.status = 'paid'
        LIMIT 1;
        
      END IF;
    END LOOP;
    
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========== Invoice Generation Complete ==========';
  RAISE NOTICE '✅ Total Invoices Created: %', v_total_invoices;
  RAISE NOTICE '=================================================';
END $$;

-- Summary query
SELECT 
  'Invoice Summary for العراف' as metric,
  '' as value
  
UNION ALL SELECT '━━━━━━━━━━━━━━━━━━━━', ''

UNION ALL SELECT 
  'Total Invoices:',
  COUNT(*)::text
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'

UNION ALL SELECT 
  'Paid Invoices:',
  COUNT(*)::text
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'paid'

UNION ALL SELECT 
  'Pending Invoices:',
  COUNT(*)::text
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'pending'

UNION ALL SELECT 
  'Overdue Invoices:',
  COUNT(*)::text
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'overdue';
