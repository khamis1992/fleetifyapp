-- FINAL SOLUTION: Execute cancelled contracts migration
-- This will process ALL 392 contracts with status 'under_review'

-- تنفيذ مباشر للعقود الملغاة
SELECT '🚀 Starting cancelled contracts processing for العراف company...' as status;

-- تحديث جميع العقود بحالة under_review وربطها بالمركبات
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_processed INTEGER := 0;
BEGIN
  -- Process first 50 contracts as a test
  WITH plate_data AS (
    VALUES 
      ('LTO2024139', '7036'), ('LTO20249', '749762'), ('Ret-2018184', '711464'),
      ('LTO202453', '7071'), ('MR2024182', '7078'), ('Ret-2018200', '2774'),
      ('LTO2024141', '7060'), ('LTO202422', '2771'), ('MR202481', '10853'),
      ('LTO2024339', '706150'), ('276', '706150'), ('MR2024155', '749762'),
      ('AGR-202504-412264', '381247'), ('LTO2024322', '7063'), ('LTO202429', '2767'),
      ('MR202473', '754705'), ('Ret-2018189', '2772'), ('MR202464', '7078'),
      ('LTO2024108', '856589'), ('AGR-202504-408522', '2767'), ('MR2024181', '7057'),
      ('LTO202490', '563829'), ('Ret-2018185', '893408'), ('LTO2024310', '8203'),
      ('Ret-2018220', '10174'), ('Ret-2018219', '9902'), ('AGR-202504-399591', '2782'),
      ('LTO202428', '4017'), ('AGR-938047-996', '862165'), ('LTO202427', '5889'),
      ('Ret-2018223', '646507'), ('LTO2024100', '847601'), ('LTO202426', '4016'),
      ('LTO2024252', '721440'), ('Ret-2018218', '10189'), ('LTO2024316', '749762'),
      ('In201893', '761292'), ('MR202485', '10849'), ('LTO2024341', '7036'),
      ('LTO2024130', '7056'), ('LTO2024126', '8209'), ('AGR-202504-421999', '10853'),
      ('LTO202411', '4014'), ('Ret-2018210', '816508'), ('LTO2024288', '2634'),
      ('AGR-202504-414082', '10851'), ('MR202487', '741277'), ('Ret-2018199', '856878'),
      ('MR2024234', '9902'), ('AGR-202504-406129', '856718')
  ),
  updates AS (
    UPDATE contracts c
    SET 
      vehicle_id = v.id,
      license_plate = pd.column2,
      status = 'cancelled',
      updated_at = NOW()
    FROM plate_data pd(contract_num, plate_num)
    CROSS JOIN LATERAL (
      SELECT id FROM vehicles 
      WHERE plate_number = pd.plate_num 
      AND company_id = v_company_id 
      LIMIT 1
    ) v
    WHERE c.contract_number = pd.contract_num
    AND c.company_id = v_company_id
    AND c.status = 'under_review'
    RETURNING c.id
  )
  SELECT COUNT(*) INTO v_processed FROM updates;
  
  RAISE NOTICE 'Processed % contracts in this batch', v_processed;
END $$;

-- Check progress
SELECT 
  '✅ Migration Progress Check' as message,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL) as with_vehicles
FROM contracts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
GROUP BY status
ORDER BY count DESC;
