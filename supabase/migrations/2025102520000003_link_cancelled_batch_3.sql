-- ===============================
-- Link Cancelled Contracts - Batch 3/8
-- Auto-generated from split-migration.js
-- Processing contracts 101 to 150
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
  RAISE NOTICE 'Processing batch 3/8 (50 contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
    ('LTO2024133', '7040', 'OLALEYE ALO', '97477998806'),
    ('LTO2024125', '10172', 'ANWAR MOHAMED', '97470561365'),
    ('Ret-2018198', '521207', 'snoonu snoonu', '97433211272'),
    ('LTO2024107', '848014', 'ravi ravi', '97433336834'),
    ('LTO2024319', '2784', 'ABUOBIDA BABIKER MOHAMED AHMED SIDDIG', '97455653223'),
    ('In2018175', '856878', 'faisal iqbal', '97430158700'),
    ('LTO2024282', '754436', 'SIHEM BEN AHMED', '97430177100'),
    ('LTO2024264', '7058', 'ATEF MANSOUR', '97474446588'),
    ('LTO202497', '846508', 'MAHDI HOSNI', '97430180684'),
    ('LTO2024254', '7062', 'mahmoud hassanein', '97466404489'),
    ('AGR-635810-055', '9902', 'زين العابدين ادريس', '97470897519'),
    ('LTO2024303', '7057', 'jabir desta', '97477069310'),
    ('In2018181', '10853', 'MUHAMMAD GUL', '97451145953'),
    ('LTO2024143', '7043', 'ahmed MASGHOUNI', '97433340971'),
    ('MR2024115', '521207', 'awuah baffour', '97433326932'),
    ('LTO2024268', '856925', 'ATEF MANSOUR', '97474446588'),
    ('AGR-202504-424367', '7040', 'محمد إبراهيم', '97450506797'),
    ('Ret-2018222', '711464', 'snoonu snoonu', '97433211272'),
    ('MR202460', '2768', 'mohamed nawaz', '97455496356'),
    ('LTO2024103', '9255', 'ala eddine hsin', '97477456439'),
    ('LTO2024296', '862165', 'HANENE JELASSI', '97450533032'),
    ('LTO2024330', '21849', 'AHMED BEN DHAOU', '97466607498'),
    ('AGR-954526-295', '2776', 'سيف الدولة عيسى', '97474033341'),
    ('Ret-2018129', '721440', 'mohamed shikh', '97470075026'),
    ('AGR-202502-0416', '2778', 'يوسف سقام', '33721869'),
    ('LTO2024242', '5898', 'nabil fargalla', '97431184659'),
    ('LTO2024106', '847987', 'ravi ravi', '97433336834'),
    ('In2018176', '10664', 'emmanuel darko', '97471581990'),
    ('Ret-2018209', '746956', 'snoonu snoonu', '97433211272'),
    ('LTO202432', '5891', 'ZINELABIDINE BADRA', '97431207465'),
    ('LTO2024145', '5900', 'ABDULRAHMAN ALGHAIATHI', '97455771800'),
    ('In2018224', '9905', 'faisal iqbal', '97430158700'),
    ('LTO202436', '7064', 'Mohammed Muslim', '97455958782'),
    ('Ret-2018215', '7053', 'snoonu snoonu', '97433211272'),
    ('MR202474', '10176', 'zied fares', '97450115847'),
    ('LTO2024261', '7072', 'YOUSSEF KHALILI', '97472119703'),
    ('MR202466', '10174', 'hosni maatallah', '97470059300'),
    ('LTO202458', '7074', 'MONCEF SAIBI', '97433784834'),
    ('Ret-2018202', '8207', 'snoonu snoonu', '97433211272'),
    ('MR2024122', '10851', 'SOUFIANE BESSAOUDI', '97450792055'),
    ('MR2024302', '749762', 'saeed al-hebabi', '97433333971'),
    ('Ret-2018195', '2770', 'snoonu snoonu', '97433211272'),
    ('LTO20247', '185513', 'Elsadigh Salih Ibrahim Diab', '97470075544'),
    ('LTO2024155', '7054', 'oussama` bouguerra', '97470209653'),
    ('AGR-202504-414676', '856878', 'مؤمن علي سعيد', '97474024205'),
    ('LTO2024105', '847941', 'ravi ravi', '97433336834'),
    ('LTO2024156', '5899', 'ahmed babker', '97433081277'),
    ('LTO202421', '2777', 'Suman Kumar shah', '97471302739'),
    ('LTO2024278', '751340', 'MOURAD BARHOUMI', '97430566445'),
    ('LTO2024304', '646507', 'achraf saadaoui', '97455165658');

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
  RAISE NOTICE '========== Batch 3/8 Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
