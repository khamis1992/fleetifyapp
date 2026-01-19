-- ===============================
-- Link Cancelled Contracts - Batch 4/8
-- Auto-generated from split-migration.js
-- Processing contracts 151 to 200
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
  RAISE NOTICE 'Processing batch 4/8 (50 contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
    ('LTO2024263', '7053', 'MAHDI HAMID', '97430138501'),
    ('LTO2024149', '7037', 'mokhtar alil', '97477907750'),
    ('In2018159', '10854', 'awuah baffour', '97433326932'),
    ('LTO2024251', '10174', 'KIBROM AREGAWI WELDEKIDAN', '97430796407'),
    ('LTO202448', '8206', 'Abdemoniem ismail mahmoud Mohamed', '97477884170'),
    ('Ret-2018204', '7073', 'snoonu snoonu', '97433211272'),
    ('LTO2024265', '856878', 'GIRISHKUMAR KARTHIKEYAN', '97433389695'),
    ('LTO2024248', '2772', 'ismail mohamed', '97430400511'),
    ('AGR-055405-212', '7063', 'مهند حمود الظاهر', '97430623322'),
    ('LTO2024270', '10197', 'ahmed elwasila', '97450118063'),
    ('MR202498', '10189', 'MOHAMED AMINE SALEM', '97471105390'),
    ('Ret-2018205', '7039', 'snoonu snoonu', '97433211272'),
    ('MR202483', '751340', 'prince nkansah', '50131833'),
    ('In2018160', '10668', 'shadrack saky', '97455076981'),
    ('LTO202491', '893411', 'radhwan mdini', '97430004696'),
    ('Ret-2018217', '381247', 'snoonu snoonu', '97433211272'),
    ('LTO2024297', '556199', 'yosr chamkhi', '97431008858'),
    ('MR2024232', '10669', 'ABDELJALIL HATTACH', '97450623375'),
    ('MR2024102', '821873', 'OASIM HALDER', '97450088482'),
    ('LTO2024140', '5895', 'amir ben fredj', '97466172920'),
    ('LTO2024320', '5894', 'mohammed houssem dib', '97472034609'),
    ('AGR-202504-403859', '2779', 'مختار عليل', '97477227716'),
    ('LTO2024247', '548682', 'QFORCE SECURITY SERVICE', '97450446192'),
    ('AGR-810033-532', '8205', 'dtrgfgdfg', '2345654'),
    ('308', '381247', 'mustafa almustafa', '97470555993'),
    ('Ret-2018216', '648144', 'snoonu snoonu', '97433211272'),
    ('LTO2024315', '739649', 'mohamed ncibi', '97466918182'),
    ('AGR-463481-549', '4014', 'محمد علي سليم', '97430797703'),
    ('LTO2024138', '7040', 'RAFIK BELKACEM', '31215469'),
    ('LTO202455', '10856', 'AYMEN NASRA', '97450171785'),
    ('AGR-202504-418432', '5891', 'موسى حيمر', '97471503673'),
    ('LTO2024243', '9999', 'mohamed elnakhli', '97433781937'),
    ('MR202468', '7039', 'abrar zaib', '97439989880'),
    ('LTO202492', '722134', 'mouheb ouni', '97430059056'),
    ('LTO2024285', '857051', 'CHIHEB HEDHLI', '97430586471'),
    ('LTO2024293', '2774', 'saber dhibi', '97451076544'),
    ('LTO2024338', '2779', 'ahmed abdalla mahmoud abdalla mahmoud abdalla', '97466230309'),
    ('LTO2024118', '9891', 'DEO SSENYANJA', '97455984233'),
    ('LTO2024342', '7065', 'azhari hakim khalid hakim', '9745578515'),
    ('LTO2024147', '548682', 'salah masaad', '97466104053'),
    ('Ret-2018225', '893409', 'snoonu snoonu', '97433211272'),
    ('Ret-2018228', '725473', 'snoonu snoonu', '97433211272'),
    ('MR2024236', '2770', 'syed jan', '97471027960'),
    ('AGR-202504-411671', '5894', 'عبد اللله العلواني', '97470897519'),
    ('Ret-2018221', '822389', 'snoonu snoonu', '97433211272'),
    ('LTO2024326', '8208', 'MOHAMMAD ADNAN SWAID', '97431103801'),
    ('In2018167', '10850', 'MOHAMMED ULLAH', '97477579524'),
    ('AGR-202504-403263', '21849', 'فادي السعيدي', '97466043445'),
    ('LTO2024333', '10664', 'achraf saadaoui', '97455165658'),
    ('LTO20248', '846485', 'HOSSEM DHAHRI 2', '97431115657');

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
  RAISE NOTICE '========== Batch 4/8 Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
