-- ===============================
-- Link Cancelled Contracts - Batch 2/8
-- Auto-generated from split-migration.js
-- Processing contracts 51 to 100
-- ===============================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_data RECORD;
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
  v_updated_contracts INTEGER := 0;
  v_created_customers INTEGER := 0;
  v_updated_customers INTEGER := 0;
  v_skipped_no_vehicle INTEGER := 0;
  v_skipped_no_contract INTEGER := 0;
BEGIN
  RAISE NOTICE 'Processing batch 2/8 (50 contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
    ('MR202470', '7062', 'imran farhad', '97477292398'),
    ('LTO20245', '8210', 'ZAINUDEEN MOHAMED IZADEEN', '97455020544'),
    ('LTO2024299', '563829', 'marwen safsafi', '97471886388'),
    ('AGR-202504-417240', '10671', 'ياسر الصادق القاسم', '97455990635'),
    ('AGR-202502-0418', '10174', 'كبيروم العرجاوي ولدكيدان', '30796407'),
    ('MR2024146', '10064', 'saidi ababa', '97455945485'),
    ('LTO202441', '7054', 'SAYED I.A ELSAYED', '97455058031'),
    ('LTO2024321', '10664', 'mounir lechelache', '97470883509'),
    ('AGR-202504-409871', '7054', 'محمد جاسم صالح', '97466684460'),
    ('LTO202495', '862169', 'OSAMA GRESS', '70381387'),
    ('LTO2024119', '21860', 'MOTAZ ABOSHABA', '97439932355'),
    ('MR202475', '7038', 'tamer el sayed', '97430067536'),
    ('LTO20246', '185485', 'Elsadigh Salih Ibrahim Diab', '97470075544'),
    ('LTO2024287', '2778', 'ahmed babiker ahmed', '97430933229'),
    ('AGR-202504-417839', '7042', 'إبراهيم يعقوب', '97430882244'),
    ('AGR-202504-420819', '8208', 'عصام احمداحمد', '97466276263'),
    ('LTO202438', '9902', 'ALI SALIM MZITA', '97455089148'),
    ('LTO2024240', '7058', 'aliyu umar', '97466424774'),
    ('LTO2024144', '7054', 'soufiane allaoua', '97466197941'),
    ('LTO2024128', '754705', 'tarek rahali', '97430762577'),
    ('LTO2024314', '5893', 'mohamed amine chouchene', '97431435988'),
    ('Ret-2018187', '7063', 'snoonu snoonu', '97433211272'),
    ('AGR-202504-398252', '21860', 'محمد العويني', '668168169'),
    ('LTO2024324', '10849', 'elthagafi awad elseed ,ohamed hamid', '97433285933'),
    ('LTO2024276', '8209', 'saeed al-hebabi', '97433333971'),
    ('LTO2024279', '817009', 'AHMED BEN DHAOU', '97466607498'),
    ('AGR-202504-407328', '7034', 'عمار الشيخ', '97433386066'),
    ('LTO202412', '8212', 'RECEP KART', '97474462697'),
    ('LTO202435', '10854', 'HOUSSIN HENI', '97433111067'),
    ('LTO202447', '752724', 'Mohamed Hathroubi', '97470713088'),
    ('MR202461', '10667', 'mohamed shikh', '97470075026'),
    ('LTO202449', '862165', 'AHMED ABBAS ELDAWO ELHASHMI', '97470476000'),
    ('LTO202439', '8207', 'HAMZA ZIDI', '97466440580'),
    ('AGR-202504-412862', '185573', 'إيهاب عبد الله', '97431009664'),
    ('LTO2024291', '381247', 'abdulla al-shahri', '97433933920'),
    ('AGR-202504-419022', '856589', 'يحيى عبد الرحمان', '97430757943'),
    ('LTO2024151', '2783', 'chrisus arinaitwe', '97474459955'),
    ('AGR-202504-416046', '8209', 'هشام عبد العظيم', '97431009664'),
    ('LTO2024266', '5900', 'mohamed abdalla', '97470083881'),
    ('LTO2024148', '2773', 'hechem mejri', '97470209573'),
    ('251', '7054', 'mohamed boumahni', '97470890200'),
    ('LTO2024300', '7058', 'mohamed amine chouchene', '97431435988'),
    ('LTO202445', '847059', 'Badredine Khalfi', '97477754754'),
    ('MR202467', '10670', 'omer omer', '97450575500'),
    ('LTO202457', '5898', 'Mukhtar Ali Anayat UR RAHMAN', '97477884251'),
    ('LTO202410', '17216', 'ABDELAZIZ JERFEL', '97433767961'),
    ('LTO2024284', '7069', 'ISSAM MZOUGHI', '97474700503'),
    ('Ret-2018206', '856715', 'snoonu snoonu', '97433211272'),
    ('LTO2024153', '335485', 'AHMED AKKAR', '97433326546'),
    ('LTO20244', '5901', 'HOSSEM DHAHRI', '97471375054');

  FOR v_contract_data IN
    SELECT DISTINCT contract_number, plate, customer_name, phone
    FROM temp_contract_data
  LOOP
    -- Find vehicle by plate number
    SELECT id INTO v_vehicle_id FROM vehicles
    WHERE plate_number = v_contract_data.plate AND company_id = v_company_id LIMIT 1;

    IF v_vehicle_id IS NULL THEN
      RAISE NOTICE '⚠️  Vehicle not found for plate: %', v_contract_data.plate;
      v_skipped_no_vehicle := v_skipped_no_vehicle + 1;
      CONTINUE;
    END IF;

    -- Find or create customer
    SELECT id INTO v_customer_id FROM customers
    WHERE phone = v_contract_data.phone AND company_id = v_company_id LIMIT 1;

    IF v_customer_id IS NULL THEN
      BEGIN
        -- Create new customer with auto-incrementing code
        WITH next_code AS (
          SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
          FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
        )
        INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
        SELECT v_company_id, 'individual', v_contract_data.customer_name, v_contract_data.phone,
               'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
        FROM next_code RETURNING id INTO v_customer_id;

        v_created_customers := v_created_customers + 1;
        RAISE NOTICE '✅ Created customer: % (Phone: %)', v_contract_data.customer_name, v_contract_data.phone;
      EXCEPTION WHEN unique_violation THEN
        -- Handle race condition - another batch may have created the customer
        SELECT id INTO v_customer_id FROM customers WHERE phone = v_contract_data.phone AND company_id = v_company_id LIMIT 1;
        RAISE NOTICE '📝 Customer already exists (Phone: %)', v_contract_data.phone;
      END;
    ELSE
      -- Update existing customer name
      UPDATE customers SET first_name = v_contract_data.customer_name, updated_at = NOW() WHERE id = v_customer_id;
      v_updated_customers := v_updated_customers + 1;
    END IF;

    -- Find and update contract
    SELECT id INTO v_contract_id FROM contracts
    WHERE contract_number = v_contract_data.contract_number AND company_id = v_company_id
    AND status IN ('cancelled', 'under_review') LIMIT 1;

    IF v_contract_id IS NOT NULL THEN
      UPDATE contracts SET
        vehicle_id = v_vehicle_id,
        customer_id = v_customer_id,
        license_plate = v_contract_data.plate,
        updated_at = NOW()
      WHERE id = v_contract_id;

      v_updated_contracts := v_updated_contracts + 1;

      -- Update vehicle status to available
      UPDATE vehicles SET status = 'available', updated_at = NOW()
      WHERE id = v_vehicle_id AND status != 'rented';

      RAISE NOTICE '✅ Linked contract: % → Vehicle: % (Plate: %) → Customer: %',
        v_contract_data.contract_number, v_vehicle_id, v_contract_data.plate, v_customer_id;
    ELSE
      RAISE NOTICE '⚠️  Contract not found or wrong status: %', v_contract_data.contract_number;
      v_skipped_no_contract := v_skipped_no_contract + 1;
    END IF;
  END LOOP;

  DROP TABLE temp_contract_data;

  RAISE NOTICE '';
  RAISE NOTICE '========== Batch 2/8 Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
