/**
 * Generate SQL to update contract numbers from agreements_with_details.sql
 * Uses smart matching by customer name + rental amount
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
const insertPattern = /INSERT INTO agreements_with_details VALUES \('[^']+', '([^']*)', '[^']*', '[^']*', '[^']*', ([^,]+), '[^']*', '[^']*', '([^']*)', '[^']*', '[^']*', \d+, '[^']*', '([^']*)',/g;

const contractData = [];
let match;

while ((match = insertPattern.exec(content)) !== null) {
  const [_, agreement_number, rent_amount, license_plate, customer_name] = match;
  
  // Only add if we have data to match
  if (agreement_number && agreement_number.trim() && customer_name && customer_name.trim()) {
    contractData.push({
      old_number: agreement_number.trim(),
      customer_name: customer_name.trim(),
      rent_amount: parseFloat(rent_amount),
      license_plate: license_plate ? license_plate.trim() : null
    });
  }
}

console.log(`✅ Extracted ${contractData.length} contract records`);

// Generate SQL
let sql = `-- ================================================================
-- UPDATE CONTRACT NUMBERS: Match agreements_with_details.sql
-- ================================================================
-- Auto-generated from agreements_with_details.sql
-- Total records: ${contractData.length}
-- Strategy: Match by customer name + rental amount, then update contract number
-- ================================================================

-- ================================================================
-- STAGE 1: Create temp table with old contract numbers
-- ================================================================
DROP TABLE IF EXISTS temp_old_contract_numbers;

CREATE TEMP TABLE temp_old_contract_numbers (
  old_contract_number TEXT,
  customer_name TEXT,
  rent_amount NUMERIC,
  license_plate TEXT
);

-- Insert all old contract data
INSERT INTO temp_old_contract_numbers (old_contract_number, customer_name, rent_amount, license_plate) VALUES\n`;

// Add all VALUES
contractData.forEach((data, idx) => {
  const plate = data.license_plate ? `'${data.license_plate}'` : 'NULL';
  sql += `  ('${data.old_number.replace(/'/g, "''")}', '${data.customer_name.replace(/'/g, "''")}', ${data.rent_amount}, ${plate})`;
  sql += (idx < contractData.length - 1) ? ',\n' : ';\n\n';
});

sql += `-- ================================================================
-- STAGE 2: Backup current contract numbers
-- ================================================================
CREATE TABLE IF NOT EXISTS contract_number_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID,
  old_contract_number TEXT,
  new_contract_number TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- STAGE 3: Smart matching and update contract numbers
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_matched INTEGER := 0;
  v_updated INTEGER := 0;
  v_rec RECORD;
  v_progress INTEGER := 0;
  v_current_number TEXT;
  v_contract_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔄 UPDATING CONTRACT NUMBERS TO MATCH AGREEMENTS FILE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Processing ${contractData.length} contracts...';
  RAISE NOTICE '';
  
  FOR v_rec IN SELECT * FROM temp_old_contract_numbers
  LOOP
    v_progress := v_progress + 1;
    
    -- Find matching contract by customer name + rental amount
    SELECT c.id, c.contract_number INTO v_contract_id, v_current_number
    FROM contracts c
    INNER JOIN customers cust ON cust.id = c.customer_id
    WHERE c.company_id = v_company_id
      AND (
        -- Customer name matching (fuzzy)
        LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, ''))) 
          LIKE '%' || LOWER(TRIM(v_rec.customer_name)) || '%'
        OR LOWER(TRIM(v_rec.customer_name)) 
          LIKE '%' || LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, ''))) || '%'
      )
      AND (
        -- Rental amount verification
        v_rec.rent_amount = 0
        OR c.monthly_amount = v_rec.rent_amount
        OR c.contract_amount = v_rec.rent_amount
        OR ABS(COALESCE(c.monthly_amount, 0) - v_rec.rent_amount) <= (v_rec.rent_amount * 0.1)
        OR ABS(COALESCE(c.contract_amount, 0) - v_rec.rent_amount) <= (v_rec.rent_amount * 0.1)
      )
      AND (
        -- License plate matching (if available)
        v_rec.license_plate IS NULL
        OR c.license_plate IS NULL
        OR c.license_plate = v_rec.license_plate
      )
    LIMIT 1;
    
    -- If contract found, update the number
    IF v_contract_id IS NOT NULL THEN
      -- Backup old number
      INSERT INTO contract_number_history (contract_id, old_contract_number, new_contract_number)
      VALUES (v_contract_id, v_current_number, v_rec.old_contract_number)
      ON CONFLICT DO NOTHING;
      
      -- Update contract number
      UPDATE contracts
      SET 
        contract_number = v_rec.old_contract_number,
        updated_at = NOW()
      WHERE id = v_contract_id
        AND company_id = v_company_id;
      
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      
      IF v_updated > 0 THEN
        v_matched := v_matched + 1;
      END IF;
    END IF;
    
    -- Progress every 50 records
    IF v_progress % 50 = 0 THEN
      RAISE NOTICE '   Progress: % / ${contractData.length} processed...', v_progress;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total contracts updated: %', v_matched;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Check if CNT-25-0479 was updated to old number
SELECT 
  '🔍 Checking contract numbers' as check_type,
  c.contract_number,
  cust.first_name_ar as customer,
  c.license_plate,
  c.monthly_amount,
  h.old_contract_number as previous_number
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
LEFT JOIN contract_number_history h ON h.contract_id = c.id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number IN ('LTO2024139', 'LTO2024341', 'LTO20249', 'CNT-25-0479')
ORDER BY c.contract_number
LIMIT 10;

-- Show sample of updated contracts
SELECT 
  '✅ Sample Updated Contract Numbers' as section,
  c.contract_number as new_number,
  h.old_contract_number as was_before,
  cust.first_name_ar as customer,
  c.license_plate,
  c.updated_at
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
LEFT JOIN contract_number_history h ON h.contract_id = c.id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND h.old_contract_number IS NOT NULL
ORDER BY c.updated_at DESC
LIMIT 20;

-- Statistics
SELECT 
  '📊 Update Statistics' as report,
  COUNT(DISTINCT contract_id) as total_contracts_updated,
  COUNT(*) as total_history_records
FROM contract_number_history;

-- Sample old vs new numbers
SELECT 
  '📋 Old vs New Contract Numbers' as section,
  old_contract_number as from_CNT_format,
  new_contract_number as to_old_format,
  updated_at
FROM contract_number_history
ORDER BY updated_at DESC
LIMIT 10;

-- Clean up
DROP TABLE IF EXISTS temp_old_contract_numbers;

-- ================================================================
-- SUMMARY
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ CONTRACT NUMBERS UPDATE COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 What was done:';
  RAISE NOTICE '1. ✅ Matched contracts by customer name + rental amount';
  RAISE NOTICE '2. ✅ Backed up current numbers to contract_number_history';
  RAISE NOTICE '3. ✅ Updated contract_number to match agreements file';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Check the results above!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Example:';
  RAISE NOTICE '   CNT-25-0479 → LTO2024341 (issam abdallah)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ You can rollback if needed using contract_number_history table';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;
`;

// Write to file
const outputPath = path.join(__dirname, 'UPDATE_CONTRACT_NUMBERS_TO_OLD_FORMAT.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');

console.log('');
console.log('✅ Generated: UPDATE_CONTRACT_NUMBERS_TO_OLD_FORMAT.sql');
console.log(`📊 Total contracts: ${contractData.length}`);
console.log('');
console.log('🎯 This script will:');
console.log('   1. Match contracts by customer name + rental amount');
console.log('   2. Backup current numbers (CNT-25-XXXX)');
console.log('   3. Update to old numbers (LTO2024XXX, MR2024XXX, etc.)');
console.log('');
console.log('⚠️ Example transformation:');
console.log('   CNT-25-0479 → LTO2024341');
console.log('');
console.log('🚀 Next: Run UPDATE_CONTRACT_NUMBERS_TO_OLD_FORMAT.sql in Supabase');
console.log('');

