/**
 * Generate COMPLETE Smart Matching SQL
 * Reads agreements_with_details.sql and creates smart matching script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read agreements file
const filePath = path.join(__dirname, '.qoder', 'agreements_with_details.sql');
const content = fs.readFileSync(filePath, 'utf-8');

// Extract INSERT statements
const insertPattern = /INSERT INTO agreements_with_details VALUES \('([^']+)', '[^']*', '[^']*', '[^']*', '[^']*', ([^,]+), '[^']*', '[^']*', '([^']*)', '([^']*)', '([^']*)', (\d+), '[^']*', '([^']*)',/g;

const agreements = [];
let match;

while ((match = insertPattern.exec(content)) !== null) {
  const [_, uuid, rent_amount, license_plate, make, model, year, customer_name] = match;
  
  // Only add if we have vehicle data
  if (license_plate && license_plate.trim()) {
    agreements.push({
      uuid,
      customer_name: customer_name.trim(),
      rent_amount: parseFloat(rent_amount),
      license_plate: license_plate.trim(),
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year)
    });
  }
}

console.log(`✅ Extracted ${agreements.length} agreements with vehicle data`);

// Generate SQL
let sql = `-- ================================================================
-- COMPLETE SMART MATCHING: All Al-Arraf Contracts
-- ================================================================
-- Auto-generated from agreements_with_details.sql
-- Total records: ${agreements.length}
-- Matching strategy: Customer Name + Rental Amount
-- ================================================================

-- ================================================================
-- STAGE 1: Add columns
-- ================================================================
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS license_plate TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS make TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS year INTEGER;

-- ================================================================
-- STAGE 2: Create temp table with all agreement data
-- ================================================================
DROP TABLE IF EXISTS temp_agreements_full;

CREATE TEMP TABLE temp_agreements_full (
  customer_name TEXT,
  rent_amount NUMERIC,
  license_plate TEXT,
  make TEXT,
  model TEXT,
  year INTEGER
);

-- Insert all data
INSERT INTO temp_agreements_full (customer_name, rent_amount, license_plate, make, model, year) VALUES\n`;

// Add all VALUES
agreements.forEach((agr, idx) => {
  sql += `  ('${agr.customer_name.replace(/'/g, "''")}', ${agr.rent_amount}, '${agr.license_plate}', '${agr.make}', '${agr.model}', ${agr.year})`;
  sql += (idx < agreements.length - 1) ? ',\n' : ';\n\n';
});

sql += `-- ================================================================
-- STAGE 3: Smart matching and update
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_matched INTEGER := 0;
  v_updated INTEGER := 0;
  v_rec RECORD;
  v_progress INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🧠 SMART MATCHING: Processing ${agreements.length} agreements';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  FOR v_rec IN SELECT * FROM temp_agreements_full
  LOOP
    v_progress := v_progress + 1;
    
    -- Smart matching
    UPDATE contracts c
    SET 
      license_plate = v_rec.license_plate,
      make = v_rec.make,
      model = v_rec.model,
      year = v_rec.year,
      updated_at = NOW()
    FROM customers cust
    WHERE c.customer_id = cust.id
      AND c.company_id = v_company_id
      AND (c.license_plate IS NULL OR TRIM(c.license_plate) = '')
      AND (
        -- Customer name matching (fuzzy)
        LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, cust.first_name_en, cust.company_name_en, ''))) 
          LIKE '%' || LOWER(TRIM(v_rec.customer_name)) || '%'
        OR LOWER(TRIM(v_rec.customer_name)) 
          LIKE '%' || LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, cust.first_name_en, cust.company_name_en, ''))) || '%'
      )
      AND (
        -- Rental amount verification
        v_rec.rent_amount = 0
        OR c.monthly_amount = v_rec.rent_amount
        OR c.contract_amount = v_rec.rent_amount
        OR ABS(COALESCE(c.monthly_amount, 0) - v_rec.rent_amount) <= (v_rec.rent_amount * 0.1)
        OR ABS(COALESCE(c.contract_amount, 0) - v_rec.rent_amount) <= (v_rec.rent_amount * 0.1)
      );
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated > 0 THEN
      v_matched := v_matched + v_updated;
    END IF;
    
    -- Progress every 50 records
    IF v_progress % 50 = 0 THEN
      RAISE NOTICE '   Progress: % / ${agreements.length} processed...', v_progress;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total contracts matched: %', v_matched;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- STAGE 4: Create vehicles
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_created INTEGER := 0;
BEGIN
  RAISE NOTICE '🚗 Creating missing vehicles...';
  
  INSERT INTO vehicles (
    company_id,
    plate_number,
    make,
    model,
    year,
    status,
    created_at,
    updated_at
  )
  SELECT DISTINCT ON (TRIM(c.license_plate))
    v_company_id,
    TRIM(c.license_plate),
    TRIM(c.make),
    TRIM(c.model),
    c.year,
    'rented'::vehicle_status,
    NOW(),
    NOW()
  FROM contracts c
  WHERE c.company_id = v_company_id
    AND c.license_plate IS NOT NULL
    AND TRIM(c.license_plate) != ''
    AND NOT EXISTS (
      SELECT 1 FROM vehicles v 
      WHERE v.company_id = v_company_id 
        AND TRIM(v.plate_number) = TRIM(c.license_plate)
    )
  ON CONFLICT (company_id, plate_number) DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  RAISE NOTICE '✅ Created % new vehicles', v_created;
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STAGE 5: Link contracts to vehicles
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_linked INTEGER := 0;
BEGIN
  RAISE NOTICE '🔗 Linking contracts to vehicles...';
  
  UPDATE contracts c
  SET 
    vehicle_id = v.id,
    updated_at = NOW()
  FROM vehicles v
  WHERE c.company_id = v_company_id
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL
    AND TRIM(c.license_plate) != ''
    AND v.company_id = v_company_id
    AND TRIM(v.plate_number) = TRIM(c.license_plate);
  
  GET DIAGNOSTICS v_linked = ROW_COUNT;
  RAISE NOTICE '✅ Linked % contracts to vehicles', v_linked;
  RAISE NOTICE '';
END $$;

-- ================================================================
-- FINAL VERIFICATION
-- ================================================================

-- Check CNT-25-0479 specifically
SELECT 
  '🎯 CONTRACT CNT-25-0479 - FINAL STATUS' as title,
  c.contract_number,
  cust.first_name_ar as customer,
  c.license_plate,
  c.make,
  c.model,
  c.year,
  c.monthly_amount as rent,
  c.vehicle_id,
  v.plate_number as vehicle_plate,
  CASE 
    WHEN c.vehicle_id IS NOT NULL THEN '🎉 SUCCESS! HAS VEHICLE!'
    WHEN c.license_plate IS NOT NULL THEN '⚠️ Has data but not linked'
    ELSE '❌ No vehicle data'
  END as final_status
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
LEFT JOIN vehicles v ON v.id = c.vehicle_id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number = 'CNT-25-0479';

-- Overall statistics
SELECT 
  '📊 Overall Statistics' as report,
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE license_plate IS NOT NULL) as with_vehicle_data,
  COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL) as linked_to_vehicles,
  ROUND(COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) || '%' as success_rate
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Sample of matched contracts
SELECT 
  '✅ Sample Matched Contracts (Top 10)' as section,
  c.contract_number,
  cust.first_name_ar as customer,
  c.license_plate,
  c.make || ' ' || c.model as vehicle,
  CASE WHEN c.vehicle_id IS NOT NULL THEN '✅' ELSE '⚠️' END as linked
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.license_plate IS NOT NULL
ORDER BY c.updated_at DESC
LIMIT 10;

-- Clean up
DROP TABLE IF EXISTS temp_agreements_full;
`;

// Write to file
const outputPath = path.join(__dirname, 'COMPLETE_SMART_MATCHING.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');

console.log('');
console.log('✅ Generated: COMPLETE_SMART_MATCHING.sql');
console.log(`📊 Total agreements: ${agreements.length}`);
console.log('');
console.log('🎯 This script uses SMART MATCHING:');
console.log('   1. Customer name (fuzzy match)');
console.log('   2. Rental amount (with 10% tolerance)');
console.log('');
console.log('🚀 Next: Run COMPLETE_SMART_MATCHING.sql in Supabase Dashboard');
console.log('');

