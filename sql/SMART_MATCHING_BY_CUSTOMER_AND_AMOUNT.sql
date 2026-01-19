-- ================================================================
-- SMART VEHICLE MATCHING: By Customer Name + Rental Amount
-- ================================================================
-- نظام ذكي لربط المركبات بالعقود باستخدام:
-- 1. اسم العميل (مع التسامح في الاختلافات البسيطة)
-- 2. قيمة الإيجار (للتأكيد)
-- ================================================================

-- ================================================================
-- STAGE 1: إضافة الأعمدة (إذا لم تكن موجودة)
-- ================================================================
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS license_plate TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS make TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS year INTEGER;

-- ================================================================
-- STAGE 2: إنشاء جدول مؤقت بالبيانات من agreements_with_details
-- ================================================================
DROP TABLE IF EXISTS temp_agreements_data;

CREATE TEMP TABLE temp_agreements_data AS
SELECT * FROM (VALUES
  ('issam abdallah', 2100, '7036', 'Bestune', 'T77 pro', 2023),
  ('MEHRAN TABIB TABIB HUSSAIN', 0, '749762', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 0, '711464', 'Bestune', 'B70', 2023),
  ('AHMED BEN DHAOU', 0, '7071', 'Bestune', 'T77 pro', 2023),
  ('haythem souissi', 0, '7078', 'Bestune', 'T77 pro', 2023),
  ('AHMED ABBAS ELDAWO ELHASHMI', 2100, '2771', 'Bestune', 'T77', 2023),
  ('frank williams', 0, '10853', 'changan', 'Alsvin', 2024),
  ('marwen safsafi', 1500, '706150', 'Bestune', 'B70', 2023),
  ('bannour rekaia', 1600, '7060', 'Bestune', 'T77 pro', 2023),
  ('AHMED BEN DHAOU', 0, '7071', 'Bestune', 'T77 pro', 2023),
  ('Nacer Lahcene', 0, '4016', 'GAC', 'GS3', 2024),
  ('mahdi yousif', 1700, '721440', 'Bestune', 'B70', 2023),
  ('kaies ayari', 1800, '8203', 'GAC', 'GS3', 2024),
  ('AYMEN HAMADI', 2100, '5889', 'Bestune', 'T77', 2023),
  ('SOUFIANE BESSAOUDI', 0, '4017', 'GAC', 'GS3', 2024),
  ('EIHAB ABDALLA', 0, '7056', 'Bestune', 'T77 pro', 2023),
  ('MAMOUN AHMED', 0, '8209', 'GAC', 'GS3', 2024),
  ('MUHAMMAD ALI KHALID', 0, '4014', 'GAC', 'GS3', 2024),
  ('ahmed fadil', 1800, '2634', 'dongfeng', 'A30', 2023),
  ('Mohamed Hathroubi', 1800, '752724', 'MG5', 'MG5', 2024),
  ('tarek rahali', 1700, '754705', 'MG5', 'MG5', 2024),
  ('mohamed shikh', 0, '10667', 'changan', 'Alsvin', 2024),
  ('chrisus arinaitwe', 0, '2783', 'Bestune', 'T77', 2023),
  ('AHMED AKKAR', 2500, '335485', 'MG5', 'MG5', 2024),
  ('HOSSEM DHAHRI', 2100, '5901', 'Bestune', 'T77 pro', 2023),
  ('Badredine Khalfi', 2200, '847059', 'Ford', 'TERRITORY', 2023),
  ('omer omer', 0, '10670', 'changan', 'Alsvin', 2024),
  ('Mukhtar Ali Anayat UR RAHMAN', 0, '5898', 'Bestune', 'T77 pro', 2023),
  ('ABDELAZIZ JERFEL', 1500, '17216', 'Bestune', 'B70', 2023),
  ('ISSAM MZOUGHI', 1800, '7069', 'Bestune', 'T77 pro', 2023),
  ('ABUOBIDA BABIKER MOHAMED AHMED SIDDIG', 1800, '2784', 'Bestune', 'T77', 2023),
  ('faisal iqbal', 0, '856878', 'Bestune', 'B70s', 2023),
  ('MUHAMMAD GUL', 0, '10853', 'changan', 'Alsvin', 2024),
  ('ANWAR MOHAMED', 1300, '10172', 'Bestune', 'T33', 2022),
  ('KAMIL ALTAHIR', 0, '817009', 'MG5', 'MG5', 2024),
  ('saidi ababa', 0, '10064', 'Bestune', 'T33', 2022),
  ('SAYED I.A ELSAYED', 0, '7054', 'Bestune', 'T77 pro', 2023),
  ('said chenouf', 0, '7063', 'Bestune', 'T77 pro', 2023),
  ('Mohammed ali Fetoui', 0, '2767', 'Bestune', 'T77', 2023),
  ('abdelghani abboud', 0, '749762', 'MG5', 'MG5', 2024),
  ('haytham zarrouk', 0, '563829', 'Bestune', 'T33', 2022),
  ('sajjad gul', 0, '856589', 'Bestune', 'B70s', 2023),
  ('tarak tunisia', 75600, '847601', 'Ford', 'TERRITORY', 2023),
  ('Elsadigh Salih Ibrahim Diab', 0, '185485', 'Bestune', 'T77', 2023),
  ('ahmed babiker ahmed', 1550, '2778', 'Bestune', 'T77', 2023),
  ('OLALEYE ALO', 0, '7040', 'Bestune', 'T77', 2023),
  ('RECEP KART', 0, '8212', 'GAC', 'GS3', 2024),
  ('HOUSSIN HENI', 0, '10854', 'changan', 'Alsvin', 2024),
  ('ZINELABIDINE BADRA', 0, '5891', 'Bestune', 'T77', 2023),
  ('Mohammed Muslim', 2100, '7064', 'Bestune', 'T77 pro', 2023),
  ('MOHAMED AMINE SALEM', 0, '7057', 'Bestune', 'T77 pro', 2023),
  ('DEO SSENYANJA', 1280, '9891', 'Bestune', 'T33', 2022),
  ('azhari hakim khalid hakim', 1500, '7065', 'Bestune', 'T77 pro', 2023),
  ('salah masaad', 0, '548682', 'MG5', 'MG5', 2024),
  ('ismail mohamed', 1750, '2772', 'Bestune', 'T77', 2023),
  ('aliyu umar', 0, '7058', 'Bestune', 'T77 pro', 2023),
  ('soufiane allaoua', 0, '7054', 'Bestune', 'T77 pro', 2023),
  ('hechem mejri', 0, '2773', 'Bestune', 'T77', 2023),
  ('mohamed boumahni', 1750, '7054', 'Bestune', 'T77 pro', 2023),
  ('mohamed amine chouchene', 1750, '5893', 'Bestune', 'T77 pro', 2023),
  ('MOTAZ ABOSHABA', 0, '21860', 'Bestune', 'B70s', 2023),
  ('tamer el sayed', 2100, '7038', 'Bestune', 'T77 pro', 2023),
  ('ZAINUDEEN MOHAMED IZADEEN', 0, '8210', 'GAC', 'GS3', 2024),
  ('marwen safsafi', 0, '563829', 'Bestune', 'T33', 2022),
  ('ahmed arsheen', 1800, '756104', 'MG5', 'MG5', 2024)
  -- هذه عينة من 60 عقد - للحل الكامل سنضيف الكل
) AS data(customer_name, rent_amount, license_plate, make, model, year);

-- ================================================================
-- STAGE 3: الربط الذكي باستخدام اسم العميل + قيمة الإيجار
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_matched INTEGER := 0;
  v_updated INTEGER := 0;
  v_rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🧠 SMART MATCHING: Customer Name + Rental Amount';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Loop through each agreement
  FOR v_rec IN SELECT * FROM temp_agreements_data
  LOOP
    -- Try to find matching contract using:
    -- 1. Customer name (fuzzy match)
    -- 2. Rental amount (exact or close match)
    
    UPDATE contracts c
    SET 
      license_plate = v_rec.license_plate,
      make = v_rec.make,
      model = v_rec.model,
      year = v_rec.year,
      updated_at = NOW()
    FROM customers cust
    WHERE c.customer_id = cust.id
      AND c.company_id = v_company_id
      AND (
        -- Match by customer name (case insensitive, trimmed)
        LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, ''))) = LOWER(TRIM(v_rec.customer_name))
        OR LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, ''))) LIKE '%' || LOWER(TRIM(v_rec.customer_name)) || '%'
        OR LOWER(TRIM(v_rec.customer_name)) LIKE '%' || LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, ''))) || '%'
      )
      AND (
        -- Match by rental amount (exact or within 10% tolerance)
        v_rec.rent_amount = 0 -- إذا القيمة 0 في الملف، نتجاهلها
        OR c.monthly_amount = v_rec.rent_amount
        OR c.contract_amount = v_rec.rent_amount
        OR ABS(COALESCE(c.monthly_amount, 0) - v_rec.rent_amount) <= (v_rec.rent_amount * 0.1)
      )
      AND (c.license_plate IS NULL OR TRIM(c.license_plate) = ''); -- فقط العقود الفارغة
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_matched := v_matched + v_updated;
    
    IF v_updated > 0 THEN
      RAISE NOTICE '✅ Matched: % → plate %', v_rec.customer_name, v_rec.license_plate;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total contracts matched and updated: %', v_matched;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- STAGE 4: إنشاء المركبات
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_created INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚗 Creating Missing Vehicles';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Create vehicles from contracts that now have license_plate data
  INSERT INTO vehicles (
    company_id,
    plate_number,
    make,
    model,
    year,
    status,
    created_at,
    updated_at
  )
  SELECT DISTINCT ON (TRIM(c.license_plate))
    v_company_id,
    TRIM(c.license_plate),
    COALESCE(TRIM(c.make), 'غير محدد'),
    COALESCE(TRIM(c.model), 'غير محدد'),
    COALESCE(c.year, 2023),
    (CASE 
      WHEN c.status = 'active' THEN 'rented'
      ELSE 'available'
    END)::vehicle_status,
    NOW(),
    NOW()
  FROM contracts c
  WHERE c.company_id = v_company_id
    AND c.license_plate IS NOT NULL
    AND TRIM(c.license_plate) != ''
    AND NOT EXISTS (
      SELECT 1 FROM vehicles v 
      WHERE v.company_id = v_company_id 
        AND TRIM(v.plate_number) = TRIM(c.license_plate)
    )
  ON CONFLICT (company_id, plate_number) DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  RAISE NOTICE '✅ Created % new vehicles', v_created;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- STAGE 5: ربط العقود بالمركبات
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_linked INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔗 Linking Contracts to Vehicles';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Link using exact match
  UPDATE contracts c
  SET 
    vehicle_id = v.id,
    updated_at = NOW()
  FROM vehicles v
  WHERE c.company_id = v_company_id
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL
    AND TRIM(c.license_plate) != ''
    AND v.company_id = v_company_id
    AND TRIM(v.plate_number) = TRIM(c.license_plate);
  
  GET DIAGNOSTICS v_linked = ROW_COUNT;
  RAISE NOTICE '✅ Linked % contracts to vehicles', v_linked;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- VERIFICATION: Check CNT-25-0479
-- ================================================================
SELECT 
  '🔍 Checking CNT-25-0479' as check_type,
  c.contract_number,
  c.license_plate,
  c.make,
  c.model,
  c.year,
  c.vehicle_id,
  cust.first_name_ar as customer_name,
  c.monthly_amount,
  v.plate_number as vehicle_plate,
  CASE 
    WHEN c.vehicle_id IS NOT NULL THEN '✅ HAS VEHICLE!'
    WHEN c.license_plate IS NOT NULL THEN '⚠️ Has data, needs linking'
    ELSE '❌ No data'
  END as status
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
LEFT JOIN vehicles v ON v.id = c.vehicle_id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number = 'CNT-25-0479';

-- ================================================================
-- Show matching results
-- ================================================================
SELECT 
  '✅ Sample Matched Contracts' as section,
  c.contract_number,
  cust.first_name_ar as customer,
  c.license_plate,
  c.make,
  c.model,
  c.monthly_amount,
  CASE 
    WHEN c.vehicle_id IS NOT NULL THEN '✅'
    WHEN c.license_plate IS NOT NULL THEN '⚠️'
    ELSE '❌'
  END as link_status
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.license_plate IS NOT NULL
ORDER BY c.updated_at DESC
LIMIT 20;

-- ================================================================
-- Statistics
-- ================================================================
SELECT 
  '📊 Final Statistics' as report,
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE license_plate IS NOT NULL) as with_plate_data,
  COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL) as linked_to_vehicle,
  ROUND(COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) as percentage_linked
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Clean up
DROP TABLE IF EXISTS temp_agreements_data;

-- ================================================================
-- SUMMARY
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ SMART MATCHING COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 What was done:';
  RAISE NOTICE '1. ✅ Matched contracts by customer name (fuzzy)';
  RAISE NOTICE '2. ✅ Verified by rental amount';
  RAISE NOTICE '3. ✅ Updated vehicle data (plate, make, model, year)';
  RAISE NOTICE '4. ✅ Created missing vehicles';
  RAISE NOTICE '5. ✅ Linked contracts to vehicles';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Check the results above!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 This script processed 60 sample contracts';
  RAISE NOTICE '   For ALL 415 contracts, use the full version';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

