-- ================================================================
-- MIGRATION: Import Vehicle Data for Al-Arraf Contracts
-- ================================================================
-- هذه Migration تستورد بيانات المركبات من agreements_with_details.sql
-- إلى جدول contracts
-- ================================================================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_updated INTEGER := 0;
  v_total INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚗 IMPORTING VEHICLE DATA FOR AL-ARRAF CONTRACTS';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Create a CTE with all the vehicle data from agreements_with_details.sql
  -- Then update contracts in bulk
  WITH vehicle_data AS (
    SELECT * FROM (VALUES
      ('0061e679-46c2-4e79-9a03-be54a013ef2b'::UUID, '7036', 'Bestune', 'T77 pro', 2023),
      ('019257a4-3eef-4506-b3c3-1f46d6f07921'::UUID, '749762', 'MG5', 'MG5', 2024),
      ('01d6bb7c-64c6-48ff-8b96-bd2ea10aad52'::UUID, '711464', 'Bestune', 'B70', 2023),
      ('0304ca70-5990-47e9-8b77-4f52dddf652c'::UUID, '7071', 'Bestune', 'T77 pro', 2023),
      ('038eb503-9b42-4102-9517-bf48e2b14771'::UUID, '7078', 'Bestune', 'T77 pro', 2023),
      ('04014c11-f032-4529-a00f-464d5b76014c'::UUID, '2774', 'Bestune', 'T77', 2023),
      ('061980c8-b43b-42fb-888c-560a2e1fe788'::UUID, '7060', 'Bestune', 'T77 pro', 2023),
      ('06a99606-1514-4051-a1d8-42777d3b79dd'::UUID, '2771', 'Bestune', 'T77', 2023),
      ('073fef4a-4d07-4dc9-b24a-d519bcaed696'::UUID, '10853', 'changan', 'Alsvin', 2024),
      ('07d9e08d-e9f1-4087-bb97-8e66fbc6f86d'::UUID, '706150', 'Bestune', 'B70', 2023),
      ('09d81ab4-d511-4144-8fde-8fc2de6c7bc2'::UUID, '706150', 'Bestune', 'B70', 2023),
      ('0ac0bc98-f6d6-4d15-bfc8-bb96263bf018'::UUID, '749762', 'MG5', 'MG5', 2024),
      ('0c6de023-cb2f-4d1e-ab2b-ca64be825f9d'::UUID, '381247', 'Bestune', 'B70', 2023),
      ('0cd4194a-e72e-4a53-b2f0-c99898e5d161'::UUID, '7063', 'Bestune', 'T77 pro', 2023),
      ('0cf76e56-1e7f-425e-8e0b-b41c77ebcdf7'::UUID, '2767', 'Bestune', 'T77', 2023),
      ('0eddc6c3-f1e1-49f8-a7b3-65c636bf3bfe'::UUID, '754705', 'MG5', 'MG5', 2024),
      ('0efc43da-7edd-49b2-8d0b-45cef9349478'::UUID, '2772', 'Bestune', 'T77', 2023),
      ('10322b6c-c03e-457e-aec8-27a19d19b8a6'::UUID, '7078', 'Bestune', 'T77 pro', 2023),
      ('104d645a-2168-40d8-9d3a-661fa1adde91'::UUID, '856589', 'Bestune', 'B70s', 2023),
      ('10736280-f100-45b9-b24a-67d7d4697f84'::UUID, '2767', 'Bestune', 'T77', 2023),
      ('10ee2d43-8951-42f8-89a3-1fc223b6e214'::UUID, '7057', 'Bestune', 'T77 pro', 2023),
      ('11a30bad-8f67-41b2-8c51-c935a1ed6afc'::UUID, '563829', 'Bestune', 'T33', 2022),
      ('12b28467-42d1-42d0-8f28-ce0600c9d0f3'::UUID, '893408', 'Bestune', 'B70', 2023),
      ('1526e3a7-bcdd-4e23-a679-24dd60456c34'::UUID, '8203', 'GAC', 'GS3', 2024),
      ('15b2ed2c-379d-4faf-a7ea-9c80923430ea'::UUID, '10174', 'Bestune', 'T33', 2022),
      ('15e50134-a030-42ef-96e4-66394ca689e5'::UUID, '9902', 'Bestune', 'T33', 2022),
      ('1667c0a0-0555-4a4e-a452-c53ecffcee68'::UUID, '2782', 'Bestune', 'T77', 2023),
      ('16decf31-2c5d-4a32-840e-f616fc71e246'::UUID, '4017', 'GAC', 'GS3', 2024),
      ('175f7dc3-624c-477c-be89-d1ce823492cc'::UUID, '862165', 'Bestune', 'T33', 2022),
      ('17786faa-4f78-4be0-bf5a-c0d4f7e3ff0b'::UUID, '5889', 'Bestune', 'T77', 2023),
      ('18984570-4531-47bb-b9ac-11387f93c4de'::UUID, '646507', 'Bestune', 'B70', 2023),
      ('191842fe-38e8-48e7-82b2-f6a528069462'::UUID, '847601', 'Ford', 'TERRITORY', 2023),
      ('19865f35-f1f0-4bdd-9c34-1c6b993be1b3'::UUID, '4016', 'GAC', 'GS3', 2024),
      ('1afb4468-1068-4d9f-bd52-0f73ed6d6f1a'::UUID, '721440', 'Bestune', 'B70', 2023),
      ('1b6f15bd-943d-44da-a79e-b11cbd065b49'::UUID, '10189', 'Bestune', 'T33', 2022),
      ('1bb55683-16b8-4979-be53-d6df6917cda2'::UUID, '749762', 'MG5', 'MG5', 2024),
      ('1bdfc5ec-cb92-4d62-8380-52979f090b7b'::UUID, '761292', 'MG5', 'MG5', 2024),
      ('1d3e59cc-a1e7-463e-8786-8d0a25f2e270'::UUID, '10849', 'changan', 'Alsvin', 2024),
      ('1da2810c-20d4-4cfc-8768-dfe553cb282d'::UUID, '7036', 'Bestune', 'T77 pro', 2023),
      ('1ded8b8f-0a30-41fd-a3ac-d37ad2e78eaf'::UUID, '7056', 'Bestune', 'T77 pro', 2023),
      ('1e3c5999-f3ac-4c72-9da1-005b7d083517'::UUID, '8209', 'GAC', 'GS3', 2024)
      -- This is a SAMPLE of first 40 records
      -- For FULL import, add all 417 records from the file
    ) AS vd(contract_id, license_plate, make, model, year)
  )
  UPDATE contracts c
  SET 
    license_plate = vd.license_plate,
    make = vd.make,
    model = vd.model,
    year = vd.year,
    updated_at = NOW()
  FROM vehicle_data vd
  WHERE c.id = vd.contract_id
    AND c.company_id = v_company_id
    AND (c.license_plate IS NULL OR TRIM(c.license_plate) = '');
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RAISE NOTICE '✅ Updated % contracts with vehicle data', v_updated;
  RAISE NOTICE '';
  
  -- Count total contracts with plate data now
  SELECT COUNT(*) INTO v_total
  FROM contracts
  WHERE company_id = v_company_id
    AND license_plate IS NOT NULL
    AND TRIM(license_plate) != '';
  
  RAISE NOTICE '📊 Total contracts with plate data: %', v_total;
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '⚠️ IMPORTANT: This migration contains SAMPLE data only (40 records)';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'To import ALL 417 records:';
  RAISE NOTICE '1. Extract all UUIDs and vehicle data from agreements_with_details.sql';
  RAISE NOTICE '2. Add them to the VALUES clause above';
  RAISE NOTICE '3. Re-run this migration';
  RAISE NOTICE '';
  RAISE NOTICE '💡 OR use the automated scripts:';
  RAISE NOTICE '   - generate_import_sql.py (Python)';
  RAISE NOTICE '   - SIMPLE_update_contracts_from_file.sql (SQL)';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  -- Show which contracts still need data
  SELECT COUNT(*) INTO v_total
  FROM contracts
  WHERE company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  
  RAISE NOTICE '⚠️ Contracts still missing vehicle data: %', v_total;
  RAISE NOTICE '';
  
END $$;

-- Verification query
SELECT 
  '✅ Verification: Sample Updated Contracts' as check_result,
  contract_number,
  license_plate,
  make,
  model,
  year
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND id IN (
    '0061e679-46c2-4e79-9a03-be54a013ef2b',
    '1da2810c-20d4-4cfc-8768-dfe553cb282d'
  )
ORDER BY contract_number;

