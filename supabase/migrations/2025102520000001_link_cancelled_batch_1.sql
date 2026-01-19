-- ===============================
-- Link Cancelled Contracts - Batch 1/8
-- Auto-generated from split-migration.js
-- Processing contracts 1 to 50
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
  RAISE NOTICE 'Processing batch 1/8 (50 contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
    ('LTO2024139', '7036', 'issam abdallah', '97430777645'),
    ('LTO20249', '749762', 'MEHRAN TABIB TABIB HUSSAIN', '97433648377'),
    ('Ret-2018184', '711464', 'snoonu snoonu', '97433211272'),
    ('LTO202453', '7071', 'AHMED BEN DHAOU', '97466607498'),
    ('MR2024182', '7078', 'haythem souissi', '97471310005'),
    ('Ret-2018200', '2774', 'snoonu snoonu', '97433211272'),
    ('LTO2024141', '7060', 'bannour rekaia', '97430743344'),
    ('LTO202422', '2771', 'AHMED ABBAS ELDAWO ELHASHMI', '97470476000'),
    ('MR202481', '10853', 'frank williams', '97430488852'),
    ('LTO2024339', '706150', 'marwen safsafi', '97471886388'),
    ('276', '706150', 'hassan sharif', '97430033188'),
    ('MR2024155', '749762', 'abdelghani abboud', '97430504430'),
    ('AGR-202504-412264', '381247', 'احمد جمعة', '97430060107'),
    ('LTO2024322', '7063', 'said chenouf', '97455992530'),
    ('LTO202429', '2767', 'Mohammed ali Fetoui', '97433779853'),
    ('MR202473', '754705', 'faisal iqbal', '97430158700'),
    ('Ret-2018189', '2772', 'snoonu snoonu', '97433211272'),
    ('MR202464', '7078', 'shahid rehman', '97466050616'),
    ('LTO2024108', '856589', 'sajjad gul', '97430092501'),
    ('AGR-202504-408522', '2767', 'عبد الغفور درار', '97477122519'),
    ('MR2024181', '7057', 'MOHAMED AMINE SALEM', '97471105390'),
    ('LTO202490', '563829', 'haytham zarrouk', '97466406305'),
    ('Ret-2018185', '893408', 'snoonu snoonu', '97433211272'),
    ('LTO2024310', '8203', 'kaies ayari', '97430109102'),
    ('Ret-2018220', '10174', 'snoonu snoonu', '97433211272'),
    ('Ret-2018219', '9902', 'snoonu snoonu', '97433211272'),
    ('AGR-202504-399591', '2782', 'شرفي عبد الله', '97477517797'),
    ('LTO202428', '4017', 'SOUFIANE BESSAOUDI', '97450792055'),
    ('AGR-938047-996', '862165', 'محمد عبد الله سلمان', '97455554627'),
    ('LTO202427', '5889', 'AYMEN HAMADI', '97430305808'),
    ('Ret-2018223', '646507', 'snoonu snoonu', '97433211272'),
    ('LTO2024100', '847601', 'tarak tunisia', '97430200442'),
    ('LTO202426', '4016', 'Nacer Lahcene', '97455064714'),
    ('LTO2024252', '721440', 'mahdi yousif', '97433670129'),
    ('Ret-2018218', '10189', 'snoonu snoonu', '97433211272'),
    ('LTO2024316', '749762', 'yahia sakhri', '97450447989'),
    ('In201893', '761292', 'abdelazim pro', '97433344021'),
    ('MR202485', '10849', 'raphael denu', '97430316583'),
    ('LTO2024341', '7036', 'issam abdallah', '97430777645'),
    ('LTO2024130', '7056', 'EIHAB ABDALLA', '97474488904'),
    ('LTO2024126', '8209', 'MAMOUN AHMED', '97430034843'),
    ('AGR-202504-421999', '10853', 'عبد الحميد عترون', '97450643428'),
    ('LTO202411', '4014', 'MUHAMMAD ALI KHALID', '97450584650'),
    ('Ret-2018210', '816508', 'snoonu snoonu', '97433211272'),
    ('LTO2024288', '2634', 'ahmed fadil', '97455935204'),
    ('AGR-202504-414082', '10851', 'اسلام عثمان محمدين', '97455025546'),
    ('MR202487', '741277', 'eric naiko', '97430636173'),
    ('Ret-2018199', '856878', 'snoonu snoonu', '97433211272'),
    ('MR2024234', '9902', 'MOHAMED AMINE SALEM', '97471105390'),
    ('AGR-202504-406129', '856718', 'حسان بو علاق', '66553638');

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
  RAISE NOTICE '========== Batch 1/8 Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
