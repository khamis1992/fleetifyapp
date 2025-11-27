-- ================================================================
-- AUTO-GENERATED: Update Contracts with Vehicle Data
-- ================================================================
-- Generated from: agreements_with_details.sql
-- Total records: 418
-- ================================================================

DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_updated INTEGER := 0;
  v_total_updated INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚗 UPDATING CONTRACTS WITH VEHICLE DATA';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';

  -- 1. UUID: 0061e679...
  UPDATE contracts SET
    license_plate = '7036',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '0061e679-46c2-4e79-9a03-be54a013ef2b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 2. UUID: 019257a4...
  UPDATE contracts SET
    license_plate = '749762',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '019257a4-3eef-4506-b3c3-1f46d6f07921'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 3. UUID: 01d6bb7c...
  UPDATE contracts SET
    license_plate = '711464',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '01d6bb7c-64c6-48ff-8b96-bd2ea10aad52'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 4. UUID: 0304ca70...
  UPDATE contracts SET
    license_plate = '7071',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '0304ca70-5990-47e9-8b77-4f52dddf652c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 5. UUID: 038eb503...
  UPDATE contracts SET
    license_plate = '7078',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '038eb503-9b42-4102-9517-bf48e2b14771'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 6. UUID: 04014c11...
  UPDATE contracts SET
    license_plate = '2774',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '04014c11-f032-4529-a00f-464d5b76014c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 7. UUID: 061980c8...
  UPDATE contracts SET
    license_plate = '7060',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '061980c8-b43b-42fb-888c-560a2e1fe788'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 8. UUID: 06a99606...
  UPDATE contracts SET
    license_plate = '2771',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '06a99606-1514-4051-a1d8-42777d3b79dd'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 9. UUID: 073fef4a...
  UPDATE contracts SET
    license_plate = '10853',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '073fef4a-4d07-4dc9-b24a-d519bcaed696'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 10. UUID: 07d9e08d...
  UPDATE contracts SET
    license_plate = '706150',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '07d9e08d-e9f1-4087-bb97-8e66fbc6f86d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 11. UUID: 09d81ab4...
  UPDATE contracts SET
    license_plate = '706150',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '09d81ab4-d511-4144-8fde-8fc2de6c7bc2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 12. UUID: 0ac0bc98...
  UPDATE contracts SET
    license_plate = '749762',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '0ac0bc98-f6d6-4d15-bfc8-bb96263bf018'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 13. UUID: 0c6de023...
  UPDATE contracts SET
    license_plate = '381247',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '0c6de023-cb2f-4d1e-ab2b-ca64be825f9d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 14. UUID: 0cd4194a...
  UPDATE contracts SET
    license_plate = '7063',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '0cd4194a-e72e-4a53-b2f0-c99898e5d161'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 15. UUID: 0cf76e56...
  UPDATE contracts SET
    license_plate = '2767',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '0cf76e56-1e7f-425e-8e0b-b41c77ebcdf7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 16. UUID: 0eddc6c3...
  UPDATE contracts SET
    license_plate = '754705',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '0eddc6c3-f1e1-49f8-a7b3-65c636bf3bfe'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 17. UUID: 0efc43da...
  UPDATE contracts SET
    license_plate = '2772',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '0efc43da-7edd-49b2-8d0b-45cef9349478'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 18. UUID: 10322b6c...
  UPDATE contracts SET
    license_plate = '7078',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '10322b6c-c03e-457e-aec8-27a19d19b8a6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 19. UUID: 104d645a...
  UPDATE contracts SET
    license_plate = '856589',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '104d645a-2168-40d8-9d3a-661fa1adde91'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 20. UUID: 10736280...
  UPDATE contracts SET
    license_plate = '2767',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '10736280-f100-45b9-b24a-67d7d4697f84'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 21. UUID: 10ee2d43...
  UPDATE contracts SET
    license_plate = '7057',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '10ee2d43-8951-42f8-89a3-1fc223b6e214'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 22. UUID: 11a30bad...
  UPDATE contracts SET
    license_plate = '563829',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '11a30bad-8f67-41b2-8c51-c935a1ed6afc'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 23. UUID: 12b28467...
  UPDATE contracts SET
    license_plate = '893408',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '12b28467-42d1-42d0-8f28-ce0600c9d0f3'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 24. UUID: 1526e3a7...
  UPDATE contracts SET
    license_plate = '8203',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '1526e3a7-bcdd-4e23-a679-24dd60456c34'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 25. UUID: 15b2ed2c...
  UPDATE contracts SET
    license_plate = '10174',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '15b2ed2c-379d-4faf-a7ea-9c80923430ea'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 26. UUID: 15e50134...
  UPDATE contracts SET
    license_plate = '9902',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '15e50134-a030-42ef-96e4-66394ca689e5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 27. UUID: 1667c0a0...
  UPDATE contracts SET
    license_plate = '2782',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '1667c0a0-0555-4a4e-a452-c53ecffcee68'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 28. UUID: 16decf31...
  UPDATE contracts SET
    license_plate = '4017',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '16decf31-2c5d-4a32-840e-f616fc71e246'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 29. UUID: 175f7dc3...
  UPDATE contracts SET
    license_plate = '862165',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '175f7dc3-624c-477c-be89-d1ce823492cc'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 30. UUID: 17786faa...
  UPDATE contracts SET
    license_plate = '5889',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '17786faa-4f78-4be0-bf5a-c0d4f7e3ff0b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 31. UUID: 18984570...
  UPDATE contracts SET
    license_plate = '646507',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '18984570-4531-47bb-b9ac-11387f93c4de'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 32. UUID: 191842fe...
  UPDATE contracts SET
    license_plate = '847601',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = '191842fe-38e8-48e7-82b2-f6a528069462'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 33. UUID: 19865f35...
  UPDATE contracts SET
    license_plate = '4016',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '19865f35-f1f0-4bdd-9c34-1c6b993be1b3'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 34. UUID: 1afb4468...
  UPDATE contracts SET
    license_plate = '721440',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '1afb4468-1068-4d9f-bd52-0f73ed6d6f1a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 35. UUID: 1b6f15bd...
  UPDATE contracts SET
    license_plate = '10189',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '1b6f15bd-943d-44da-a79e-b11cbd065b49'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 36. UUID: 1bb55683...
  UPDATE contracts SET
    license_plate = '749762',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '1bb55683-16b8-4979-be53-d6df6917cda2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 37. UUID: 1bdfc5ec...
  UPDATE contracts SET
    license_plate = '761292',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '1bdfc5ec-cb92-4d62-8380-52979f090b7b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 38. UUID: 1d3e59cc...
  UPDATE contracts SET
    license_plate = '10849',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '1d3e59cc-a1e7-463e-8786-8d0a25f2e270'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 39. UUID: 1da2810c...
  UPDATE contracts SET
    license_plate = '7036',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '1da2810c-20d4-4cfc-8768-dfe553cb282d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 40. UUID: 1ded8b8f...
  UPDATE contracts SET
    license_plate = '7056',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '1ded8b8f-0a30-41fd-a3ac-d37ad2e78eaf'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 41. UUID: 1e3c5999...
  UPDATE contracts SET
    license_plate = '8209',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '1e3c5999-f3ac-4c72-9da1-005b7d083517'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 42. UUID: 1e8f100a...
  UPDATE contracts SET
    license_plate = '10853',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '1e8f100a-1f2a-420b-b6e6-76e6428fa762'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 43. UUID: 1fd8c8f7...
  UPDATE contracts SET
    license_plate = '4014',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '1fd8c8f7-f986-4ec0-ab25-1aee7c7ee7d2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 44. UUID: 1fded98d...
  UPDATE contracts SET
    license_plate = '816508',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '1fded98d-a4b2-4ab8-81f1-5a254b862f0c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 45. UUID: 20152a6e...
  UPDATE contracts SET
    license_plate = '2634',
    make = 'dongfeng',
    model = 'A30',
    year = 2023,
    updated_at = NOW()
  WHERE id = '20152a6e-8f4d-47ee-b408-10c841380f5a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 46. UUID: 203b11e2...
  UPDATE contracts SET
    license_plate = '10851',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '203b11e2-7668-4c8d-853f-52527f99808f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 47. UUID: 21b0c4c8...
  UPDATE contracts SET
    license_plate = '741277',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '21b0c4c8-1055-4efc-9862-c30e2de0ca51'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 48. UUID: 21eaaa7b...
  UPDATE contracts SET
    license_plate = '856878',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '21eaaa7b-fb81-4d52-ae3a-d1a41f490d3a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 49. UUID: 229f96df...
  UPDATE contracts SET
    license_plate = '9902',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '229f96df-2a37-4dcd-b7f5-3e4ab1eaba99'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 50. UUID: 23089125...
  UPDATE contracts SET
    license_plate = '856718',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '23089125-02d6-4d26-80ef-1bdc0505bdcf'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '   Progress: 50 processed...';

  -- 51. UUID: 23e4ad7c...
  UPDATE contracts SET
    license_plate = '7062',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '23e4ad7c-213c-4254-901f-e5617fbe70c1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 52. UUID: 2469b3b7...
  UPDATE contracts SET
    license_plate = '8210',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '2469b3b7-1f89-4f1a-8056-b7def29160b1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 53. UUID: 24e29cc3...
  UPDATE contracts SET
    license_plate = '563829',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '24e29cc3-2ea8-4d5a-beac-688c05de3912'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 54. UUID: 25a3739b...
  UPDATE contracts SET
    license_plate = '10671',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '25a3739b-487c-4622-b533-2d2bcd486954'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 55. UUID: 26c0a5c3...
  UPDATE contracts SET
    license_plate = '10174',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '26c0a5c3-f2bc-43ce-8a0d-a7322a62fddd'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 56. UUID: 27436428...
  UPDATE contracts SET
    license_plate = '10064',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '27436428-0a6a-4ff7-b108-3730eba4ce42'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 57. UUID: 27b67fe9...
  UPDATE contracts SET
    license_plate = '7054',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '27b67fe9-65aa-40b2-a542-6309be966ee4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 58. UUID: 27d255e6...
  UPDATE contracts SET
    license_plate = '10664',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '27d255e6-0b9f-448a-8df8-44f3f3b17e68'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 59. UUID: 2942d600...
  UPDATE contracts SET
    license_plate = '7054',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '2942d600-7e7e-4ccf-9a31-2a31b4ac19c7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 60. UUID: 29d44530...
  UPDATE contracts SET
    license_plate = '862169',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '29d44530-a100-4ca9-a09f-5efa93b4ce5f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 61. UUID: 2aff9e01...
  UPDATE contracts SET
    license_plate = '21860',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '2aff9e01-67ca-40e0-b7b7-162c4a830688'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 62. UUID: 2b28596a...
  UPDATE contracts SET
    license_plate = '7038',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '2b28596a-12b6-48fe-a4a8-8b70ef6535a6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 63. UUID: 2b8a9260...
  UPDATE contracts SET
    license_plate = '185485',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '2b8a9260-5805-429f-af4e-a2a7848378b2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 64. UUID: 2c7ba757...
  UPDATE contracts SET
    license_plate = '2778',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '2c7ba757-97ef-4e6b-9b2c-e3ba1755ae03'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 65. UUID: 2cd122d2...
  UPDATE contracts SET
    license_plate = '7042',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '2cd122d2-66c4-4bfa-bb7e-c8606888b381'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 66. UUID: 2cf22a50...
  UPDATE contracts SET
    license_plate = '8208',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '2cf22a50-32e5-4c29-8968-150354801950'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 67. UUID: 2d7940e1...
  UPDATE contracts SET
    license_plate = '9902',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '2d7940e1-fe8f-4731-af32-5ca6b1c4adc1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 68. UUID: 2d81a768...
  UPDATE contracts SET
    license_plate = '7058',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '2d81a768-c4f7-4ab3-988b-dca07ad82fb7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 69. UUID: 30c8c5d8...
  UPDATE contracts SET
    license_plate = '7054',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '30c8c5d8-e1ef-499a-a91c-51623f570958'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 70. UUID: 31445f21...
  UPDATE contracts SET
    license_plate = '754705',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '31445f21-d6e4-4919-a6af-993ed3cf66bd'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 71. UUID: 31e8d531...
  UPDATE contracts SET
    license_plate = '5893',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '31e8d531-d1ee-4460-8441-afb8d2db3796'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 72. UUID: 321bf74a...
  UPDATE contracts SET
    license_plate = '7063',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '321bf74a-bd7e-4c00-90bb-360f38eed723'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 73. UUID: 32332746...
  UPDATE contracts SET
    license_plate = '21860',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '32332746-2d3e-4424-a2a0-3b0141e2ecda'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 74. UUID: 32ccdf91...
  UPDATE contracts SET
    license_plate = '8209',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '32ccdf91-bb94-4857-8dc7-2551273f43f5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 75. UUID: 331e1599...
  UPDATE contracts SET
    license_plate = '817009',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '331e1599-a551-446f-92c6-aa4e0e6dd450'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 76. UUID: 33a062db...
  UPDATE contracts SET
    license_plate = '7034',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '33a062db-0938-464c-a1a9-0bb498c36d3d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 77. UUID: 33f3c866...
  UPDATE contracts SET
    license_plate = '8212',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '33f3c866-9b48-4bdc-a969-ed0f5ec3c718'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 78. UUID: 3420a27c...
  UPDATE contracts SET
    license_plate = '10854',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '3420a27c-782b-4e34-92b3-48616ee60bf5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 79. UUID: 34b51dc4...
  UPDATE contracts SET
    license_plate = '752724',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '34b51dc4-d898-4fa8-a0a8-8e71faffab44'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 80. UUID: 37a4f601...
  UPDATE contracts SET
    license_plate = '10667',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '37a4f601-be63-4281-98f7-3aa9f8d96c02'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 81. UUID: 37b5184e...
  UPDATE contracts SET
    license_plate = '862165',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '37b5184e-26f1-4110-b266-d84102c64814'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 82. UUID: 37cde930...
  UPDATE contracts SET
    license_plate = '8207',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '37cde930-09c8-4160-a9f0-fa8f084d8341'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 83. UUID: 383aa698...
  UPDATE contracts SET
    license_plate = '185573',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '383aa698-d7ab-4d44-afe2-f823bc1b6557'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 84. UUID: 39878cdb...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '39878cdb-8844-40ee-8cb6-c107239e119c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 85. UUID: 398979b3...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '398979b3-d33f-4742-9efe-6e5d80b83657'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 86. UUID: 399700a9...
  UPDATE contracts SET
    license_plate = '381247',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '399700a9-430d-49c9-a156-08c56d14a917'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 87. UUID: 39a47601...
  UPDATE contracts SET
    license_plate = '856589',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '39a47601-f1c1-44a6-be29-a32e7f3ff1e7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 88. UUID: 3adca2e7...
  UPDATE contracts SET
    license_plate = '2783',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '3adca2e7-5afd-4358-bfab-a862210478a0'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 89. UUID: 3aefc020...
  UPDATE contracts SET
    license_plate = '8209',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '3aefc020-1fe8-4a73-884d-99f01c5514d1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 90. UUID: 3af96b25...
  UPDATE contracts SET
    license_plate = '5900',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '3af96b25-d787-48c3-a876-ae947ee87fd0'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 91. UUID: 3b034155...
  UPDATE contracts SET
    license_plate = '2773',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '3b034155-2c13-4037-adbd-363bd4bfcb1a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 92. UUID: 3bd13395...
  UPDATE contracts SET
    license_plate = '7054',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '3bd13395-cb66-4e4f-901c-5b64f76771a5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 93. UUID: 3d553923...
  UPDATE contracts SET
    license_plate = '7058',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '3d553923-524a-43cd-8ceb-262f067b2f70'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 94. UUID: 3ec17bc2...
  UPDATE contracts SET
    license_plate = '847059',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = '3ec17bc2-c1ed-46a3-bd9c-c749cbdc13e8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 95. UUID: 3f156cb1...
  UPDATE contracts SET
    license_plate = '10670',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '3f156cb1-3c92-42c9-9919-c5642a1ccbb6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 96. UUID: 3f79fddb...
  UPDATE contracts SET
    license_plate = '5898',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '3f79fddb-1c4e-4492-a06c-80d08e9fcdb8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 97. UUID: 4186518c...
  UPDATE contracts SET
    license_plate = '17216',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '4186518c-8402-4a0a-9093-9dcedd754bc1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 98. UUID: 41dee9d5...
  UPDATE contracts SET
    license_plate = '7069',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '41dee9d5-e154-4d09-a47c-182d77542799'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 99. UUID: 429b3d4a...
  UPDATE contracts SET
    license_plate = '856715',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '429b3d4a-fc13-449d-9baf-e4214336354e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 100. UUID: 42c88b0b...
  UPDATE contracts SET
    license_plate = '335485',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '42c88b0b-5e48-49f0-bae2-9997216d8df0'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '   Progress: 100 processed...';

  -- 101. UUID: 43987249...
  UPDATE contracts SET
    license_plate = '5901',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '43987249-49a2-4bc2-a661-464a486fd93e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 102. UUID: 450ddb7a...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '450ddb7a-62e3-4c91-ab63-aedf57386e14'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 103. UUID: 453f072e...
  UPDATE contracts SET
    license_plate = '7040',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '453f072e-9653-43b8-880b-5ec3f1c348ef'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 104. UUID: 4621ee0a...
  UPDATE contracts SET
    license_plate = '10172',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '4621ee0a-2848-4beb-b77e-faf517de2f91'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 105. UUID: 46f177bc...
  UPDATE contracts SET
    license_plate = '521207',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '46f177bc-2633-4fd6-aba7-bf762ad31c41'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 106. UUID: 47563102...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '47563102-d4c6-49a2-afdb-3851683d67c1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 107. UUID: 47e35819...
  UPDATE contracts SET
    license_plate = '848014',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = '47e35819-8bdc-4a03-be74-d7cba2a671d3'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 108. UUID: 4830316b...
  UPDATE contracts SET
    license_plate = '2784',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '4830316b-6449-412b-96b4-e71ce7122bab'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 109. UUID: 48433678...
  UPDATE contracts SET
    license_plate = '856878',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '48433678-fb01-46a4-a1b1-af761413550d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 110. UUID: 4878e5c2...
  UPDATE contracts SET
    license_plate = '234',
    make = 'testt',
    model = 'test',
    year = 2024,
    updated_at = NOW()
  WHERE id = '4878e5c2-0209-4930-b10c-5d2a60f273e1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 111. UUID: 4895d098...
  UPDATE contracts SET
    license_plate = '754436',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '4895d098-9d55-4694-b5a7-e03d64d19bb3'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 112. UUID: 491a7f97...
  UPDATE contracts SET
    license_plate = '7058',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '491a7f97-5b41-4854-ae80-2d4c100d3e4d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 113. UUID: 49869cb0...
  UPDATE contracts SET
    license_plate = '846508',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = '49869cb0-642d-4ce0-8fb7-ceb6ddfe4e66'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 114. UUID: 4b5e86d6...
  UPDATE contracts SET
    license_plate = '7062',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '4b5e86d6-b55c-43bc-8e72-d870f90c513e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 115. UUID: 4b97b06a...
  UPDATE contracts SET
    license_plate = '9902',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '4b97b06a-1fcf-4004-8a41-90193cb8490c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 116. UUID: 4bd27801...
  UPDATE contracts SET
    license_plate = '7057',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '4bd27801-d024-4d8e-b040-e64d56d7d045'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 117. UUID: 4c90ddaf...
  UPDATE contracts SET
    license_plate = '10853',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '4c90ddaf-5ac0-4d96-b97d-6abcadda2d66'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 118. UUID: 4cb65191...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '4cb65191-71f4-4c26-b4be-d67bc8356af4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 119. UUID: 4cb7b8cb...
  UPDATE contracts SET
    license_plate = '7043',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '4cb7b8cb-c0c5-4b81-8c11-9230b0b3778f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 120. UUID: 4cc8e439...
  UPDATE contracts SET
    license_plate = '521207',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '4cc8e439-da3b-4218-a04c-63333d6981af'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 121. UUID: 4d69c38e...
  UPDATE contracts SET
    license_plate = '856925',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '4d69c38e-620b-4b59-b306-92c127bb7c6a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 122. UUID: 4f76a8b9...
  UPDATE contracts SET
    license_plate = '7040',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '4f76a8b9-a786-4f18-a370-e720725123ef'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 123. UUID: 512fbda0...
  UPDATE contracts SET
    license_plate = '711464',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '512fbda0-6e4c-463a-840e-36bfc4421756'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 124. UUID: 5130a892...
  UPDATE contracts SET
    license_plate = '2768',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '5130a892-4acd-411f-95f1-a760a64cb2f4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 125. UUID: 513c0d0a...
  UPDATE contracts SET
    license_plate = '9255',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '513c0d0a-01e3-457c-bdc7-ee04fc7d2c51'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 126. UUID: 527794d2...
  UPDATE contracts SET
    license_plate = '234',
    make = 'testt',
    model = 'test',
    year = 2024,
    updated_at = NOW()
  WHERE id = '527794d2-70c6-4980-84ce-bff3dd517c4a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 127. UUID: 52ea5d4c...
  UPDATE contracts SET
    license_plate = '862165',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '52ea5d4c-b7ab-4796-8b94-59b12da4f70a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 128. UUID: 539b53d3...
  UPDATE contracts SET
    license_plate = '4015',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '539b53d3-93bb-4f73-b645-d1a65a4f4c7f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 129. UUID: 53c3b9f7...
  UPDATE contracts SET
    license_plate = '21849',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '53c3b9f7-80b4-49f3-9f02-66ee250806d7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 130. UUID: 53f76aee...
  UPDATE contracts SET
    license_plate = '2776',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '53f76aee-44a6-4d44-878c-b68a82848573'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 131. UUID: 549c3383...
  UPDATE contracts SET
    license_plate = '721440',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '549c3383-e19e-4f92-b671-b8e7df293900'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 132. UUID: 55508d57...
  UPDATE contracts SET
    license_plate = '2778',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '55508d57-d320-4532-8c2d-3fc62a8748a1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 133. UUID: 555f4ffc...
  UPDATE contracts SET
    license_plate = '5898',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '555f4ffc-6ca6-4296-a623-f7e9c593b992'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 134. UUID: 56708b17...
  UPDATE contracts SET
    license_plate = '847987',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = '56708b17-64e8-4b47-86fe-e47c0f7bd667'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 135. UUID: 572ee6c9...
  UPDATE contracts SET
    license_plate = '10664',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '572ee6c9-78a8-4864-81e4-d5f8c0757d5e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 136. UUID: 5871fcb8...
  UPDATE contracts SET
    license_plate = '746956',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '5871fcb8-50ef-43f1-9963-b44519ad4bc6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 137. UUID: 589086f9...
  UPDATE contracts SET
    license_plate = '5891',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '589086f9-a471-4cb9-b25c-62d524a5bcd7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 138. UUID: 59dd3e9d...
  UPDATE contracts SET
    license_plate = '5900',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '59dd3e9d-9ceb-4cbb-a20c-ff500f5acd40'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 139. UUID: 5b3c17ac...
  UPDATE contracts SET
    license_plate = '9905',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '5b3c17ac-7c44-4d79-98c6-82f926f425df'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 140. UUID: 5d3a8479...
  UPDATE contracts SET
    license_plate = '7064',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '5d3a8479-ea75-4cb7-a549-b7cea384af43'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 141. UUID: 5e11ae69...
  UPDATE contracts SET
    license_plate = '7053',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '5e11ae69-1681-4c2d-8234-a6b3dabec48d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 142. UUID: 5e38c8ff...
  UPDATE contracts SET
    license_plate = '10176',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '5e38c8ff-ca5b-4898-a07e-2b1a06ee04d6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 143. UUID: 6092bf72...
  UPDATE contracts SET
    license_plate = '7072',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6092bf72-f449-4590-86bc-65b370c97178'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 144. UUID: 6279bea5...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6279bea5-e083-4eca-be78-068f2d9bf2bb'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 145. UUID: 62cf81db...
  UPDATE contracts SET
    license_plate = '10174',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '62cf81db-97ab-4256-ad47-927e9d286931'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 146. UUID: 63077f21...
  UPDATE contracts SET
    license_plate = '7074',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '63077f21-2116-4a09-9266-93f8f78aed2e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 147. UUID: 63096dee...
  UPDATE contracts SET
    license_plate = '8207',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '63096dee-ae48-45d2-8e0b-25ce092c26b2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 148. UUID: 6313935b...
  UPDATE contracts SET
    license_plate = '10851',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '6313935b-13ea-4f50-8071-41593fda96b6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 149. UUID: 631fedce...
  UPDATE contracts SET
    license_plate = '749762',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '631fedce-521b-4480-82c7-f3e312c98640'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 150. UUID: 638c1b26...
  UPDATE contracts SET
    license_plate = '2770',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '638c1b26-1672-452b-8718-40e92b1ffeda'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '   Progress: 150 processed...';

  -- 151. UUID: 6392c9c0...
  UPDATE contracts SET
    license_plate = '185513',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6392c9c0-e5d3-4547-8299-21466ab3be03'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 152. UUID: 63f06ecf...
  UPDATE contracts SET
    license_plate = '7054',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '63f06ecf-4b7c-4d8c-82b0-8d008082b538'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 153. UUID: 64f80d29...
  UPDATE contracts SET
    license_plate = '856878',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '64f80d29-70c1-4d16-83ee-fb48bf2c21ba'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 154. UUID: 650237b2...
  UPDATE contracts SET
    license_plate = '847941',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = '650237b2-3b79-490e-8f2e-ca7a4f18fd6b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 155. UUID: 65f02c74...
  UPDATE contracts SET
    license_plate = '5899',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '65f02c74-c57c-44aa-87d0-f671669544a7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 156. UUID: 662e2542...
  UPDATE contracts SET
    license_plate = '2777',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '662e2542-b2db-4c83-a25d-4c51d31380a1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 157. UUID: 66326fc2...
  UPDATE contracts SET
    license_plate = '751340',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '66326fc2-ecdd-41f2-a983-26ddffee4e51'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 158. UUID: 66bb0f2d...
  UPDATE contracts SET
    license_plate = '646507',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '66bb0f2d-2a19-46b7-8daa-6372bf1f394c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 159. UUID: 66cb9bf7...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '66cb9bf7-ef33-4338-b369-96e42dc3e3ba'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 160. UUID: 680cbfad...
  UPDATE contracts SET
    license_plate = '7053',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '680cbfad-0aae-40c9-bbc6-a5b434dcb3ff'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 161. UUID: 68511d03...
  UPDATE contracts SET
    license_plate = '7037',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '68511d03-7626-47fb-b3a7-b715f258ea05'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 162. UUID: 68a52a6e...
  UPDATE contracts SET
    license_plate = '10854',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '68a52a6e-91c2-4b04-8e6d-8d19975e30ac'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 163. UUID: 68eea519...
  UPDATE contracts SET
    license_plate = '10174',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '68eea519-bf73-47cd-a7db-d3cbd01e1375'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 164. UUID: 699f1874...
  UPDATE contracts SET
    license_plate = '8206',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '699f1874-739b-403a-9821-c856a51b0782'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 165. UUID: 69d13bd3...
  UPDATE contracts SET
    license_plate = '7073',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '69d13bd3-406f-4ecb-8baa-0aaedfa65e03'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 166. UUID: 69dede78...
  UPDATE contracts SET
    license_plate = '856878',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '69dede78-f265-4ba2-beec-66aae73aec49'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 167. UUID: 6a368927...
  UPDATE contracts SET
    license_plate = '2772',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6a368927-ada2-4a26-9340-6b8b35c7cb3a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 168. UUID: 6adae841...
  UPDATE contracts SET
    license_plate = '7063',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6adae841-8877-4270-8ccd-dfe7035d3e79'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 169. UUID: 6af0fc24...
  UPDATE contracts SET
    license_plate = '10197',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '6af0fc24-e55a-4a2c-b684-cc6970e5adf1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 170. UUID: 6b384ded...
  UPDATE contracts SET
    license_plate = '10189',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '6b384ded-02f5-4c3d-975a-bd59d4f10f6b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 171. UUID: 6bd608db...
  UPDATE contracts SET
    license_plate = '7039',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6bd608db-1b89-4a8c-b860-6c57168110c4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 172. UUID: 6c9f1bc1...
  UPDATE contracts SET
    license_plate = '751340',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '6c9f1bc1-748e-4f81-83f3-4dcec22fee4e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 173. UUID: 6d4f1aaa...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6d4f1aaa-a6ea-40a8-abf1-fd4aec7f734b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 174. UUID: 6d88a761...
  UPDATE contracts SET
    license_plate = '10668',
    make = 'changan',
    model = 'alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '6d88a761-f73d-4712-9dcc-35adde809fe1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 175. UUID: 6dc4364d...
  UPDATE contracts SET
    license_plate = '893411',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6dc4364d-f533-44c5-8810-fbef3314fc5f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 176. UUID: 6efdf71e...
  UPDATE contracts SET
    license_plate = '381247',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '6efdf71e-6456-441b-8c2c-f96ddef64a0a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 177. UUID: 70333d6e...
  UPDATE contracts SET
    license_plate = '556199',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '70333d6e-ffcf-4260-9b7e-329c7c03f908'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 178. UUID: 70bc33d0...
  UPDATE contracts SET
    license_plate = '10669',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '70bc33d0-4dbf-46e1-9348-8e8be3adf11f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 179. UUID: 70de5663...
  UPDATE contracts SET
    license_plate = '821873',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '70de5663-91f0-43f2-becb-129e52d18845'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 180. UUID: 710a1dfb...
  UPDATE contracts SET
    license_plate = '5895',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '710a1dfb-7a0f-48d5-8054-57e8ad5fe40b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 181. UUID: 71409a07...
  UPDATE contracts SET
    license_plate = '5894',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '71409a07-62e2-4560-b679-cb853d7876e2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 182. UUID: 714a91cf...
  UPDATE contracts SET
    license_plate = '2779',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '714a91cf-f96f-4fe8-b89b-a5a03168aa44'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 183. UUID: 7167259d...
  UPDATE contracts SET
    license_plate = '548682',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '7167259d-9470-4163-a8e6-bec64a95a38d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 184. UUID: 7174ff57...
  UPDATE contracts SET
    license_plate = '8205',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '7174ff57-41b3-4d15-a945-766c0c56d6e8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 185. UUID: 71a00dfe...
  UPDATE contracts SET
    license_plate = '381247',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '71a00dfe-7b33-48ef-b2d1-acf36b395821'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 186. UUID: 72184742...
  UPDATE contracts SET
    license_plate = '648144',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '72184742-ad88-4464-ba85-2e69f77de10e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 187. UUID: 72b45b46...
  UPDATE contracts SET
    license_plate = '739649',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '72b45b46-1bf7-48ae-a352-a6168995c817'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 188. UUID: 72f41dfc...
  UPDATE contracts SET
    license_plate = '4014',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '72f41dfc-d204-4aa2-bc5a-3eb9f60548af'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 189. UUID: 733e4396...
  UPDATE contracts SET
    license_plate = '7040',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '733e4396-df68-4bf2-bbad-bde321b28b8b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 190. UUID: 735a4654...
  UPDATE contracts SET
    license_plate = '10856',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '735a4654-4425-4562-9837-b1df7e07f0c9'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 191. UUID: 73627631...
  UPDATE contracts SET
    license_plate = '5891',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '73627631-824d-49aa-a2e1-51d5ee52cc1e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 192. UUID: 74b56579...
  UPDATE contracts SET
    license_plate = '9999',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '74b56579-8640-4501-9968-54112ec60dea'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 193. UUID: 75040aa9...
  UPDATE contracts SET
    license_plate = '7039',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '75040aa9-ed9d-4903-a90a-bb58cedbcd46'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 194. UUID: 765c1147...
  UPDATE contracts SET
    license_plate = '722134',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '765c1147-24bc-4541-8de2-861b39bcd347'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 195. UUID: 77855616...
  UPDATE contracts SET
    license_plate = '857051',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '77855616-b43d-4ab9-99a6-074c4fca8ed1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 196. UUID: 7d3637fb...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '7d3637fb-f8ec-4636-ac1a-657a8b5b633a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 197. UUID: 7dc8a4d9...
  UPDATE contracts SET
    license_plate = '2774',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '7dc8a4d9-bde9-4c0c-9da8-120b0b2172ab'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 198. UUID: 7edddf53...
  UPDATE contracts SET
    license_plate = '2779',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '7edddf53-426e-4477-b284-fd0a5dd64a8b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 199. UUID: 7ef0c940...
  UPDATE contracts SET
    license_plate = '9891',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '7ef0c940-8df9-4aed-b63f-4a7252891733'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 200. UUID: 7f8bf007...
  UPDATE contracts SET
    license_plate = '7065',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '7f8bf007-220f-4a08-b2e6-ca70f0421f43'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '   Progress: 200 processed...';

  -- 201. UUID: 7ff00f92...
  UPDATE contracts SET
    license_plate = '548682',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '7ff00f92-9a0d-48c8-ba99-b9996a63ae43'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 202. UUID: 802ccafe...
  UPDATE contracts SET
    license_plate = '893409',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '802ccafe-7df0-4350-bdcd-25ae424fa25a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 203. UUID: 804f93ab...
  UPDATE contracts SET
    license_plate = '725473',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '804f93ab-2e40-4412-92b3-45ff60ac2d72'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 204. UUID: 80b3e94b...
  UPDATE contracts SET
    license_plate = '2770',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '80b3e94b-a22c-4f2d-b0a9-60fed6e0420b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 205. UUID: 81c95ce2...
  UPDATE contracts SET
    license_plate = '5894',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '81c95ce2-d8a6-43a3-92aa-9ca5ea5d7cd6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 206. UUID: 8227cc94...
  UPDATE contracts SET
    license_plate = '822389',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '8227cc94-9786-400e-9920-cc0971730ff2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 207. UUID: 823a0e66...
  UPDATE contracts SET
    license_plate = '8208',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '823a0e66-458a-4fd1-92db-eb76443e3de5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 208. UUID: 831e4b60...
  UPDATE contracts SET
    license_plate = '10665',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '831e4b60-0fc5-4222-9816-216a95ee95b8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 209. UUID: 846a58d2...
  UPDATE contracts SET
    license_plate = '10850',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '846a58d2-2e3f-42d2-88b1-3682e8da8170'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 210. UUID: 846e2bfb...
  UPDATE contracts SET
    license_plate = '21849',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '846e2bfb-c8d5-441a-8736-f1d2b6a1a8c5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 211. UUID: 84a1c673...
  UPDATE contracts SET
    license_plate = '10664',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '84a1c673-4ed3-4c54-981e-a865dc0ca94e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 212. UUID: 864af701...
  UPDATE contracts SET
    license_plate = '846485',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = '864af701-e506-4c78-8c58-b2e2b8e2cf45'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 213. UUID: 869be268...
  UPDATE contracts SET
    license_plate = '570468',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '869be268-77dc-424f-b85e-70cff3ec4637'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 214. UUID: 8786d8d5...
  UPDATE contracts SET
    license_plate = '646507',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8786d8d5-e166-4863-8ba8-a5b842255126'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 215. UUID: 8827f29b...
  UPDATE contracts SET
    license_plate = '7041',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8827f29b-dc14-4b19-a264-9800fd7407bc'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 216. UUID: 88369467...
  UPDATE contracts SET
    license_plate = '739649',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '88369467-a527-4321-8007-913ebdbbb301'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 217. UUID: 8897a09e...
  UPDATE contracts SET
    license_plate = '11473',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '8897a09e-18cd-4eb4-bb36-552a35502d1e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 218. UUID: 89b7ecf0...
  UPDATE contracts SET
    license_plate = '856715',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '89b7ecf0-9d96-488d-bffe-3f9ef4dc0b36'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 219. UUID: 89d02076...
  UPDATE contracts SET
    license_plate = '7072',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '89d02076-d890-4b1a-8b44-40be3971f554'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 220. UUID: 89f8563f...
  UPDATE contracts SET
    license_plate = '10665',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '89f8563f-7635-45fb-a478-1e80637fd33e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 221. UUID: 8a71c9dc...
  UPDATE contracts SET
    license_plate = '2774',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8a71c9dc-ff04-40f7-86ff-b73999b240ce'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 222. UUID: 8aaf85b2...
  UPDATE contracts SET
    license_plate = '7075',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8aaf85b2-ba06-47c1-a0a4-22cd478cea4c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 223. UUID: 8be7dfc3...
  UPDATE contracts SET
    license_plate = '2776',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8be7dfc3-c7e9-4877-a8e9-dc756f473fdf'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 224. UUID: 8c441162...
  UPDATE contracts SET
    license_plate = '2766',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8c441162-9347-475c-a18a-ab31971365c2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 225. UUID: 8ce72c8b...
  UPDATE contracts SET
    license_plate = '2767',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8ce72c8b-7ee4-493a-8c3b-8c1eaebb7942'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 226. UUID: 8e3a54d5...
  UPDATE contracts SET
    license_plate = '556199',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8e3a54d5-8838-42cc-8368-13731cb891cf'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 227. UUID: 8e6fac1e...
  UPDATE contracts SET
    license_plate = '7067',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8e6fac1e-f25a-462b-8f82-990019137ce1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 228. UUID: 8eae98e2...
  UPDATE contracts SET
    license_plate = '847099',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = '8eae98e2-f716-45ca-bb03-2b6d83abc0d5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 229. UUID: 8f0a565e...
  UPDATE contracts SET
    license_plate = '10666',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '8f0a565e-7940-4bd8-b307-e9ef09072645'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 230. UUID: 8ff685b9...
  UPDATE contracts SET
    license_plate = '9905',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = '8ff685b9-31bd-47cc-a4d9-ed12c0fdb07c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 231. UUID: 90a2d05f...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = '90a2d05f-10bd-4af1-a1dd-e7c1b06295f4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 232. UUID: 90ee9539...
  UPDATE contracts SET
    license_plate = '7041',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '90ee9539-ea13-421e-81cc-52432213de7c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 233. UUID: 910055e0...
  UPDATE contracts SET
    license_plate = '751340',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '910055e0-3d2d-4c44-a50b-c967a6fcc023'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 234. UUID: 9358e296...
  UPDATE contracts SET
    license_plate = '749403',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9358e296-8bcc-4906-a789-611cfd5826c6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 235. UUID: 9378b960...
  UPDATE contracts SET
    license_plate = '10666',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9378b960-b9c8-4de9-bede-d1ff17eebcd8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 236. UUID: 937a0b18...
  UPDATE contracts SET
    license_plate = '856589',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = '937a0b18-0312-4341-b509-9edebe50f15c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 237. UUID: 94b83ee6...
  UPDATE contracts SET
    license_plate = '2778',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '94b83ee6-f0b1-4f5b-a404-0425b1bb3d05'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 238. UUID: 94cd1245...
  UPDATE contracts SET
    license_plate = '10668',
    make = 'changan',
    model = 'alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '94cd1245-a1fd-4b4e-b07c-0105891fa6a3'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 239. UUID: 9615a4f0...
  UPDATE contracts SET
    license_plate = '5897',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '9615a4f0-4de3-437e-83c4-154e7d116960'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 240. UUID: 965ef71a...
  UPDATE contracts SET
    license_plate = '7063',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '965ef71a-18bc-4f5c-b64f-2339acddd4c8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 241. UUID: 97dabfa9...
  UPDATE contracts SET
    license_plate = '10858',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = '97dabfa9-20eb-459a-988f-a397b3da95f0'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 242. UUID: 98caff55...
  UPDATE contracts SET
    license_plate = '2770',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '98caff55-b101-4296-870c-5dad6c939e61'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 243. UUID: 99a7ddc9...
  UPDATE contracts SET
    license_plate = '2783',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '99a7ddc9-cae0-4283-ba88-a6caf0d51835'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 244. UUID: 99da2906...
  UPDATE contracts SET
    license_plate = '7058',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '99da2906-39ec-415d-806a-7805b78e8f27'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 245. UUID: 9a77d2cc...
  UPDATE contracts SET
    license_plate = '648144',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = '9a77d2cc-eff6-4607-b817-57f84d524411'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 246. UUID: 9aaed7e8...
  UPDATE contracts SET
    license_plate = '2777',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '9aaed7e8-0723-4f96-a642-c316d120f363'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 247. UUID: 9ae95610...
  UPDATE contracts SET
    license_plate = '5890',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '9ae95610-3e9d-49f3-ab20-3343cad8e0b4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 248. UUID: 9c12dbf1...
  UPDATE contracts SET
    license_plate = '2780',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = '9c12dbf1-cd6e-4e5d-a97f-d8a682a3ccd4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 249. UUID: 9c6165f2...
  UPDATE contracts SET
    license_plate = '8212',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9c6165f2-826c-43a5-ac54-23d962e3f34f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 250. UUID: 9cd23e11...
  UPDATE contracts SET
    license_plate = '821873',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9cd23e11-0852-4280-899c-2e28fa52bfc9'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '   Progress: 250 processed...';

  -- 251. UUID: 9dbecf50...
  UPDATE contracts SET
    license_plate = '8205',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9dbecf50-2a66-423a-9e1b-ca92b7dfd5ca'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 252. UUID: 9dbfec19...
  UPDATE contracts SET
    license_plate = '7074',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '9dbfec19-d2e0-44e5-8bfa-149bec7211e7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 253. UUID: 9df67b98...
  UPDATE contracts SET
    license_plate = '335750',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9df67b98-9ab2-424c-a547-0ac4c75e1dc1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 254. UUID: 9e076001...
  UPDATE contracts SET
    license_plate = '8208',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9e076001-3a9a-4b8d-a32b-2a76ed48cc69'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 255. UUID: 9e8db329...
  UPDATE contracts SET
    license_plate = '7056',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = '9e8db329-06ea-47a4-80f7-6e46c7d8c48c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 256. UUID: 9f410b68...
  UPDATE contracts SET
    license_plate = '754436',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9f410b68-9188-4a7a-b9da-b06b4a386927'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 257. UUID: 9fb5f874...
  UPDATE contracts SET
    license_plate = '821873',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = '9fb5f874-4d07-4ce5-84e1-833b838ba4c4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 258. UUID: a0130ae2...
  UPDATE contracts SET
    license_plate = '9905',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'a0130ae2-b25e-4167-87dd-c4452f5320a9'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 259. UUID: a0f60534...
  UPDATE contracts SET
    license_plate = '8207',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'a0f60534-5d9a-4359-9661-8ac6e56bacf6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 260. UUID: a1113a78...
  UPDATE contracts SET
    license_plate = '8212',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'a1113a78-411f-4a79-825d-1d2464455f99'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 261. UUID: a14dae2f...
  UPDATE contracts SET
    license_plate = '8213',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'a14dae2f-016e-45c5-aa97-cffee1b8a987'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 262. UUID: a1bf6163...
  UPDATE contracts SET
    license_plate = '2769',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'a1bf6163-17c8-4f25-b58a-4f85a6881036'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 263. UUID: a1e85612...
  UPDATE contracts SET
    license_plate = '7068',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'a1e85612-1af4-4e7a-9e3c-257281a1f281'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 264. UUID: a3131d74...
  UPDATE contracts SET
    license_plate = '893409',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'a3131d74-8240-4110-b0b3-c61396e9890e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 265. UUID: a36696a8...
  UPDATE contracts SET
    license_plate = '721894',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'a36696a8-d1be-4f67-8357-73f82de2cba0'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 266. UUID: a3fc7fa9...
  UPDATE contracts SET
    license_plate = '721894',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'a3fc7fa9-1972-4618-a205-7951836bc735'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 267. UUID: a4804b12...
  UPDATE contracts SET
    license_plate = '556199',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'a4804b12-234b-42cc-ad63-0e6b7ff85f76'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 268. UUID: a5342433...
  UPDATE contracts SET
    license_plate = '7042',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'a5342433-6791-4f3a-b844-c59ed20f382c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 269. UUID: a6611f6f...
  UPDATE contracts SET
    license_plate = '817009',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'a6611f6f-15dc-4a58-bed6-5f5f09c4a401'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 270. UUID: a7af5960...
  UPDATE contracts SET
    license_plate = '7059',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'a7af5960-7c97-4ef9-afb3-e5315c74bddb'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 271. UUID: a9ecf99d...
  UPDATE contracts SET
    license_plate = '2774',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'a9ecf99d-9e39-4906-95aa-5afef3680867'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 272. UUID: aa5d3348...
  UPDATE contracts SET
    license_plate = '7043',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'aa5d3348-58e6-40da-aad5-abb51f0d1139'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 273. UUID: aab29d80...
  UPDATE contracts SET
    license_plate = '5896',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'aab29d80-e167-4de2-8d51-1def01e47cd2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 274. UUID: aab90aff...
  UPDATE contracts SET
    license_plate = '185573',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'aab90aff-a563-4c5c-9215-86912ad14a39'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 275. UUID: ab9006e1...
  UPDATE contracts SET
    license_plate = '8213',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'ab9006e1-e3e5-40ae-95da-b70478bbff74'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 276. UUID: abe0ae02...
  UPDATE contracts SET
    license_plate = '2779',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'abe0ae02-f97b-48a1-85f2-3c387fb84015'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 277. UUID: ac162613...
  UPDATE contracts SET
    license_plate = '725473',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'ac162613-6c96-45c8-94a5-a1b9ccc8fa10'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 278. UUID: ace9b9da...
  UPDATE contracts SET
    license_plate = '2769',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'ace9b9da-59ed-45f9-9c4a-af7763b3694a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 279. UUID: ad0bfe01...
  UPDATE contracts SET
    license_plate = '893411',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'ad0bfe01-91b0-4e2b-b0ef-94d3ee62442b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 280. UUID: ae0e6a62...
  UPDATE contracts SET
    license_plate = '754436',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'ae0e6a62-b7ed-4370-8d30-d5634ed7841a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 281. UUID: ae8f3164...
  UPDATE contracts SET
    license_plate = '335485',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'ae8f3164-06c4-44e6-af83-103e14bac274'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 282. UUID: ae8fb26a...
  UPDATE contracts SET
    license_plate = '5894',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'ae8fb26a-2a8f-4f41-afb8-c46b2c5ba248'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 283. UUID: aee0b5d4...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'aee0b5d4-b432-4f2d-895e-3a26b342dc1f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 284. UUID: b104e2c1...
  UPDATE contracts SET
    license_plate = '2769',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b104e2c1-c292-4438-a2bb-89833d94a090'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 285. UUID: b115d561...
  UPDATE contracts SET
    license_plate = '7077',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b115d561-6e24-4c8e-b4b0-6a4bdf2888b9'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 286. UUID: b1238537...
  UPDATE contracts SET
    license_plate = '756104',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'b1238537-1e72-4db7-8228-a9dccfc52f09'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 287. UUID: b1bf81ef...
  UPDATE contracts SET
    license_plate = '7058',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b1bf81ef-c6cb-447c-b0c2-7efef2caf3a8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 288. UUID: b1efeb51...
  UPDATE contracts SET
    license_plate = '5894',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b1efeb51-d74a-4888-acda-09fbe4f34a8a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 289. UUID: b27451b9...
  UPDATE contracts SET
    license_plate = '8203',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'b27451b9-35a4-44cc-be91-42b4e6241664'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 290. UUID: b2995873...
  UPDATE contracts SET
    license_plate = '335750',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'b2995873-d610-4f4c-911b-17da48a634a7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 291. UUID: b379e720...
  UPDATE contracts SET
    license_plate = '10849',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'b379e720-3c11-478c-8bcd-a18e5699929c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 292. UUID: b54cea0c...
  UPDATE contracts SET
    license_plate = '9890',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'b54cea0c-0271-4378-a4fa-09bc56ba3aff'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 293. UUID: b559a860...
  UPDATE contracts SET
    license_plate = '5899',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b559a860-e4ae-431e-92d4-5b54a78de404'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 294. UUID: b786fdfc...
  UPDATE contracts SET
    license_plate = '5893',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b786fdfc-13f5-4da3-bb77-4a4e39170b80'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 295. UUID: b88d5e5a...
  UPDATE contracts SET
    license_plate = '856718',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b88d5e5a-206a-41a0-9e41-cb13d04096f1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 296. UUID: b89f8bf1...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b89f8bf1-e065-4029-9716-c06bb10f1679'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 297. UUID: b8b1e4f8...
  UPDATE contracts SET
    license_plate = '7070',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b8b1e4f8-c16c-4e7a-af3a-693298f52d9b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 298. UUID: b942658f...
  UPDATE contracts SET
    license_plate = '2777',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b942658f-7440-4ce9-b27f-9a2291a54ca5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 299. UUID: b958e772...
  UPDATE contracts SET
    license_plate = '10855',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'b958e772-17df-4353-a33e-223d2876204f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 300. UUID: b9926e72...
  UPDATE contracts SET
    license_plate = '7069',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b9926e72-4ba4-40b8-91df-02debfef9194'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '   Progress: 300 processed...';

  -- 301. UUID: b9cb79fc...
  UPDATE contracts SET
    license_plate = '2768',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b9cb79fc-224b-4189-9d49-95fbca7a3344'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 302. UUID: b9fa07b9...
  UPDATE contracts SET
    license_plate = '2778',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'b9fa07b9-a761-4789-a07f-b11dd6468378'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 303. UUID: bb250afb...
  UPDATE contracts SET
    license_plate = '7055',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bb250afb-8a93-44d9-84bf-709907df50da'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 304. UUID: bbe5c681...
  UPDATE contracts SET
    license_plate = '5893',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bbe5c681-48e8-4e88-b805-1a927a4d1eae'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 305. UUID: bc01b144...
  UPDATE contracts SET
    license_plate = '2773',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bc01b144-31f7-4170-a8f0-d26450c3b9e3'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 306. UUID: bc2b3c8a...
  UPDATE contracts SET
    license_plate = '7038',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bc2b3c8a-fba1-47c7-a905-9d703d303076'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 307. UUID: bcc1a5e9...
  UPDATE contracts SET
    license_plate = '7071',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bcc1a5e9-3081-4cc4-a8a6-f3bef32b0960'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 308. UUID: bd8954b8...
  UPDATE contracts SET
    license_plate = '2768',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bd8954b8-d5d2-4b48-b3cb-0f24d5e9e91f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 309. UUID: bd9896dd...
  UPDATE contracts SET
    license_plate = '5890',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bd9896dd-26f7-468f-b85f-178a3a854a6f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 310. UUID: be7490e2...
  UPDATE contracts SET
    license_plate = '185573',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'be7490e2-de0f-487c-b206-4f92bb4f2f89'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 311. UUID: bee04bc9...
  UPDATE contracts SET
    license_plate = '5896',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bee04bc9-e7ea-4ac7-88ea-a3fb3e81cf31'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 312. UUID: bf555715...
  UPDATE contracts SET
    license_plate = '4018',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'bf555715-8afa-4dfc-b5f6-96d19151b99d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 313. UUID: bfd1ef96...
  UPDATE contracts SET
    license_plate = '7065',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'bfd1ef96-1902-4175-938d-2684e27df893'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 314. UUID: c188baa9...
  UPDATE contracts SET
    license_plate = '7056',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'c188baa9-4167-4f0c-a3c6-38b75efaedab'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 315. UUID: c22e454b...
  UPDATE contracts SET
    license_plate = '7043',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'c22e454b-a25f-4a8d-92a1-5e47fcadf44e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 316. UUID: c23f92e3...
  UPDATE contracts SET
    license_plate = '857051',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'c23f92e3-95d8-49b5-bc25-890e7a6e6104'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 317. UUID: c2abe202...
  UPDATE contracts SET
    license_plate = '2773',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'c2abe202-f745-4bb6-b6fa-a3c865fff5ef'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 318. UUID: c4d5ca5f...
  UPDATE contracts SET
    license_plate = '4016',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'c4d5ca5f-af3d-4e7c-be63-5ca0f421e0f7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 319. UUID: c5e36156...
  UPDATE contracts SET
    license_plate = '7078',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'c5e36156-3eb4-4af0-9517-89d9b7b58a61'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 320. UUID: c6a9657a...
  UPDATE contracts SET
    license_plate = '9894',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'c6a9657a-c206-467e-bb42-82b2b2e3f32a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 321. UUID: c6af0206...
  UPDATE contracts SET
    license_plate = '11473',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'c6af0206-78a7-41cb-909c-440106f805f6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 322. UUID: c6d44899...
  UPDATE contracts SET
    license_plate = '893410',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'c6d44899-7c89-4e87-8918-a2c3c259329f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 323. UUID: c85fef7e...
  UPDATE contracts SET
    license_plate = '7067',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'c85fef7e-ab8f-40fe-a78d-f5ae18762379'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 324. UUID: c8b27798...
  UPDATE contracts SET
    license_plate = '741277',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'c8b27798-093c-4599-99c7-2405eb2b3815'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 325. UUID: c9033829...
  UPDATE contracts SET
    license_plate = '7034',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'c9033829-d7eb-4bd3-888e-68d83a8843a2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 326. UUID: ca766fa7...
  UPDATE contracts SET
    license_plate = '862165',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'ca766fa7-e1f3-4267-8a5d-a6208d73d799'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 327. UUID: cb2f7978...
  UPDATE contracts SET
    license_plate = '749762',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'cb2f7978-c947-438d-860a-9fd17d19d3be'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 328. UUID: cb545720...
  UPDATE contracts SET
    license_plate = '746956',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'cb545720-e485-48cf-adf6-ba1fe017a7c8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 329. UUID: cc57b82b...
  UPDATE contracts SET
    license_plate = '10189',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'cc57b82b-f68f-4365-ab4e-1a203392215c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 330. UUID: cd08b5eb...
  UPDATE contracts SET
    license_plate = '4016',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'cd08b5eb-08d1-44d8-b9a1-2aaf5b1ef909'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 331. UUID: cd344933...
  UPDATE contracts SET
    license_plate = '7041',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'cd344933-c938-4a2a-918a-9fdb74baad14'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 332. UUID: cdb86b29...
  UPDATE contracts SET
    license_plate = '8214',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'cdb86b29-ac34-4aa1-aa48-01572946bcee'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 333. UUID: ce638de2...
  UPDATE contracts SET
    license_plate = '234',
    make = 'testt',
    model = 'test',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'ce638de2-5699-4f92-a650-a73319d9eda1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 334. UUID: cedc7531...
  UPDATE contracts SET
    license_plate = '749403',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'cedc7531-cdd2-4ee9-bda5-09cdf9425164'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 335. UUID: cf7e1e1d...
  UPDATE contracts SET
    license_plate = '856715',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'cf7e1e1d-3657-4b4e-b55c-6f285e58805e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 336. UUID: cfb9935a...
  UPDATE contracts SET
    license_plate = '10197',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'cfb9935a-449f-4ebc-9e0f-07852a56c8d8'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 337. UUID: d0024c82...
  UPDATE contracts SET
    license_plate = '2766',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'd0024c82-ae6a-42e3-b8c2-0db952589975'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 338. UUID: d3a9e795...
  UPDATE contracts SET
    license_plate = '893410',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'd3a9e795-9755-44cd-b86d-fc969eeabe06'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 339. UUID: d3f43f12...
  UPDATE contracts SET
    license_plate = '2773',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'd3f43f12-bbc6-4aac-97f2-df8a6f5adf88'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 340. UUID: d43ddbe0...
  UPDATE contracts SET
    license_plate = '10669',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'd43ddbe0-8224-464b-a98e-fae47ad322ab'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 341. UUID: d68854f5...
  UPDATE contracts SET
    license_plate = '21860',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'd68854f5-5d49-458f-a7b2-3ed4925f6f11'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 342. UUID: d69df23e...
  UPDATE contracts SET
    license_plate = '746956',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'd69df23e-ad0b-4e87-8732-308a934e2f6d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 343. UUID: d6ae7918...
  UPDATE contracts SET
    license_plate = '754436',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'd6ae7918-7d3a-4fd5-93c1-d8dba351bed9'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 344. UUID: d72363e3...
  UPDATE contracts SET
    license_plate = '10855',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'd72363e3-f5fe-42f1-a493-eb3f514542b0'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 345. UUID: d8090c1a...
  UPDATE contracts SET
    license_plate = '8208',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'd8090c1a-b4fa-4d9a-bad7-28b8addd7dc5'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 346. UUID: da332970...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'da332970-c11d-4d4e-87fb-e2946fbe5f52'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 347. UUID: da711b1f...
  UPDATE contracts SET
    license_plate = '10064',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'da711b1f-8b39-4940-8947-53d02d76d068'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 348. UUID: da7efc03...
  UPDATE contracts SET
    license_plate = '2769',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'da7efc03-2478-447f-ad09-2f5d1acf3518'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 349. UUID: daf6b39f...
  UPDATE contracts SET
    license_plate = '8208',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'daf6b39f-6732-4ade-93bd-4920a108ba7d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 350. UUID: db5ea68b...
  UPDATE contracts SET
    license_plate = '676281',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'db5ea68b-0373-45d5-bcfb-0f70f01d9163'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '   Progress: 350 processed...';

  -- 351. UUID: dbf67c27...
  UPDATE contracts SET
    license_plate = '856715',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'dbf67c27-acd0-45ac-b9b1-7da4ebc3d890'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 352. UUID: dcde5e02...
  UPDATE contracts SET
    license_plate = '749403',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'dcde5e02-9754-49f2-999e-8174494d2b9b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 353. UUID: dd00a813...
  UPDATE contracts SET
    license_plate = '10669',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'dd00a813-daa1-44e6-9349-68b9bca86fbf'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 354. UUID: dd1ef7c1...
  UPDATE contracts SET
    license_plate = '706150',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'dd1ef7c1-be86-4f84-9e8d-68cfb2ab1d57'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 355. UUID: dda4da76...
  UPDATE contracts SET
    license_plate = '756104',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'dda4da76-7827-458e-b20d-f54e6c6240da'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 356. UUID: de079c22...
  UPDATE contracts SET
    license_plate = '856925',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'de079c22-7af7-4756-ba15-770fbfb93162'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 357. UUID: de9615f2...
  UPDATE contracts SET
    license_plate = '751340',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'de9615f2-d86e-4d7f-a8f4-8a9c1f7bce74'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 358. UUID: df9cfc82...
  UPDATE contracts SET
    license_plate = '7039',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'df9cfc82-48e4-485c-8734-7f5d2dd8b3e3'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 359. UUID: e04bca0a...
  UPDATE contracts SET
    license_plate = '10858',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'e04bca0a-06e8-4c76-bde7-b48eb3df033b'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 360. UUID: e082a3f0...
  UPDATE contracts SET
    license_plate = '847932',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e082a3f0-210b-49c0-a3a2-af14d0f0a2e2'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 361. UUID: e0c762a5...
  UPDATE contracts SET
    license_plate = '7062',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e0c762a5-96d1-49d1-9e74-031f6d88704a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 362. UUID: e26b1c86...
  UPDATE contracts SET
    license_plate = '10856',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'e26b1c86-7fed-4f32-a0e6-f8f34af00fa9'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 363. UUID: e34be632...
  UPDATE contracts SET
    license_plate = '8204',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'e34be632-7a27-48b1-a356-93bdf4915ce4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 364. UUID: e3992a48...
  UPDATE contracts SET
    license_plate = '7074',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e3992a48-3b48-4204-bf6b-ed96c4b4b70e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 365. UUID: e3a25342...
  UPDATE contracts SET
    license_plate = '819027',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'e3a25342-8878-4cf9-b89a-a3c7222aee2a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 366. UUID: e4712486...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e4712486-36ac-4477-a550-8e6dfdb0dd43'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 367. UUID: e528030b...
  UPDATE contracts SET
    license_plate = '722134',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e528030b-1627-47eb-9065-010160eb0574'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 368. UUID: e596b728...
  UPDATE contracts SET
    license_plate = '7062',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e596b728-c8fc-44a0-8a4f-1018d22bf355'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 369. UUID: e6e6a987...
  UPDATE contracts SET
    license_plate = '857045',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e6e6a987-ff5d-4ba4-a835-99b70b06c0be'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 370. UUID: e82230ce...
  UPDATE contracts SET
    license_plate = '5891',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e82230ce-2b3c-424e-8abf-6307c6ef6376'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 371. UUID: e926a266...
  UPDATE contracts SET
    license_plate = '648144',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e926a266-47f6-4599-b27e-653e12716d72'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 372. UUID: e97ee77a...
  UPDATE contracts SET
    license_plate = '846560',
    make = 'Ford',
    model = 'TERRITORY',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'e97ee77a-887e-48dc-9a2b-a3145f30beeb'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 373. UUID: ea78e1d8...
  UPDATE contracts SET
    license_plate = '7061',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'ea78e1d8-4b1d-40b2-8fd5-3803fc3ba618'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 374. UUID: ead9ecb7...
  UPDATE contracts SET
    license_plate = '5898',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'ead9ecb7-2668-4acb-996e-563615cc2cc7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 375. UUID: eaf5d47d...
  UPDATE contracts SET
    license_plate = '906077',
    make = 'Bestune',
    model = 'T99',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'eaf5d47d-fc4d-40fb-9a75-2461d00ba828'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 376. UUID: ebc7e0bb...
  UPDATE contracts SET
    license_plate = '893410',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'ebc7e0bb-0352-402b-a3cb-9ead076a2502'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 377. UUID: ec28ab7f...
  UPDATE contracts SET
    license_plate = '8204',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'ec28ab7f-321b-413e-a5b9-6b1cb5d93401'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 378. UUID: ecc9be18...
  UPDATE contracts SET
    license_plate = '862169',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'ecc9be18-6706-4b4a-915e-fc9cfb27ddce'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 379. UUID: ed080d3e...
  UPDATE contracts SET
    license_plate = '570468',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'ed080d3e-6a51-4a48-94e6-f345a115fb7f'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 380. UUID: ed8722ae...
  UPDATE contracts SET
    license_plate = 'TEST-123',
    make = 'Toyota',
    model = 'Camry',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'ed8722ae-50ac-4c2a-b4a6-6eaa56c527de'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 381. UUID: edd9cce8...
  UPDATE contracts SET
    license_plate = '754436',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'edd9cce8-bd34-4b0b-b122-ff5a0705e55e'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 382. UUID: eee917d5...
  UPDATE contracts SET
    license_plate = '2771',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'eee917d5-7887-404e-94d3-95813629f57c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 383. UUID: eeea195b...
  UPDATE contracts SET
    license_plate = '2781',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'eeea195b-0fbb-4c65-840c-c61d55c5f5fd'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 384. UUID: ef3e101c...
  UPDATE contracts SET
    license_plate = '816508',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'ef3e101c-8509-4402-b8ee-f5ef61417682'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 385. UUID: efb69414...
  UPDATE contracts SET
    license_plate = '817009',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'efb69414-2329-4363-8952-bdc71eba50ae'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 386. UUID: efc1e33c...
  UPDATE contracts SET
    license_plate = '9902',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'efc1e33c-eae0-4d4f-8ced-1a80c1f1cd3c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 387. UUID: eff2acc1...
  UPDATE contracts SET
    license_plate = '10064',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'eff2acc1-5833-4fae-92ed-733deabb0a7c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 388. UUID: f0f289a1...
  UPDATE contracts SET
    license_plate = '711289',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f0f289a1-e7d5-48d1-8d3b-ae450911bc4c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 389. UUID: f0feeb02...
  UPDATE contracts SET
    license_plate = '21849',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f0feeb02-0771-445a-9427-9363e457c5f4'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 390. UUID: f146581f...
  UPDATE contracts SET
    license_plate = '9999',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'f146581f-bd7a-4e6b-add5-14956d48e1b1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 391. UUID: f2765695...
  UPDATE contracts SET
    license_plate = '7056',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f2765695-5fda-4127-91a2-914f7d3219eb'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 392. UUID: f2976d42...
  UPDATE contracts SET
    license_plate = '10858',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'f2976d42-d1b6-4ad9-b4e9-a3afd49407aa'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 393. UUID: f4372dbb...
  UPDATE contracts SET
    license_plate = '7078',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f4372dbb-8811-444f-838a-a40a4634b476'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 394. UUID: f45e11c6...
  UPDATE contracts SET
    license_plate = '7066',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f45e11c6-a8c9-401b-9876-a180e2b35afd'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 395. UUID: f46238d1...
  UPDATE contracts SET
    license_plate = '721440',
    make = 'Bestune',
    model = 'B70',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f46238d1-b560-4207-b00c-76dd9d32f451'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 396. UUID: f4a79405...
  UPDATE contracts SET
    license_plate = '10854',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'f4a79405-ba23-43b3-adee-12fab27fbf74'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 397. UUID: f5629138...
  UPDATE contracts SET
    license_plate = '862165',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'f5629138-9f79-4995-95b6-c18f8478e57a'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 398. UUID: f5d97095...
  UPDATE contracts SET
    license_plate = '7057',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f5d97095-a9cc-42e5-b7a5-4034307bf1c9'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 399. UUID: f61365fd...
  UPDATE contracts SET
    license_plate = '7072',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f61365fd-f401-408c-9ba1-994dc42d92ea'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 400. UUID: f6b754ed...
  UPDATE contracts SET
    license_plate = '4016',
    make = 'GAC',
    model = 'GS3',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'f6b754ed-567c-4bd4-b20c-13131aa3f6c1'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '   Progress: 400 processed...';

  -- 401. UUID: f6e92359...
  UPDATE contracts SET
    license_plate = '2782',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f6e92359-f332-4522-a027-daf24597958c'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 402. UUID: f7bf8b1d...
  UPDATE contracts SET
    license_plate = '7035',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'f7bf8b1d-7412-4bee-ac1c-b1ad9886a173'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 403. UUID: fb4e198a...
  UPDATE contracts SET
    license_plate = '7076',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'fb4e198a-c2a6-497b-b378-6a15c61f0e35'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 404. UUID: fb993adf...
  UPDATE contracts SET
    license_plate = '7035',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'fb993adf-60e3-438a-8306-7f1f493fe279'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 405. UUID: fc0d7030...
  UPDATE contracts SET
    license_plate = '557098',
    make = 'MG5',
    model = 'MG5',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'fc0d7030-7b1f-4d22-be52-8d194919d0b0'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 406. UUID: fc26f24e...
  UPDATE contracts SET
    license_plate = '10666',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'fc26f24e-adfc-4fca-b0c1-7240ba2bf7ed'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 407. UUID: fc3b17d8...
  UPDATE contracts SET
    license_plate = '7057',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'fc3b17d8-95f3-418b-b7ed-63361c1e1aba'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 408. UUID: fcc5f363...
  UPDATE contracts SET
    license_plate = '5888',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'fcc5f363-3e30-4f11-883f-74018736f163'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 409. UUID: fd599c38...
  UPDATE contracts SET
    license_plate = '234',
    make = 'testt',
    model = 'test',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'fd599c38-c3e8-45fb-87cd-2e2dcbe59b92'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 410. UUID: fd656121...
  UPDATE contracts SET
    license_plate = '2775',
    make = 'Bestune',
    model = 'T77',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'fd656121-d6a6-421c-aa31-6cf323653a74'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 411. UUID: fd6ecacb...
  UPDATE contracts SET
    license_plate = '7041',
    make = 'Bestune',
    model = 'T77 pro',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'fd6ecacb-3a58-4897-863d-644b4b206863'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 412. UUID: fd70f009...
  UPDATE contracts SET
    license_plate = '21860',
    make = 'Bestune',
    model = 'B70s',
    year = 2023,
    updated_at = NOW()
  WHERE id = 'fd70f009-2e0b-4f06-ab46-e6c1a8c6a2a6'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 413. UUID: fe1d7f3d...
  UPDATE contracts SET
    license_plate = '10672',
    make = 'changan',
    model = 'Alsvin',
    year = 2024,
    updated_at = NOW()
  WHERE id = 'fe1d7f3d-f4c4-4855-9105-d7a28e91f69d'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 414. UUID: fed3b2c8...
  UPDATE contracts SET
    license_plate = '21875',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'fed3b2c8-c330-4b10-b593-ac364efd3bc7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  -- 415. UUID: fee6bde5...
  UPDATE contracts SET
    license_plate = '10171',
    make = 'Bestune',
    model = 'T33',
    year = 2022,
    updated_at = NOW()
  WHERE id = 'fee6bde5-1d58-4ac7-9879-177b7ce66ac7'
    AND company_id = v_company_id
    AND (license_plate IS NULL OR TRIM(license_plate) = '');
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_updated;

  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ UPDATE COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Total contracts updated: %', v_total_updated;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEP:';
  RAISE NOTICE 'Run complete_alaraf_vehicle_sync.sql to create/link vehicles!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;

-- Verification
SELECT 
  '✅ Contracts with vehicle data' as status,
  COUNT(*) as total
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND license_plate IS NOT NULL
  AND TRIM(license_plate) != '';

-- Show samples
SELECT 
  '📋 Sample Contracts' as section,
  contract_number,
  license_plate,
  make,
  model,
  year,
  vehicle_id
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND license_plate IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
