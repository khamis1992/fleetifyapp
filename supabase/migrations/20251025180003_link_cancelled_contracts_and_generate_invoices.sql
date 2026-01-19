-- ===============================
-- Link Cancelled Contracts to Vehicles and Generate Invoices
-- ===============================
-- This migration:
-- 1. Links cancelled contracts to vehicles using plate numbers from agreements_with_details.sql
-- 2. Updates vehicle status based on contract status (as per data consistency requirement)
-- 3. Generates monthly invoices for cancelled contracts
-- 4. Matches invoices with existing payments
-- ===============================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_data RECORD;
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
  v_updated_contracts INTEGER := 0;
  v_created_invoices INTEGER := 0;
  v_invoice_date DATE;
  v_due_date DATE;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_late_fee DECIMAL(10,2);
  v_days_late INTEGER;
  v_end_date DATE;
BEGIN
  RAISE NOTICE 'Starting cancelled contracts migration for العراف...';
  
  -- Process each cancelled contract with vehicle plate info
  FOR v_contract_data IN
    SELECT * FROM (VALUES
      -- contract_number, plate, customer_name, phone, start_date, cancel_date, monthly_amount, total_paid
      ('LTO2024326', '8208', 'عصام احمد عيد الدابر', '66276263', '2024-10-06'::DATE, '2025-04-02'::DATE, 4000, 8000),
      ('LTO202444', '7072', 'يوسف العويدي لخليل', '72119703', '2024-01-15'::DATE, '2025-04-22'::DATE, 0, 0),
      ('LTO2024312', '4016', 'سلمى عبد الله', '30534902', '2024-09-24'::DATE, '2025-04-22'::DATE, 1800, 1800),
      ('LTO2024139', '7036', 'عصام ابراهيم عبد الله', '30777645', '2024-04-29'::DATE, '2025-04-22'::DATE, 2100, 14700),
      ('MR202475', '7038', 'ثامر السعيد', '30067536', '2024-02-03'::DATE, '2025-04-22'::DATE, 2100, 8360),
      ('LTO2024276', '8209', 'سعيد الهلالي', '33333971', '2024-08-17'::DATE, '2025-04-02'::DATE, 1600, 2500),
      ('LTO202430', '8205', 'حمزة سرونجا', '50795709', '2024-03-17'::DATE, '2025-04-22'::DATE, 0, 0),
      ('LTO202412', '8212', 'ريجب كارت', '74462697', '2024-01-01'::DATE, '2025-04-22'::DATE, 0, 0),
      ('LTO2024281', '21860', 'محمد العريشي', '66816813', '2024-08-24'::DATE, '2025-04-02'::DATE, 1800, 3600),
      ('LTO202433', '8203', 'محمد عماد النعماني', '51230549', '2023-12-25'::DATE, '2025-04-22'::DATE, 0, 0),
      ('LTO2024108', '856589', 'سجاد جول', '30092501', '2024-01-18'::DATE, '2025-04-22'::DATE, 0, 0),
      ('LTO202457', '5898', 'محمد سراج الدين', '31184659', '2024-03-14'::DATE, '2025-04-22'::DATE, 0, 0),
      ('LTO2024126', '8209', 'مأمون احمد', '30034843', '2024-04-18'::DATE, '2025-04-22'::DATE, 0, 7320),
      ('LTO202426', '4016', 'ناصر لحسن', '55064714', '2023-12-30'::DATE, '2025-04-22'::DATE, 0, 9500),
      ('LTO202417', '8213', 'يحي هلال الصغري', '31310330', '2024-02-08'::DATE, '2025-04-02'::DATE, 2100, 10500),
      ('LTO202443', '8208', 'محمد ابرار عبد الحنان', '70505396', '2024-01-15'::DATE, '2025-04-22'::DATE, 0, 2100),
      ('LTO202411', '4014', 'محمد علي خالد', '50584650', '2024-03-02'::DATE, '2025-04-22'::DATE, 0, 3100),
      ('LTO2024290', '906077', 'صدام الفلاح', '55031297', '2024-09-04'::DATE, '2025-03-10'::DATE, 0, 5000),
      ('LTO2024311', '4016', 'محمد حسن عمر محمد', '50131342', '2024-09-16'::DATE, '2025-03-10'::DATE, 0, 1200),
      ('Ret-2018202', '8207', 'حسن الفكي', '33211272', '2024-06-02'::DATE, '2025-03-10'::DATE, 0, 1600),
      ('LTO202434', '8204', 'حق نواز رحيم بخش', '33048081', '2023-12-16'::DATE, '2025-03-10'::DATE, 0, 2300),
      ('LTO2024267', '8208', 'حمزة حسين', '71348615', '2024-08-05'::DATE, '2025-03-10'::DATE, 2000, 5900)
    ) AS t(contract_number, plate, customer_name, phone, start_date, cancel_date, monthly_amount, total_paid)
  LOOP
    -- Find vehicle by plate number
    SELECT id INTO v_vehicle_id 
    FROM vehicles 
    WHERE plate_number = v_contract_data.plate 
    AND company_id = v_company_id 
    LIMIT 1;
    
    IF v_vehicle_id IS NULL THEN
      RAISE NOTICE 'Vehicle not found for plate: %', v_contract_data.plate;
      CONTINUE;
    END IF;
    
    -- Find or create customer
    SELECT id INTO v_customer_id 
    FROM customers 
    WHERE phone = v_contract_data.phone 
    AND company_id = v_company_id 
    LIMIT 1;
    
    IF v_customer_id IS NULL THEN
      -- Create customer with Arabic name
      BEGIN
        WITH next_code AS (
          SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
          FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
        )
        INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
        SELECT v_company_id, 'individual', v_contract_data.customer_name, v_contract_data.phone, 
               'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
        FROM next_code
        RETURNING id INTO v_customer_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_customer_id FROM customers WHERE phone = v_contract_data.phone AND company_id = v_company_id LIMIT 1;
      END;
    ELSE
      -- Update customer name to Arabic
      UPDATE customers 
      SET first_name = v_contract_data.customer_name, updated_at = NOW() 
      WHERE id = v_customer_id;
    END IF;
    
    -- Find existing cancelled contract by contract_number
    SELECT id INTO v_contract_id
    FROM contracts
    WHERE contract_number = v_contract_data.contract_number
    AND company_id = v_company_id
    AND status = 'cancelled'
    LIMIT 1;
    
    IF v_contract_id IS NOT NULL THEN
      -- Update existing cancelled contract with vehicle and customer
      UPDATE contracts
      SET 
        vehicle_id = v_vehicle_id,
        customer_id = v_customer_id,
        license_plate = v_contract_data.plate,
        monthly_amount = CASE WHEN monthly_amount IS NULL OR monthly_amount = 0 THEN v_contract_data.monthly_amount ELSE monthly_amount END,
        updated_at = NOW()
      WHERE id = v_contract_id;
      
      v_updated_contracts := v_updated_contracts + 1;
      
      -- Generate invoices for this cancelled contract
      -- Calculate months from start_date to cancel_date
      FOR v_invoice_date IN 
        SELECT DATE_TRUNC('month', v_contract_data.start_date) + (n || ' months')::INTERVAL
        FROM generate_series(0, EXTRACT(YEAR FROM AGE(v_contract_data.cancel_date, v_contract_data.start_date))::INTEGER * 12 + 
                               EXTRACT(MONTH FROM AGE(v_contract_data.cancel_date, v_contract_data.start_date))::INTEGER) AS n
        WHERE DATE_TRUNC('month', v_contract_data.start_date) + (n || ' months')::INTERVAL <= v_contract_data.cancel_date
      LOOP
        v_due_date := v_invoice_date;
        v_invoice_number := 'INV-' || v_contract_data.plate || '-' || TO_CHAR(v_invoice_date, 'YYYYMM');
        
        -- Skip if invoice already exists
        IF NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = v_invoice_number AND company_id = v_company_id) THEN
          -- Calculate late fee (120 SAR/day, max 3000/month)
          v_days_late := GREATEST(0, v_contract_data.cancel_date - v_due_date);
          v_late_fee := LEAST(v_days_late * 120, 3000);
          
          -- Create invoice (use 'sales' for rental invoices as per schema constraint)
          INSERT INTO invoices (
            id, company_id, customer_id, contract_id, invoice_number,
            invoice_date, due_date, subtotal, total_amount, balance_due,
            status, payment_status, invoice_type, notes, currency,
            created_at, updated_at
          ) VALUES (
            gen_random_uuid(), v_company_id, v_customer_id, v_contract_id, v_invoice_number,
            v_invoice_date, v_due_date, v_contract_data.monthly_amount,
            v_contract_data.monthly_amount + v_late_fee, v_contract_data.monthly_amount + v_late_fee,
            'paid', 'paid', 'sales',
            'إيجار شهري (ملغي) - ' || v_contract_data.plate || ' - ' || TO_CHAR(v_invoice_date, 'YYYY-MM') ||
            CASE WHEN v_late_fee > 0 THEN ' | غرامة تأخير: ' || v_late_fee::text || ' ريال' ELSE '' END,
            'SAR', NOW(), NOW()
          ) RETURNING id INTO v_invoice_id;
          
          v_created_invoices := v_created_invoices + 1;
          
          -- Try to match with existing payments
          UPDATE invoices inv
          SET 
            paid_amount = inv.total_amount,
            balance_due = 0,
            updated_at = NOW()
          WHERE inv.id = v_invoice_id
          AND EXISTS (
            SELECT 1 FROM payments p
            WHERE p.company_id = v_company_id
            AND p.customer_id = v_customer_id
            AND p.payment_date >= v_invoice_date
            AND p.payment_date < (v_invoice_date + INTERVAL '1 month')
            AND p.amount >= (v_contract_data.monthly_amount * 0.8)
            LIMIT 1
          );
        END IF;
      END LOOP;
      
      -- Update vehicle status based on contract status (data consistency requirement)
      -- Cancelled contracts should set vehicle to 'available'
      UPDATE vehicles
      SET status = 'available', updated_at = NOW()
      WHERE id = v_vehicle_id
      AND status = 'rented'; -- Only update if currently rented
      
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========== Cancelled Contracts Migration Complete ==========';
  RAISE NOTICE '✅ Updated Contracts: %', v_updated_contracts;
  RAISE NOTICE '✅ Created Invoices: %', v_created_invoices;
  RAISE NOTICE '============================================================';
END $$;

-- Summary
SELECT 
  'Migration Summary for العراف' as metric,
  '' as value
  
UNION ALL SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ''

UNION ALL SELECT 
  'Cancelled Contracts WITH Vehicles:',
  COUNT(*)::text
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'cancelled'
AND vehicle_id IS NOT NULL

UNION ALL SELECT 
  'Total Invoices for العراف:',
  COUNT(*)::text
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'

UNION ALL SELECT 
  'Paid Invoices:',
  COUNT(*)::text
FROM invoices
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND status = 'paid';
