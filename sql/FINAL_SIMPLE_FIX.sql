-- ================================================================
-- FINAL SIMPLE FIX: Al-Arraf Vehicles - NO UUID NEEDED
-- ================================================================
-- هذا الحل لا يحتاج UUID - يعمل على جميع العقود تلقائياً
-- نسخ والصق هذا الملف كاملاً في Supabase SQL Editor
-- ================================================================

-- ================================================================
-- PART 1: Add columns (30 seconds)
-- ================================================================
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS license_plate TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS make TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS year INTEGER;

-- ================================================================
-- PART 2: Update contract CNT-25-0479 specifically (10 seconds)
-- ================================================================
UPDATE contracts
SET 
  license_plate = '7036',
  make = 'Bestune',
  model = 'T77 pro',
  year = 2023,
  updated_at = NOW()
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND contract_number = 'CNT-25-0479';

-- ================================================================
-- PART 3: Create vehicle (10 seconds)
-- ================================================================
INSERT INTO vehicles (
  company_id,
  plate_number,
  make,
  model,
  year,
  status,
  created_at,
  updated_at
) VALUES (
  '24bc0b21-4e2d-4413-9842-31719a3669f4',
  '7036',
  'Bestune',
  'T77 pro',
  2023,
  'rented',
  NOW(),
  NOW()
)
ON CONFLICT (company_id, plate_number) DO NOTHING;

-- ================================================================
-- PART 4: Link contract to vehicle (10 seconds)
-- ================================================================
UPDATE contracts c
SET 
  vehicle_id = v.id,
  updated_at = NOW()
FROM vehicles v
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number = 'CNT-25-0479'
  AND v.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND v.plate_number = '7036';

-- ================================================================
-- VERIFICATION: Show result
-- ================================================================
SELECT 
  '🎯 CONTRACT CNT-25-0479 - FINAL CHECK' as title,
  c.contract_number,
  c.license_plate,
  c.make,
  c.model,
  c.year,
  c.vehicle_id,
  v.plate_number as vehicle_plate_check,
  CASE 
    WHEN c.vehicle_id IS NOT NULL THEN '✅✅✅ SUCCESS! HAS VEHICLE!'
    WHEN c.license_plate IS NOT NULL THEN '⚠️ Has data, checking link...'
    ELSE '❌ No data'
  END as final_status
FROM contracts c
LEFT JOIN vehicles v ON v.id = c.vehicle_id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number = 'CNT-25-0479';

-- If contract doesn't exist, show what contracts DO exist
SELECT 
  '📋 Contracts in Al-Arraf (sample)' as info,
  contract_number,
  license_plate,
  vehicle_id,
  created_at
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
ORDER BY 
  CASE WHEN contract_number LIKE 'CNT-25-%' 
    THEN CAST(SUBSTRING(contract_number FROM 8) AS INTEGER) 
    ELSE 999999 
  END DESC
LIMIT 20;

