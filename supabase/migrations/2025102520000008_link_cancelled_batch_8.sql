-- ===============================
-- Link Cancelled Contracts - Batch 8/8
-- Auto-generated from split-migration.js
-- Processing contracts 351 to 392
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
  RAISE NOTICE 'Processing batch 8/8 (42 contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
    ('LTO202431', '7061', 'Abdulhanna abulhashem', '97455222976'),
    ('LTO2024116', '5898', 'ALI ABBAS', '97450405018'),
    ('LTO2024290', '906077', 'saddam el falah', '97455031297'),
    ('Ret-2018207', '893410', 'snoonu snoonu', '97433211272'),
    ('LTO2024150', '8204', 'HABIB KHELIFI', '97466205223'),
    ('LTO2024306', '862169', 'tarek boutemedjet', '97455039533'),
    ('In2018173', '570468', 'mubarek golcha', '97470539031'),
    ('LTO2024298', '754436', 'kaies ayari', '97430109102'),
    ('AGR-202504-421408', '2771', 'ماهر مهيري', '97470220390'),
    ('Ret-2018191', '2781', 'snoonu snoonu', '97433211272'),
    ('MR202484', '816508', 'foster ngo', '97430637515'),
    ('LTO2024238', '817009', 'hamze hussein', '97471348615'),
    ('AGR-950558-871', '9902', 'زين العابدين ادريس', '97470897519'),
    ('LTO2024308', '10064', 'wassim chatmen', '97433226604'),
    ('LTO2024325', '711289', 'mohamed ahmed', '97455304449'),
    ('LTO20243', '21849', 'MEDHAT BAKRY', '97433766022'),
    ('LTO202452', '9999', 'KHALIL CHMENGUI', '97460099391'),
    ('MR202472', '7056', 'almunzer ali', '97430529501'),
    ('In2018157', '10858', 'prince boateng', '97471581990'),
    ('LTO2024250', '7078', 'ABUELMAALI ISMAIL', '97466981255'),
    ('LTO202420', '7066', 'Awad el karim Abdelmonim', '97466947604'),
    ('Ret-2018211', '721440', 'snoonu snoonu', '97433211272'),
    ('MR2024121', '10854', 'Sofiene Ben salah', '97450770260'),
    ('LTO2024283', '862165', 'fatima akka', '97471202018'),
    ('MR2024110', '7057', 'riaz khan', '97430692099'),
    ('LTO202444', '7072', 'Saif ur rehman mohammad Ramzan', '97431466795'),
    ('LTO2024311', '4016', 'mohamed hassen omer mohamed', '97450131342'),
    ('Ret-2018183', '2782', 'snoonu snoonu', '97433211272'),
    ('LTO202499', '7035', 'HICHEM ABDERAHIM', '97433787589'),
    ('LTO2024101', '7076', 'issam hamdani', '97430666450'),
    ('LTO2024142', '7035', 'MOJEEB AMIN', '97477909052'),
    ('LTO202425', '557098', 'ANOUER MATHLOUTHI', '97430532292'),
    ('LTO2024260', '751340', 'MOHAMED KAMEL OSMAN ABDALLA', 'nan'),
    ('Ret-2018188', '10666', 'snoonu snoonu', '97433211272'),
    ('AGR-302522-016', '7057', 'بسام فتحي اللوز', '97470882208'),
    ('LTO2024177', '5888', 'atef sghairi', '97477024940'),
    ('AGR-202504-404457', '2775', 'أنور جنبيني', '97451476442'),
    ('MR202471', '7041', 'abdul basit khan', '97431492385'),
    ('LTO2024281', '21860', 'saeed al-hebabi', '97433333971'),
    ('LTO2024255', '10672', 'ganga chaudhary', '97477179042'),
    ('LTO202456', '21875', 'SAID HILALI', '97466653585'),
    ('Ret-2018186', '10171', 'snoonu snoonu', '97433211272');

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
  RAISE NOTICE '========== Batch 8/8 Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
