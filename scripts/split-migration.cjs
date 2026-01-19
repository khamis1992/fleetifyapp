/**
 * Split large migration file into smaller batches
 * Usage: node scripts/split-migration.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'supabase', 'migrations', '20251025200000_link_all_cancelled_from_file.sql');
const OUTPUT_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const BATCH_SIZE = 50;
const BASE_TIMESTAMP = '20251025200000';

// Read the original migration file
const content = fs.readFileSync(INPUT_FILE, 'utf8');

// Extract the INSERT VALUES section
const insertStart = content.indexOf('INSERT INTO temp_contract_data VALUES');
const insertEnd = content.indexOf(';', insertStart);
const insertSection = content.substring(insertStart, insertEnd);

// Parse all VALUES rows
const valuesMatch = insertSection.match(/\([^)]+\)/g);
if (!valuesMatch) {
  console.error('❌ Could not parse VALUES rows');
  process.exit(1);
}

console.log(`📊 Found ${valuesMatch.length} contract rows`);

// Split into batches
const batches = [];
for (let i = 0; i < valuesMatch.length; i += BATCH_SIZE) {
  batches.push(valuesMatch.slice(i, i + BATCH_SIZE));
}

console.log(`📦 Split into ${batches.length} batches of ~${BATCH_SIZE} contracts each`);

// Generate migration files for each batch
batches.forEach((batch, index) => {
  const batchNumber = index + 1;
  const timestamp = `${BASE_TIMESTAMP}${String(batchNumber).padStart(2, '0')}`;
  const filename = `${timestamp}_link_cancelled_batch_${batchNumber}.sql`;
  const filepath = path.join(OUTPUT_DIR, filename);

  const batchSQL = `-- ===============================
-- Link Cancelled Contracts - Batch ${batchNumber}/${batches.length}
-- Auto-generated from split-migration.js
-- Processing contracts ${index * BATCH_SIZE + 1} to ${Math.min((index + 1) * BATCH_SIZE, valuesMatch.length)}
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
  RAISE NOTICE 'Processing batch ${batchNumber}/${batches.length} (${batch.length} contracts)...';

  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );

  INSERT INTO temp_contract_data VALUES
${batch.map((row, i) => `    ${row}${i < batch.length - 1 ? ',' : ';'}`).join('\n')}

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
  RAISE NOTICE '========== Batch ${batchNumber}/${batches.length} Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
  RAISE NOTICE '======================================';
END $$;
`;

  fs.writeFileSync(filepath, batchSQL, 'utf8');
  console.log(`✅ Created: ${filename} (${batch.length} contracts)`);
});

console.log('');
console.log('🎉 Migration split complete!');
console.log('');
console.log('📋 Next steps:');
console.log('1. Review the generated batch files in supabase/migrations/');
console.log('2. Run each batch in sequence:');
batches.forEach((_, index) => {
  const batchNumber = index + 1;
  const timestamp = `${BASE_TIMESTAMP}${String(batchNumber).padStart(2, '0')}`;
  const filename = `${timestamp}_link_cancelled_batch_${batchNumber}.sql`;
  console.log(`   npx supabase db execute --file supabase/migrations/${filename}`);
});
console.log('');
console.log('💡 Tip: Each batch should complete in <10 seconds');
