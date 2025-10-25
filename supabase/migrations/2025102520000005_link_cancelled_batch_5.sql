-- ===============================
-- Link Cancelled Contracts - Batch 5/8
-- Auto-generated from split-migration.js
-- Processing contracts 201 to 250
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
  RAISE NOTICE 'Processing batch 5/8 (50 contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
    ('MR202463', '570468', 'abdelkader abdelkader', '97471108770'),
    ('Ret-2018213', '646507', 'snoonu snoonu', '97433211272'),
    ('LTO2024305', '7041', 'mohamed ahmed', '97455304449'),
    ('Ret-201896', '739649', 'abduaziz almhauod', '70598989'),
    ('Ret-2018212', '11473', 'snoonu snoonu', '97433211272'),
    ('Ret-2018196', '7072', 'snoonu snoonu', '97433211272'),
    ('LTO2024273', '10665', 'AHMED EDRISS', '97477013644'),
    ('AGR-202504-410464', '2774', 'هاني براهمي', '97466521616'),
    ('LTO202418', '7075', 'Mohammad Haitham ettahar elhaddi mohamad', '97450446192'),
    ('LTO202446', '2776', 'Salih abdullah mohamed Ahmad', '97455339605'),
    ('MR2024274', '2766', 'walid hassan', '97477439393'),
    ('AGR-202502-0422', '2767', 'عبدالغفور درار', '77122519'),
    ('Ret-2018193', '556199', 'snoonu snoonu', '97433211272'),
    ('Ret-2018190', '7067', 'snoonu snoonu', '97433211272'),
    ('LTO2024124', '847099', 'AMIR EL MAHDI', '97433734751'),
    ('LTO2024257', '9905', 'ahmed elwasila', '97450118063'),
    ('LTO2024136', '7041', 'alaeddine dabech', '97471146699'),
    ('LTO2024331', '751340', 'mohamed ncibi', '97466918182'),
    ('In2018180', '749403', 'SAIF ramzan', '97431466795'),
    ('In2018161', '10666', 'emmanuel darko', '97471581990'),
    ('LTO2024295', '856589', 'sabri mbarki', '97455133110'),
    ('AGR-202504-397268', '2778', 'يوسف سقام', '33721869'),
    ('AGR-202504-400949', '10668', 'عبد المنعم', '97470184904'),
    ('LTO2024135', '5897', 'ABDALLA ABDALLA', '97433079976'),
    ('LTO2024334', '7063', 'hakim kouas', '97466230309'),
    ('MR2024123', '10858', 'DEO SSENYANJA', '97455984233'),
    ('LTO2024327', '2770', 'tarek boutemedjet', '97455039533'),
    ('LTO2024258', '2783', 'ABDELLATIF ELHADAD', '97477710585'),
    ('319', '7058', 'MOHAMED CHOUCHENE', '97455146823'),
    ('LTO2024269', '648144', 'muhammad mahmood', '97470715743'),
    ('Ret-2018203', '2777', 'snoonu snoonu', '97433211272'),
    ('LTO2024340', '5890', 'ABDELAZIZ JERFEL', '97433767961'),
    ('LTO202459', '2780', 'Yassine Serhani', '97474778109'),
    ('AGR-202504-405141', '8212', 'حسن محمد الفكي', '97450055884'),
    ('LTO2024301', '821873', 'ahmed ali mohamed bakhit', '97477160274'),
    ('LTO202430', '8205', 'Hamza Serunga', '97450795709'),
    ('LTO2024272', '7074', 'tarek rahali', '97430762577'),
    ('Ret-2018214', '335750', 'snoonu snoonu', '97433211272'),
    ('LTO2024267', '8208', 'hamze hussein', '97471348615'),
    ('AGR-202504-413489', '7056', 'علم الدين جمعة', '97466188278'),
    ('LTO2024323', '754436', 'hakim kouas', '97466230309'),
    ('LTO2024309', '821873', 'ahmed MASGHOUNI', '97433340971'),
    ('LTO2024313', '9905', 'marwen safsafi', '97471886388'),
    ('247', '8207', 'MOHAMMED ABDALLAH', '97450200224'),
    ('LTO2024232', '8212', 'ABDUL AZIZ WAIGA', '97433347242'),
    ('LTO202417', '8213', 'Abdelrahim Mohamed', '97431310330'),
    ('Ret-2018192', '2769', 'snoonu snoonu', '97433211272'),
    ('LTO2024115', '7068', 'YASSER SOLIMAN', '97477354490'),
    ('AGR-202504-415263', '893409', 'عبد الصمد بن عزوز', '97433478097'),
    ('LTO2024292', '721894', 'mahamoud maan dabboussi', '97450869246');

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
  RAISE NOTICE '========== Batch 5/8 Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
