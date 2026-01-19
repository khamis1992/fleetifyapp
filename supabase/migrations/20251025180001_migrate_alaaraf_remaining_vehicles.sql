-- ===============================
-- Migration: Remaining 60 Vehicles for العراف
-- ===============================
-- Company: العراف لتاجير السيارات (24bc0b21-4e2d-4413-9842-31719a3669f4)
-- Vehicles: 21-80 (remaining 60 vehicles)
-- ===============================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_record RECORD;
  v_customer_id UUID;
  v_vehicle_id UUID;
  v_contract_exists BOOLEAN;
  v_contract_number TEXT;
  v_end_date DATE;
  v_created_count INTEGER := 0;
  v_skipped_vehicle INTEGER := 0;
  v_skipped_contract INTEGER := 0;
BEGIN
  RAISE NOTICE 'Processing remaining 60 vehicles for العراف';
  
  FOR v_vehicle_record IN
    SELECT * FROM (VALUES
      -- Vehicles 21-80
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
    ) AS t(plate, name, phone, start_date, amount)
  LOOP
    -- Find vehicle
    SELECT id INTO v_vehicle_id FROM vehicles 
    WHERE plate_number = v_vehicle_record.plate AND company_id = v_company_id LIMIT 1;
    
    IF v_vehicle_id IS NULL THEN
      v_skipped_vehicle := v_skipped_vehicle + 1;
      CONTINUE;
    END IF;
    
    -- Check if contract already exists
    SELECT EXISTS(SELECT 1 FROM contracts WHERE vehicle_id = v_vehicle_id AND status = 'active') INTO v_contract_exists;
    
    IF v_contract_exists THEN
      v_skipped_contract := v_skipped_contract + 1;
      CONTINUE;
    END IF;
    
    -- Find/create customer
    SELECT id INTO v_customer_id FROM customers WHERE phone = v_vehicle_record.phone AND company_id = v_company_id LIMIT 1;
    
    IF v_customer_id IS NULL THEN
      -- Create customer with auto-generated customer_code
      BEGIN
        WITH next_code AS (
          SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
          FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
        )
        INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
        SELECT v_company_id, 'individual', v_vehicle_record.name, v_vehicle_record.phone, 
               'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
        FROM next_code
        RETURNING id INTO v_customer_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_customer_id FROM customers WHERE phone = v_vehicle_record.phone AND company_id = v_company_id LIMIT 1;
      END;
    ELSE
      UPDATE customers SET first_name = v_vehicle_record.name, updated_at = NOW() WHERE id = v_customer_id;
    END IF;
    
    -- Create contract
    v_contract_number := 'CON-' || v_vehicle_record.plate || '-' || TO_CHAR(v_vehicle_record.start_date, 'YYYYMMDD');
    v_end_date := v_vehicle_record.start_date + INTERVAL '12 months';
    
    INSERT INTO contracts (
      id, company_id, customer_id, vehicle_id, contract_number,
      contract_date, start_date, end_date, monthly_amount, contract_amount,
      status, contract_type, description, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_company_id, v_customer_id, v_vehicle_id, v_contract_number,
      v_vehicle_record.start_date, v_vehicle_record.start_date, v_end_date,
      v_vehicle_record.amount, v_vehicle_record.amount * 12,
      'active', 'rental', 'عقد إيجار - العراف', NOW(), NOW()
    );
    
    UPDATE vehicles SET status = 'rented', updated_at = NOW() WHERE id = v_vehicle_id;
    
    v_created_count := v_created_count + 1;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========== العراف Migration Complete (Batch 2) ==========';
  RAISE NOTICE '✅ Created: % contracts', v_created_count;
  RAISE NOTICE '⏭️ Skipped: % (vehicle not found), % (contract exists)', v_skipped_vehicle, v_skipped_contract;
  RAISE NOTICE '=======================================================';
END $$;

-- Final summary
SELECT 
  'Total Contracts Created for العراف' as metric,
  COUNT(*) as count
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND description LIKE '%العراف%';
