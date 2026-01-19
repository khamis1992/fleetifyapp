-- ===============================
-- Link Cancelled Contracts - Batch 6/8
-- Auto-generated from split-migration.js
-- Processing contracts 251 to 300
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
  RAISE NOTICE 'Processing batch 6/8 (50 contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
    ('LTO202413', '721894', 'HAMIDA BOUZIANE', '97470053425'),
    ('AGR-202504-419607', '556199', 'سفيان صالح', '97450770260'),
    ('MR202462', '7042', 'osmane mohamed', '97450628032'),
    ('LTO2024178', '817009', 'KAMIL ALTAHIR', '97470294015'),
    ('AGR-202504-409278', '7059', 'عمر مراىحي', '97431299557'),
    ('LTO202424', '2774', 'mokhtar alil', '97477907750'),
    ('LTO2024280', '7043', 'HAMZA YANES', '97455260218'),
    ('LTO202451', '5896', 'ABDELJALIL HATTACH', '97450623375'),
    ('Ret-2018226', '185573', 'snoonu snoonu', '97433211272'),
    ('AGR-202504-416649', '8213', 'مصطفى  ساتي', '97471826567'),
    ('LTO2024132', '2779', 'AYMEN NASRA', '97450171785'),
    ('LTO2024253', '725473', 'mohammed awad', '97450325578'),
    ('LTO2024337', '2769', 'waddah elobaid', '97471953163'),
    ('LTO2024233', '893411', 'radhwan mdini', '97430004696'),
    ('In2018182', '754436', 'sead logomo', '97430228791'),
    ('MR202486', '335485', 'richard asiedu', '66906353'),
    ('LTO2024112', '5894', 'ahmad salah', '97431003131'),
    ('LTO2024120', '2769', 'baligh ben amor', '97433418142'),
    ('LTO202450', '7077', 'ADAM SALIH G. MOHAMED', '97450066411'),
    ('AGR-283909-351', '756104', 'يحيى احمد عبدالرحمن', '97430757943'),
    ('LTO202423', '7058', 'Sofiene Ben salah', '97450770260'),
    ('Ret-2018194', '5894', 'snoonu snoonu', '97433211272'),
    ('LTO202433', '8203', 'Mouheb Gandouzi', '97451201321'),
    ('LTO2024246', '335750', 'QFORCE SECURITY SERVICE', '97450446192'),
    ('In2018168', '10849', 'aurangzeb din', '97430654309'),
    ('LTO2024109', '9890', 'Abdelrahim Mohamed', '97431310330'),
    ('LTO2024111', '5899', 'mohammad ismail', '97477572739'),
    ('MR202469', '5893', 'ameer zaib', '97455631990'),
    ('AGR-202502-0430', '856718', 'حسان بو علاق', '66553638'),
    ('LTO202440', '7070', 'MUHAMMAD S.M.M KHALIFA', '97430811517'),
    ('338', '2777', 'mohanad aldaher', '97430623322'),
    ('In2018158', '10855', 'lukman dramani', '97433963041'),
    ('LTO202419', '7069', 'Mazyad Saab', '97470099200'),
    ('AGR-202504-411066', '2768', 'عبد العزيز علي', '97470342655'),
    ('LTO2024332', '2778', 'ABDELAZIZ JERFEL', '97433767961'),
    ('139', '5893', 'omar hmem', '97459993757'),
    ('AGR-202504-407921', '2773', 'يوسف قابل', '97471155135'),
    ('AGR-202502-0420', '7038', 'ثامر محمد ', '30067536'),
    ('Ret-2018197', '7071', 'snoonu snoonu', '97433211272'),
    ('Ret-2018201', '2768', 'snoonu snoonu', '97433211272'),
    ('LTO2024117', '5890', 'mohamed noomani', '97470301442'),
    ('LTO2024277', '185573', 'emad bhagil', '97459920777'),
    ('AGR-202504-406726', '5896', 'مختارالامين', '97450129848'),
    ('LTO202416', '4018', 'Abdelrahim Mohamed', '97431310330'),
    ('MR202488', '7065', 'lukman dramani', '97433963041'),
    ('LTO2024245', '7056', 'MOHAMED AHMED', '97433374204'),
    ('MR202465', '7043', 'amjid wadan', '97466265370'),
    ('LTO2024152', '857051', 'HANY HUSHAM', '97477660012'),
    ('AGR-047661-681', '2773', 'مجدي بخيت', '97450246458'),
    ('AGR-202504-420218', '4016', 'سامي عبد الله', '97430534902');

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
  RAISE NOTICE '========== Batch 6/8 Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
