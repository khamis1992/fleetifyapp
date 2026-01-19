/**
 * Convert agreements_with_details.sql to UPDATE statements
 * Generates SQL to update contracts table with vehicle data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the file
const filePath = path.join(__dirname, '.qoder', 'agreements_with_details.sql');
const content = fs.readFileSync(filePath, 'utf-8');

// Split into lines
const lines = content.split('\n');

// Output file
let output = `-- ================================================================
-- AUTO-GENERATED: Update Contracts with Vehicle Data
-- ================================================================
-- Generated from: agreements_with_details.sql
-- Total records: ${lines.filter(l => l.startsWith('INSERT')).length}
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

`;

let count = 0;

// Process each INSERT line
for (const line of lines) {
  if (line.startsWith('INSERT INTO agreements_with_details VALUES')) {
    // Extract values using regex
    const match = line.match(/\('([^']+)', '[^']*', '[^']*', '[^']*', '[^']*', [^,]+, '[^']*', '[^']*', '([^']*)', '([^']*)', '([^']*)', (\d+),/);
    
    if (match) {
      const [_, uuid, license_plate, make, model, year] = match;
      
      // Only process if we have vehicle data
      if (license_plate && license_plate.trim()) {
        count++;
        
        output += `  -- ${count}. UUID: ${uuid.substring(0, 8)}...\n`;
        output += `  UPDATE contracts SET\n`;
        output += `    license_plate = '${license_plate}',\n`;
        output += `    make = '${make}',\n`;
        output += `    model = '${model}',\n`;
        output += `    year = ${year},\n`;
        output += `    updated_at = NOW()\n`;
        output += `  WHERE id = '${uuid}'\n`;
        output += `    AND company_id = v_company_id\n`;
        output += `    AND (license_plate IS NULL OR TRIM(license_plate) = '');\n`;
        output += `  GET DIAGNOSTICS v_updated = ROW_COUNT;\n`;
        output += `  v_total_updated := v_total_updated + v_updated;\n`;
        output += `\n`;
        
        // Progress every 50 records
        if (count % 50 === 0) {
          output += `  RAISE NOTICE '   Progress: ${count} processed...';\n\n`;
        }
      }
    }
  }
}

output += `  RAISE NOTICE '';
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
`;

// Write output
const outputPath = path.join(__dirname, 'UPDATE_all_alaraf_contracts.sql');
fs.writeFileSync(outputPath, output, 'utf-8');

console.log('✅ Generated:', outputPath);
console.log(`📊 Total UPDATE statements: ${count}`);
console.log('');
console.log('🎯 Next: Run UPDATE_all_alaraf_contracts.sql in Supabase Dashboard');

