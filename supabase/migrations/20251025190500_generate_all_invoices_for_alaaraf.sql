-- ===============================
-- Generate ALL Invoices for العراف
-- ===============================
-- This migration generates invoices for:
-- 1. All 74 active contracts (from start_date to today)
-- 2. All 22 cancelled contracts with vehicles (from start_date to cancellation)
-- 3. Matches invoices with existing payments
-- 4. Calculates late fees (120 SAR/day, max 3000/month)
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
  v_total_invoices_created INTEGER := 0;
  v_total_invoices_matched INTEGER := 0;
  v_month_diff INTEGER;
  v_end_date DATE;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting invoice generation for العراف';
  RAISE NOTICE '========================================';
  
  -- =====================================
  -- PART 1: Generate invoices for ACTIVE contracts
  -- =====================================
  RAISE NOTICE '';
  RAISE NOTICE '📝 Processing ACTIVE contracts...';
  
  FOR v_contract_record IN
    SELECT 
      c.id as contract_id,
      c.contract_number,
      c.start_date,
      c.end_date,
      c.monthly_amount,
      c.customer_id,
      c.vehicle_id,
      v.plate_number,
      'active' as contract_status
    FROM contracts c
    JOIN vehicles v ON c.vehicle_id = v.id
    WHERE c.company_id = v_company_id
    AND c.status = 'active'
    AND c.vehicle_id IS NOT NULL
    AND c.monthly_amount > 0
    ORDER BY c.start_date
  LOOP
    -- Calculate months from start_date to today
    v_month_diff := EXTRACT(YEAR FROM AGE(v_current_date, v_contract_record.start_date)) * 12 
                    + EXTRACT(MONTH FROM AGE(v_current_date, v_contract_record.start_date));
    
    -- Generate invoices for each month
    FOR i IN 0..v_month_diff LOOP
      v_invoice_date := DATE_TRUNC('month', v_contract_record.start_date) + (i || ' months')::INTERVAL;
      
      -- Skip future invoices
      EXIT WHEN v_invoice_date > v_current_date;
      
      v_due_date := v_invoice_date;
      v_invoice_number := 'INV-' || v_contract_record.plate_number || '-' || TO_CHAR(v_invoice_date, 'YYYYMM');
      
      -- Check if invoice already exists
      IF NOT EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoice_number = v_invoice_number 
        AND company_id = v_company_id
      ) THEN
        -- Calculate late fee
        v_days_late := GREATEST(0, v_current_date - v_due_date);
        v_late_fee := CASE 
          WHEN v_days_late > 0 THEN LEAST(v_days_late * 120, 3000)
          ELSE 0 
        END;
        
        -- Create invoice
        INSERT INTO invoices (
          id, company_id, customer_id, contract_id, invoice_number,
          invoice_date, due_date, subtotal, total_amount, balance_due,
          status, payment_status, invoice_type, notes, currency,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), v_company_id, v_contract_record.customer_id, 
          v_contract_record.contract_id, v_invoice_number,
          v_invoice_date, v_due_date, v_contract_record.monthly_amount,
          v_contract_record.monthly_amount + v_late_fee,
          v_contract_record.monthly_amount + v_late_fee,
          CASE 
            WHEN v_late_fee > 0 THEN 'overdue'
            WHEN v_current_date > v_due_date THEN 'overdue'
            ELSE 'sent'
          END,
          'unpaid',
          'sales',
          'إيجار شهري - ' || v_contract_record.plate_number || ' - ' || TO_CHAR(v_invoice_date, 'YYYY-MM') ||
          CASE WHEN v_late_fee > 0 THEN ' | غرامة تأخير: ' || v_late_fee::text || ' ريال' ELSE '' END,
          'SAR', NOW(), NOW()
        ) RETURNING id INTO v_invoice_id;
        
        v_total_invoices_created := v_total_invoices_created + 1;
        
        -- Try to match with payments (90% tolerance for amount matching)
        UPDATE invoices inv
        SET 
          status = 'paid',
          payment_status = 'paid',
          paid_amount = inv.total_amount,
          balance_due = 0,
          updated_at = NOW()
        FROM (
          SELECT p.id, p.payment_date, p.amount
          FROM payments p
          WHERE p.company_id = v_company_id
          AND p.customer_id = v_contract_record.customer_id
          AND p.payment_date >= v_invoice_date
          AND p.payment_date < (v_invoice_date + INTERVAL '1 month')
          AND p.amount >= (v_contract_record.monthly_amount * 0.9)
          AND p.id NOT IN (
            SELECT payment_id FROM invoice_payments WHERE payment_id IS NOT NULL
          )
          LIMIT 1
        ) p
        WHERE inv.id = v_invoice_id;
        
        -- If payment was matched, create invoice_payment link
        IF FOUND THEN
          INSERT INTO invoice_payments (
            id, company_id, invoice_id, payment_id, amount, created_at
          )
          SELECT 
            gen_random_uuid(), v_company_id, v_invoice_id, p.id,
            LEAST(p.amount, inv.total_amount), NOW()
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
          
          v_total_invoices_matched := v_total_invoices_matched + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Active contracts: % invoices created', v_total_invoices_created;
  
  -- =====================================
  -- PART 2: Generate invoices for CANCELLED contracts
  -- =====================================
  RAISE NOTICE '';
  RAISE NOTICE '📝 Processing CANCELLED contracts...';
  
  v_total_invoices_created := 0;
  
  FOR v_contract_record IN
    SELECT 
      c.id as contract_id,
      c.contract_number,
      c.start_date,
      c.end_date,
      c.monthly_amount,
      c.customer_id,
      c.vehicle_id,
      v.plate_number,
      c.updated_at as cancelled_date,
      'cancelled' as contract_status
    FROM contracts c
    JOIN vehicles v ON c.vehicle_id = v.id
    WHERE c.company_id = v_company_id
    AND c.status = 'cancelled'
    AND c.vehicle_id IS NOT NULL
    AND c.monthly_amount > 0
    ORDER BY c.start_date
  LOOP
    -- Use cancelled_date or end_date as the final invoice date
    v_end_date := LEAST(
      COALESCE(v_contract_record.cancelled_date::DATE, v_current_date),
      COALESCE(v_contract_record.end_date, v_current_date)
    );
    
    -- Calculate months from start to cancellation
    v_month_diff := EXTRACT(YEAR FROM AGE(v_end_date, v_contract_record.start_date)) * 12 
                    + EXTRACT(MONTH FROM AGE(v_end_date, v_contract_record.start_date));
    
    -- Generate invoices for each month
    FOR i IN 0..v_month_diff LOOP
      v_invoice_date := DATE_TRUNC('month', v_contract_record.start_date) + (i || ' months')::INTERVAL;
      
      -- Skip if beyond cancellation date
      EXIT WHEN v_invoice_date > v_end_date;
      
      v_due_date := v_invoice_date;
      v_invoice_number := 'INV-' || v_contract_record.plate_number || '-CANC-' || TO_CHAR(v_invoice_date, 'YYYYMM');
      
      -- Check if invoice already exists
      IF NOT EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoice_number = v_invoice_number 
        AND company_id = v_company_id
      ) THEN
        -- For cancelled contracts, mark as paid
        INSERT INTO invoices (
          id, company_id, customer_id, contract_id, invoice_number,
          invoice_date, due_date, subtotal, total_amount, balance_due,
          paid_amount, status, payment_status, invoice_type, notes, currency,
          created_at, updated_at
        ) VALUES (
          gen_random_uuid(), v_company_id, v_contract_record.customer_id,
          v_contract_record.contract_id, v_invoice_number,
          v_invoice_date, v_due_date, v_contract_record.monthly_amount,
          v_contract_record.monthly_amount, 0,
          v_contract_record.monthly_amount,
          'paid', 'paid', 'sales',
          'إيجار شهري (ملغي) - ' || v_contract_record.plate_number || ' - ' || TO_CHAR(v_invoice_date, 'YYYY-MM'),
          'SAR', NOW(), NOW()
        );
        
        v_total_invoices_created := v_total_invoices_created + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Cancelled contracts: % invoices created', v_total_invoices_created;
  
  -- Final summary
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ INVOICE GENERATION COMPLETE';
  RAISE NOTICE '========================================';
END $$;

-- Final Summary Query
SELECT 
  '📊 FINAL INVOICE SUMMARY FOR العراف' as section,
  '' as detail
  
UNION ALL SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''

UNION ALL SELECT 
  '1. Total Invoices Created:',
  COUNT(*)::text || ' invoices'
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'

UNION ALL SELECT 
  '2. Paid Invoices:',
  COUNT(*)::text || ' invoices'
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'paid'

UNION ALL SELECT 
  '3. Overdue Invoices:',
  COUNT(*)::text || ' invoices'
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'overdue'

UNION ALL SELECT 
  '4. Sent/Pending Invoices:',
  COUNT(*)::text || ' invoices'
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'sent'

UNION ALL SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''

UNION ALL SELECT 
  '5. Total Invoice Amount:',
  COALESCE(SUM(total_amount), 0)::text || ' SAR'
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'

UNION ALL SELECT 
  '6. Total Paid Amount:',
  COALESCE(SUM(paid_amount), 0)::text || ' SAR'
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'

UNION ALL SELECT 
  '7. Outstanding Balance:',
  COALESCE(SUM(balance_due), 0)::text || ' SAR'
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';
