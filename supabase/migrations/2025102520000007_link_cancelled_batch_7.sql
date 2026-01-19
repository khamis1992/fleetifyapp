-- ===============================
-- Link Cancelled Contracts - Batch 7/8
-- Auto-generated from split-migration.js
-- Processing contracts 301 to 350
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
  RAISE NOTICE 'Processing batch 7/8 (50 contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
    ('In2018227', '7078', 'tarak tunisia', '97430200442'),
    ('LTO2024114', '9894', 'tarak hamlet', '97430058936'),
    ('LTO2024317', '11473', 'imed ayari', '97466071051'),
    ('288', '893410', 'AMMAR GHOZY', '97430403800'),
    ('LTO2024262', '7067', 'ADIL ABDELKARIM', '97430108811'),
    ('In2018171', '741277', 'zafar ullah badshah', '97466463832'),
    ('LTO202414', '7034', 'Ghazi Emmad ben meddeb', '97433600885'),
    ('AGR-222397-636', '862165', 'محمد عبد الله سلمان', '97455554627'),
    ('In2018169', '749762', 'RIZWAN BAHADAR', '97470732908'),
    ('In2018170', '746956', 'MUHAMMAD GUL', '97451145953'),
    ('LTO2024271', '10189', 'ahmed elwasila', '97450118063'),
    ('LTO2024312', '4016', 'ahmed ali mawlod abdalla', '97471189859'),
    ('AGR-592533-558', '7041', 'احمد عبدالله محمد', '97470692014'),
    ('LTO202415', '8214', 'Zyed Yahmadi', '97430330103'),
    ('MR202477', '749403', 'shadrack saky', '97455076981'),
    ('AGR-202504-402280', '856715', 'فادي السعيدي', '97466043445'),
    ('LTO202494', '10197', 'KOSAY HAMMAMI', '97477860733'),
    ('AGR-202504-424958', '2766', 'محمد محمد احمد', '97470007983'),
    ('LTO2024113', '893410', 'mokhtar alil', '97477907750'),
    ('LTO2024235', '2773', 'amir ben fredj', '97466172920'),
    ('In2018166', '10669', 'awol ibrahim', '97433102862'),
    ('AGR-202502-0426', '21860', 'محمد العويني', '668168169'),
    ('In2018115', '746956', 'prince boateng', '97471581990'),
    ('MR202489', '754436', 'samuel yeboah', '97455470224'),
    ('MR202482', '10855', 'josef ado', '66929795'),
    ('LTO202443', '8208', 'Mohammad ibrar Abdul hanan', '97470505396'),
    ('MR202479', '10064', 'emmanuel darko', '97471581990'),
    ('LTO2024289', '2769', 'mahmoud jassem alsaleh', '71061952'),
    ('LTO2024237', '8208', 'hany mohamed', '97474498604'),
    ('LTO202437', '676281', 'Hamza BADOU', '97431179706'),
    ('LTO2024244', '856715', 'EIHAB ABDALLA', '97474488904'),
    ('In2018172', '749403', 'sead logomo', '97430228791'),
    ('LTO2024239', '10669', 'mohamed yousif', '97430383077'),
    ('Ret-2018208', '706150', 'snoonu snoonu', '97433211272'),
    ('LTO2024294', '756104', 'ahmed arsheen', '97451066888'),
    ('LTO202454', '856925', 'VARUN KUMAR C CHAUHAN', '97439912483'),
    ('Ret-2018229', '751340', 'snoonu snoonu', '97433211272'),
    ('AGR-202504-423180', '7039', 'عبد الله برهام', '97430945601'),
    ('AGR-202504-422586', '10858', 'قسورة عبد الرحيم', '97471109995'),
    ('LTO2024104', '847932', 'ravi ravi', '97433336834'),
    ('330', '7062', 'yahia sakhri', '97450447989'),
    ('LTO202434', '8204', 'Haq Nawaz Rahim Bakhsh', '97433048081'),
    ('LTO2024335', '7074', 'mahmoud jassem alsaleh', '71061952'),
    ('MR202476', '819027', 'clement gyamerah', '97433418726'),
    ('LTO2024230', '722134', 'hamdi thabet', '97477763707'),
    ('LTO2024134', '7062', 'olusegun onadairo', '97455521186'),
    ('LTO20242', '857045', 'AMARA KHARROUBI', '97430122896'),
    ('AGR-202502-0424', '5891', 'مؤسى حيمر', '71503673'),
    ('LTO2024256', '648144', 'mohamed abdalla', '97470083881'),
    ('LTO202442', '846560', 'WALID CHOURABI', '97431308631');

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
  RAISE NOTICE '========== Batch 7/8 Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
