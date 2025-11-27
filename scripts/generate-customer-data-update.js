/**
 * Generate SQL to update customer phone & civil_id
 * Uses smart matching by customer name
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
const insertPattern = /INSERT INTO agreements_with_details VALUES \('[^']+', '[^']*', '[^']*', '[^']*', '[^']*', [^,]+, '[^']*', '[^']*', '[^']*', '[^']*', '[^']*', \d+, '[^']*', '([^']*)', ([^,]*), ([^,]+), '([^']*)',/g;

const customerData = [];
let match;

while ((match = insertPattern.exec(content)) !== null) {
  const [_, customer_name, customer_email, customer_phone, customer_driver_license] = match;
  
  // Clean phone number
  const phone = customer_phone ? customer_phone.trim().replace(/\.0$/, '') : null;
  
  // Only add if we have useful data
  if (customer_name && customer_name.trim() && (phone || customer_driver_license)) {
    customerData.push({
      name: customer_name.trim(),
      email: customer_email === 'NULL' ? null : customer_email,
      phone: phone,
      civil_id: customer_driver_license ? customer_driver_license.trim() : null
    });
  }
}

console.log(`✅ Extracted ${customerData.length} customer records`);

// Generate SQL
let sql = `-- ================================================================
-- SMART UPDATE: Customer Phone & Civil ID
-- ================================================================
-- Auto-generated from agreements_with_details.sql
-- Total records: ${customerData.length}
-- Matching strategy: Customer Name (fuzzy match)
-- Updates: phone, civil_id/driver_license_number
-- ================================================================

-- ================================================================
-- STAGE 1: Create temp table with customer data
-- ================================================================
DROP TABLE IF EXISTS temp_customer_data;

CREATE TEMP TABLE temp_customer_data (
  customer_name TEXT,
  email TEXT,
  phone TEXT,
  civil_id TEXT
);

-- Insert all customer data
INSERT INTO temp_customer_data (customer_name, email, phone, civil_id) VALUES\n`;

// Add all VALUES
customerData.forEach((cust, idx) => {
  const email = cust.email ? `'${cust.email.replace(/'/g, "''")}'` : 'NULL';
  const phone = cust.phone ? `'${cust.phone}'` : 'NULL';
  const civil_id = cust.civil_id ? `'${cust.civil_id.replace(/'/g, "''")}'` : 'NULL';
  
  sql += `  ('${cust.name.replace(/'/g, "''")}', ${email}, ${phone}, ${civil_id})`;
  sql += (idx < customerData.length - 1) ? ',\n' : ';\n\n';
});

sql += `-- ================================================================
-- STAGE 2: Smart matching and update customers
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
  RAISE NOTICE '📞 SMART UPDATE: Customer Phone & Civil ID';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Processing ${customerData.length} customer records...';
  RAISE NOTICE '';
  
  FOR v_rec IN SELECT * FROM temp_customer_data WHERE phone IS NOT NULL OR civil_id IS NOT NULL
  LOOP
    v_progress := v_progress + 1;
    
    -- Smart matching by customer name
    UPDATE customers c
    SET 
      phone = COALESCE(c.phone, v_rec.phone),
      civil_id = COALESCE(c.civil_id, v_rec.civil_id),
      driver_license_number = COALESCE(c.driver_license_number, v_rec.civil_id),
      email = COALESCE(c.email, v_rec.email),
      updated_at = NOW()
    WHERE c.company_id = v_company_id
      AND (
        -- Name matching (fuzzy)
        LOWER(TRIM(COALESCE(c.first_name_ar, c.company_name_ar, c.first_name_en, c.company_name_en, ''))) 
          = LOWER(TRIM(v_rec.customer_name))
        OR LOWER(TRIM(COALESCE(c.first_name_ar, c.company_name_ar, c.first_name_en, c.company_name_en, ''))) 
          LIKE '%' || LOWER(TRIM(v_rec.customer_name)) || '%'
        OR LOWER(TRIM(v_rec.customer_name)) 
          LIKE '%' || LOWER(TRIM(COALESCE(c.first_name_ar, c.company_name_ar, c.first_name_en, c.company_name_en, ''))) || '%'
      )
      AND (
        -- Only update if phone or civil_id is missing
        c.phone IS NULL 
        OR TRIM(c.phone) = '' 
        OR c.civil_id IS NULL 
        OR TRIM(c.civil_id) = ''
        OR c.driver_license_number IS NULL
      );
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated > 0 THEN
      v_matched := v_matched + v_updated;
    END IF;
    
    -- Progress every 50 records
    IF v_progress % 50 = 0 THEN
      RAISE NOTICE '   Progress: % / ${customerData.length} processed...', v_progress;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total customers updated: %', v_matched;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Sample updated customers
SELECT 
  '✅ Sample Updated Customers (Top 20)' as section,
  COALESCE(first_name_ar, company_name_ar, first_name_en) as customer_name,
  phone,
  civil_id,
  driver_license_number,
  email,
  CASE 
    WHEN phone IS NOT NULL AND phone != '' THEN '✅'
    ELSE '❌'
  END as has_phone,
  CASE 
    WHEN civil_id IS NOT NULL AND civil_id != '' THEN '✅'
    WHEN driver_license_number IS NOT NULL THEN '✅'
    ELSE '❌'
  END as has_id
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND (
    phone IS NOT NULL 
    OR civil_id IS NOT NULL 
    OR driver_license_number IS NOT NULL
  )
ORDER BY updated_at DESC
LIMIT 20;

-- Statistics
SELECT 
  '📊 Customer Data Statistics' as report,
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as with_phone,
  COUNT(*) FILTER (WHERE civil_id IS NOT NULL AND civil_id != '') as with_civil_id,
  COUNT(*) FILTER (WHERE driver_license_number IS NOT NULL AND driver_license_number != '') as with_license,
  ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) || '%' as phone_coverage,
  ROUND(COUNT(*) FILTER (WHERE civil_id IS NOT NULL OR driver_license_number IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) || '%' as id_coverage
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Check specific customer (issam abdallah)
SELECT 
  '🔍 Customer: issam abdallah' as check_type,
  COALESCE(first_name_ar, company_name_ar) as name,
  phone,
  civil_id,
  driver_license_number,
  email
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND (
    LOWER(first_name_ar) LIKE '%issam%'
    OR LOWER(first_name_ar) LIKE '%abdallah%'
  )
LIMIT 5;

-- Clean up
DROP TABLE IF EXISTS temp_customer_data;

-- ================================================================
-- SUMMARY
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ CUSTOMER DATA UPDATE COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 What was done:';
  RAISE NOTICE '1. ✅ Matched customers by name (fuzzy matching)';
  RAISE NOTICE '2. ✅ Updated phone numbers';
  RAISE NOTICE '3. ✅ Updated civil IDs / driver licenses';
  RAISE NOTICE '4. ✅ Updated email addresses';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Check the statistics above!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Only updated customers with missing data';
  RAISE NOTICE '   (Won''t overwrite existing data)';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;
`;

// Write to file
const outputPath = path.join(__dirname, 'UPDATE_CUSTOMER_PHONE_AND_ID.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');

console.log('');
console.log('✅ Generated: UPDATE_CUSTOMER_PHONE_AND_ID.sql');
console.log(`📊 Total customer records: ${customerData.length}`);
console.log('');
console.log('🎯 This script updates:');
console.log('   - phone (رقم الهاتف)');
console.log('   - civil_id (رقم البطاقة الشخصية)');
console.log('   - driver_license_number (رقم رخصة القيادة)');
console.log('   - email (البريد الإلكتروني)');
console.log('');
console.log('🚀 Next: Run UPDATE_CUSTOMER_PHONE_AND_ID.sql in Supabase Dashboard');
console.log('');

