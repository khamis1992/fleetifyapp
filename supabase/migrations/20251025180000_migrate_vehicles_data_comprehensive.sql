-- ===============================
-- Comprehensive Migration: Vehicles Data from SQL File
-- ===============================
-- Purpose: 
-- 1. Check canceled agreements have full information
-- 2. Create/update agreements with Arabic names
-- 3. Generate invoices for old customers up to current date
-- 4. Adjust payments and late fees correctly (120 SAR/day, max 3000/month)
-- Date: 2025-10-25
-- ===============================

-- Function to calculate late fees: 120 per day, max 3000 per month
CREATE OR REPLACE FUNCTION calculate_late_fee(
  due_date DATE,
  payment_date DATE
) RETURNS NUMERIC AS $$
DECLARE
  days_late INTEGER;
  calculated_fee NUMERIC;
BEGIN
  -- If payment is on or before due date (1st of month), no late fee
  IF payment_date <= due_date THEN
    RETURN 0;
  END IF;
  
  -- Calculate days late (after the 1st)
  days_late := payment_date - due_date;
  
  -- Calculate fee: 120 per day, max 3000
  calculated_fee := LEAST(days_late * 120, 3000);
  
  RETURN calculated_fee;
END;
$$ LANGUAGE plpgsql;

-- Function to generate monthly invoices for a contract
CREATE OR REPLACE FUNCTION generate_monthly_invoices_for_contract(
  p_contract_id UUID,
  p_customer_id UUID,
  p_company_id UUID,
  p_monthly_amount NUMERIC,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  invoice_id UUID,
  invoice_date DATE,
  amount NUMERIC,
  late_fee NUMERIC
) AS $$
DECLARE
  current_invoice_date DATE;
  invoice_count INTEGER := 0;
  v_invoice_id UUID;
  v_late_fee NUMERIC;
BEGIN
  -- Start from the first day of the start month
  current_invoice_date := DATE_TRUNC('month', p_start_date);
  
  -- Loop through each month from start to end date
  WHILE current_invoice_date <= p_end_date LOOP
    -- Check if invoice already exists for this month
    IF NOT EXISTS (
      SELECT 1 FROM invoices
      WHERE contract_id = p_contract_id
      AND invoice_date = current_invoice_date
    ) THEN
      -- Create new invoice
      v_invoice_id := gen_random_uuid();
      v_late_fee := 3000; -- Default late fee for unpaid invoices
      
      INSERT INTO invoices (
        id,
        company_id,
        customer_id,
        contract_id,
        invoice_number,
        invoice_date,
        due_date,
        subtotal,
        tax_amount,
        total_amount,
        amount_paid,
        status,
        description,
        late_fee_amount,
        created_at,
        updated_at
      ) VALUES (
        v_invoice_id,
        p_company_id,
        p_customer_id,
        p_contract_id,
        'INV-' || TO_CHAR(current_invoice_date, 'YYYYMM') || '-' || LPAD((EXTRACT(DAY FROM current_invoice_date))::TEXT, 2, '0'),
        current_invoice_date,
        current_invoice_date, -- Due on 1st of month
        p_monthly_amount,
        0,
        p_monthly_amount + v_late_fee,
        0,
        'unpaid',
        'فاتورة إيجار شهرية - ' || TO_CHAR(current_invoice_date, 'Month YYYY'),
        v_late_fee,
        NOW(),
        NOW()
      );
      
      invoice_count := invoice_count + 1;
      
      RETURN QUERY SELECT v_invoice_id, current_invoice_date, p_monthly_amount, v_late_fee;
    END IF;
    
    -- Move to next month
    current_invoice_date := current_invoice_date + INTERVAL '1 month';
  END LOOP;
  
  RAISE NOTICE 'Generated % invoices for contract %', invoice_count, p_contract_id;
END;
$$ LANGUAGE plpgsql;

-- Main migration procedure
DO $$
DECLARE
  v_company_id UUID;
  v_vehicle_record RECORD;
  v_customer_record RECORD;
  v_vehicle_id UUID;
  v_existing_contract RECORD;
  v_new_contract_id UUID;
  v_contract_number TEXT;
  v_end_date DATE;
  v_payment_record RECORD;
  v_invoice_id UUID;
  v_late_fee NUMERIC;
  v_updated_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_invoice_count INTEGER := 0;
BEGIN
  -- Get the first company (you may need to adjust this)
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found in database';
  END IF;
  
  RAISE NOTICE 'Starting migration for company: %', v_company_id;
  
  -- Process each vehicle from the data
  FOR v_vehicle_record IN
    SELECT 
      vehicle_number::TEXT as plate_number,
      customer_name,
      phone_number,
      contract_start_date,
      monthly_payment
    FROM (VALUES
      ('2766', 'محمد محمد احمد', '70007983', '2025-05-02'::DATE, 1600),
      ('2767', 'عبد الغفور دوار', '77122519', '2025-09-02'::DATE, 1500),
      ('2768', 'عبد العزيز محمد', '70342655', '2025-01-09'::DATE, 1500),
      ('2769', 'وضاح عبد الله', '71953163', '2024-12-21'::DATE, 1500),
      ('2770', 'خديرب رضا السحامي', '70220390', '2025-01-08'::DATE, 1600),
      ('2772', 'إسماعيل احمد عبد الله', '30400511', '2024-07-14'::DATE, 1750),
      ('2773', 'مجدي يحيث', '50246458', '2025-01-09'::DATE, 1500),
      ('2774', 'ابراهيم رطوب', '30882244', '2025-02-01'::DATE, 1600),
      ('2775', 'انور جيتوبر', '51476442', '2025-01-02'::DATE, 1600),
      ('2776', 'هيثم خليفة يعلي', '50529648', '2025-04-09'::DATE, 1500),
      ('2778', 'بلال البوقري', '70400898', '2025-07-15'::DATE, 1500),
      ('2780', 'كمال ياسين سرحان', '71002048', '2023-12-29'::DATE, 2100),
      ('2783', 'صدام مصطفى سعد', '77068310', '2025-01-07'::DATE, 1600),
      ('2784', 'عثمان عويريزة', '30770117', '2024-01-08'::DATE, 1600),
      ('5889', 'ايمن خليفة جلاب', '30303088', '2023-11-20'::DATE, 2100),
      ('5890', 'عبد العزيز جرلان', '33767961', '2024-01-12'::DATE, 1500),
      ('5893', 'ايمن محمد شوشان', '50131342', '2024-09-16'::DATE, 1750),
      ('5896', 'مختار الامين', '50129848', '2025-01-09'::DATE, 1600),
      ('5898', 'محمد سراج الدين', '31184659', '2024-05-08'::DATE, 1700),
      ('5901', 'حسام سلمي الطاهري', '31115657', '2023-12-23'::DATE, 2100),
      ('7034', 'محمد احمد عمر متعافي', '50225055', '2025-10-07'::DATE, 1600),
      ('7036', 'عصام ابراهيم عبد الله', '30777645', '2024-12-12'::DATE, 1550),
      ('7039', 'عبد الله عمر برهان', '30945601', '2025-01-04'::DATE, 1500),
      ('7041', 'الصحبي البشير اليماني', '33173763', '2025-01-09'::DATE, 1500),
      ('7043', 'حمزة البشير يحيى', '55260218', '2024-08-21'::DATE, 1750),
      ('7053', 'مهدي اسامة حامد', '30138501', '2024-07-30'::DATE, 1800),
      ('7054', 'محمود جاسم الصالح', '66684460', '2025-01-16'::DATE, 1650),
      ('7056', 'مجدي محمد عيس', '33557425', '2025-01-05'::DATE, 1650),
      ('7058', 'محمد فؤاد شوشان', '55146873', '2024-09-25'::DATE, 1600),
      ('7059', 'عمر مرابحي', '31299557', '2025-01-15'::DATE, 1500),
      ('7061', 'في عبد الحنان الحجز', '55222976', '2025-03-16'::DATE, 2100),
      ('7062', 'محمد المختار بشاشة', '30788438', '2025-10-05'::DATE, 1700),
      ('7063', 'مهند حمودة الظاهر', '30623322', '2025-01-12'::DATE, 1600),
      ('7069', 'عصام الدزوقي', '74700503', '2024-08-26'::DATE, 1800),
      ('7072', 'يوسف العويدي لخليل', '72119703', '2024-07-28'::DATE, 1750),
      ('7074', 'محمود جاسم الصالح', '30531131', '2024-11-14'::DATE, 1600),
      ('7075', 'مطلوب الابراهيم', '50446192', '2024-05-02'::DATE, 1800),
      ('7077', 'ادم صالح جبريل', '50066411', '2023-12-22'::DATE, 1500),
      ('185513', 'الصادق دياب', '70075544', '2024-01-03'::DATE, 1800),
      ('185573', 'ايهاب عبد الله', '3100966', '2025-01-04'::DATE, 1500),
      ('603353', 'مصطفى بالقايد', '31245752', '2025-01-07'::DATE, 1700),
      ('599720', 'انور الدهبي', '50234083', '2025-01-05'::DATE, 1800),
      ('153974', 'زهري حكيم', '55578515', '2025-01-01'::DATE, 1500),
      ('21849', 'فادي السعيد', '66043445', '2025-08-02'::DATE, 1750),
      ('21860', 'محمد العريشي', '66816813', '2025-02-16'::DATE, 1700),
      ('381247', 'قصعادي عقبة', '50409220', '2025-01-07'::DATE, 1500),
      ('556199', 'محمد جمعة', '66816813', '2025-01-08'::DATE, 1600),
      ('706150', 'مروان باكير', '51024665', '2025-11-07'::DATE, 1600),
      ('856715', 'دانور الجيتوني (حمزة)', '66934949', '2025-01-04'::DATE, 1600),
      ('856718', 'حسان بو علاقي', '66553638', '2025-02-14'::DATE, 1700),
      ('856878', 'محمد مسلم', '55001662', '2025-01-08'::DATE, 2100),
      ('856925', 'عاطف منصور', '74446588', '2024-05-08'::DATE, 1850),
      ('857045', 'عميرة الخروبي', '30122896', '2024-02-01'::DATE, 2000),
      ('893406', 'سيف الدين محمد صالح', '70692947', '2025-01-04'::DATE, 1700),
      ('893409', 'عبد الصمد بن عزوز', '33478097', '2025-01-03'::DATE, 1600),
      ('893410', 'عمار عبد العزيز الغزي', '30403800', '2024-04-09'::DATE, 1750),
      ('9255', 'علام الدين حسين', '77456423', '2023-06-21'::DATE, 1500),
      ('10172', 'انور محمد ابراهيم', '70561365', '2025-04-15'::DATE, 1500),
      ('10197', 'احمد الشاعر الصديق', '50118063', '2024-10-08'::DATE, 1250),
      ('11473', 'عمد العواري', '66071051', '2025-09-19'::DATE, 1500),
      ('721894', 'شرف الدين الموجود', '71101506', '2025-03-06'::DATE, 1000),
      ('862169', 'عبد الرحيم شاكر', '31310330', '2025-01-07'::DATE, 1500),
      ('862165', 'مهدي الشريف', '33670129', '2025-01-09'::DATE, 1500),
      ('10665', 'احمد الطاهر الريس', '77013644', '2024-08-14'::DATE, 1750),
      ('10666', 'جاسم محمد الصالح', '30047797', '2025-01-07'::DATE, 1500),
      ('10667', 'وليد شراس اجار عادي', '31308631', '2025-09-07'::DATE, 1500),
      ('10668', 'عبد المنعم حمدي', '70184904', '2025-01-03'::DATE, 1500),
      ('10669', 'اجار ورداد مسعودي عادي', '50818558', '2025-02-09'::DATE, 1500),
      ('4015', 'ابراهيم خضر', '33750040', '2025-09-01'::DATE, 1000),
      ('4016', 'سلمى عبد الله', '30534902', '2025-01-19'::DATE, 1600),
      ('4018', 'عبد الرحيم شاكر', '31310330', '2024-08-02'::DATE, 1700),
      ('8203', 'محمد عماد النعماني', '51230549', '2025-04-10'::DATE, 1600),
      ('8206', 'محمد صالح فرج حامد', '55449463', '2025-10-07'::DATE, 1600),
      ('8207', 'حسن الفكي', '51060253', '2025-04-15'::DATE, 1600),
      ('8208', 'عصام احمد عيد الدابر', '66276263', '2025-02-02'::DATE, 1500),
      ('8211', 'محمد سالم', '30757703', '2025-01-07'::DATE, 1600),
      ('8213', 'يحي هلال الصغري', '504P47989', '2025-01-06'::DATE, 1700)
    ) AS t(vehicle_number, customer_name, phone_number, contract_start_date, monthly_payment)
  LOOP
    RAISE NOTICE 'Processing vehicle: %', v_vehicle_record.plate_number;
    
    -- Find vehicle by plate number
    SELECT id INTO v_vehicle_id
    FROM vehicles
    WHERE plate_number = v_vehicle_record.plate_number
    AND company_id = v_company_id
    LIMIT 1;
    
    IF v_vehicle_id IS NULL THEN
      RAISE WARNING 'Vehicle with plate % not found, skipping', v_vehicle_record.plate_number;
      CONTINUE;
    END IF;
    
    -- Find or create customer
    SELECT * INTO v_customer_record
    FROM customers
    WHERE phone = v_vehicle_record.phone_number
    AND company_id = v_company_id
    LIMIT 1;
    
    IF v_customer_record IS NULL THEN
      -- Create new customer
      INSERT INTO customers (
        company_id,
        customer_type,
        first_name,
        phone,
        created_at,
        updated_at
      ) VALUES (
        v_company_id,
        'individual',
        v_vehicle_record.customer_name,
        v_vehicle_record.phone_number,
        NOW(),
        NOW()
      ) RETURNING * INTO v_customer_record;
      
      RAISE NOTICE 'Created new customer: %', v_customer_record.first_name;
    ELSE
      -- Update customer name to Arabic version if different
      IF v_customer_record.first_name != v_vehicle_record.customer_name THEN
        UPDATE customers
        SET first_name = v_vehicle_record.customer_name,
            updated_at = NOW()
        WHERE id = v_customer_record.id;
        
        RAISE NOTICE 'Updated customer name to: %', v_vehicle_record.customer_name;
      END IF;
    END IF;
    
    -- Check for existing contracts with this vehicle
    SELECT * INTO v_existing_contract
    FROM contracts
    WHERE vehicle_id = v_vehicle_id
    AND company_id = v_company_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_existing_contract IS NOT NULL THEN
      -- Found existing contract
      IF v_existing_contract.status = 'cancelled' OR v_existing_contract.status = 'expired' THEN
        -- Generate invoices for old contract up to start date of new contract
        RAISE NOTICE 'Generating invoices for old contract % up to %', 
          v_existing_contract.contract_number, v_vehicle_record.contract_start_date;
        
        -- Generate monthly invoices from old contract start to new contract start
        FOR v_invoice_id IN
          SELECT invoice_id FROM generate_monthly_invoices_for_contract(
            v_existing_contract.id,
            v_existing_contract.customer_id,
            v_company_id,
            v_existing_contract.monthly_amount,
            v_existing_contract.start_date,
            v_vehicle_record.contract_start_date - INTERVAL '1 day'
          )
        LOOP
          v_invoice_count := v_invoice_count + 1;
        END LOOP;
        
        -- Check for payments and match with invoices
        FOR v_payment_record IN
          SELECT p.*
          FROM payments p
          WHERE p.customer_id = v_existing_contract.customer_id
          AND p.payment_date BETWEEN v_existing_contract.start_date AND v_vehicle_record.contract_start_date
          ORDER BY p.payment_date
        LOOP
          -- Find matching invoice
          SELECT id, invoice_date INTO v_invoice_id, v_end_date
          FROM invoices
          WHERE customer_id = v_existing_contract.customer_id
          AND contract_id = v_existing_contract.id
          AND status = 'unpaid'
          AND invoice_date <= v_payment_record.payment_date
          ORDER BY invoice_date
          LIMIT 1;
          
          IF v_invoice_id IS NOT NULL THEN
            -- Calculate correct late fee
            v_late_fee := calculate_late_fee(v_end_date, v_payment_record.payment_date::DATE);
            
            -- Update invoice as paid
            UPDATE invoices
            SET status = 'paid',
                amount_paid = total_amount,
                late_fee_amount = v_late_fee,
                total_amount = subtotal + v_late_fee,
                updated_at = NOW()
            WHERE id = v_invoice_id;
            
            RAISE NOTICE 'Marked invoice as paid with late fee: %', v_late_fee;
          END IF;
        END LOOP;
        
        -- Create new active contract
        v_contract_number := 'CON-' || v_vehicle_record.plate_number || '-' || TO_CHAR(v_vehicle_record.contract_start_date, 'YYYYMMDD');
        v_end_date := v_vehicle_record.contract_start_date + INTERVAL '12 months';
        
        INSERT INTO contracts (
          id,
          company_id,
          customer_id,
          vehicle_id,
          contract_number,
          contract_date,
          start_date,
          end_date,
          monthly_amount,
          contract_amount,
          status,
          contract_type,
          description,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          v_company_id,
          v_customer_record.id,
          v_vehicle_id,
          v_contract_number,
          v_vehicle_record.contract_start_date,
          v_vehicle_record.contract_start_date,
          v_end_date,
          v_vehicle_record.monthly_payment,
          v_vehicle_record.monthly_payment * 12,
          'active',
          'rental',
          'عقد إيجار - تم إنشاؤه من البيانات المهاجرة',
          NOW(),
          NOW()
        ) RETURNING id INTO v_new_contract_id;
        
        -- Update vehicle status to rented
        UPDATE vehicles
        SET status = 'rented',
            updated_at = NOW()
        WHERE id = v_vehicle_id;
        
        v_created_count := v_created_count + 1;
        RAISE NOTICE 'Created new active contract: %', v_contract_number;
      ELSE
        -- Active contract exists, just update customer name if needed
        IF v_existing_contract.customer_id != v_customer_record.id THEN
          -- Different customer, this is an issue
          RAISE WARNING 'Active contract exists with different customer for vehicle %', v_vehicle_record.plate_number;
        END IF;
        v_updated_count := v_updated_count + 1;
      END IF;
    ELSE
      -- No existing contract, create new one
      v_contract_number := 'CON-' || v_vehicle_record.plate_number || '-' || TO_CHAR(v_vehicle_record.contract_start_date, 'YYYYMMDD');
      v_end_date := v_vehicle_record.contract_start_date + INTERVAL '12 months';
      
      INSERT INTO contracts (
        id,
        company_id,
        customer_id,
        vehicle_id,
        contract_number,
        contract_date,
        start_date,
        end_date,
        monthly_amount,
        contract_amount,
        status,
        contract_type,
        description,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_company_id,
        v_customer_record.id,
        v_vehicle_id,
        v_contract_number,
        v_vehicle_record.contract_start_date,
        v_vehicle_record.contract_start_date,
        v_end_date,
        v_vehicle_record.monthly_payment,
        v_vehicle_record.monthly_payment * 12,
        'active',
        'rental',
        'عقد إيجار - تم إنشاؤه من البيانات المهاجرة',
        NOW(),
        NOW()
      ) RETURNING id INTO v_new_contract_id;
      
      -- Update vehicle status to rented
      UPDATE vehicles
      SET status = 'rented',
          updated_at = NOW()
      WHERE id = v_vehicle_id;
      
      v_created_count := v_created_count + 1;
      RAISE NOTICE 'Created new contract: %', v_contract_number;
    END IF;
  END LOOP;
  
  -- Final summary
  RAISE NOTICE '====== Migration Summary ======';
  RAISE NOTICE 'Contracts created: %', v_created_count;
  RAISE NOTICE 'Contracts updated: %', v_updated_count;
  RAISE NOTICE 'Invoices generated: %', v_invoice_count;
  RAISE NOTICE '===============================';
END $$;

-- Cleanup: Drop temporary functions after migration
DROP FUNCTION IF EXISTS calculate_late_fee(DATE, DATE);
DROP FUNCTION IF EXISTS generate_monthly_invoices_for_contract(UUID, UUID, UUID, NUMERIC, DATE, DATE);
