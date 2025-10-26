const fs = require('fs');
const path = require('path');

// Load vehicle data from the JSON file
const vehicleDataPath = path.join(__dirname, 'vehicle-numbers.json');
const { vehicleMap } = JSON.parse(fs.readFileSync(vehicleDataPath, 'utf-8'));

console.log('/*');
console.log(' * SQL Script to Fix Cancelled Contracts for Alaraf Company');
console.log(' * Generated on:', new Date().toISOString());
console.log(' * This script will:');
console.log(' *  1. Find or create customers with correct information from vehicles_data.sql');
console.log(' *  2. Update contracts to ensure they have correct monthly amounts');
console.log(' *  3. Link contracts to the correct customers');
console.log(' */\n');

console.log('-- Company ID: 24bc0b21-4e2d-4413-9842-31719a3669f4\n');

// Generate SQL for each vehicle in the reference data
Object.entries(vehicleMap).forEach(([vehicleNumber, vehicleData]) => {
  console.log(`\n-- Vehicle ${vehicleNumber}: ${vehicleData.customer_name}`);
  console.log(`-- Expected: Phone ${vehicleData.phone_number}, Start ${vehicleData.contract_start_date}, Monthly ${vehicleData.monthly_payment}`);

  // Step 1: Find or create customer
  console.log(`
DO $$
DECLARE
  v_customer_id UUID;
  v_contract_count INT;
BEGIN
  -- Find customer by phone for ${vehicleData.customer_name}
  SELECT id INTO v_customer_id
  FROM customers
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND phone = '${vehicleData.phone_number}'
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (
      id,
      company_id,
      first_name_ar,
      customer_type,
      phone,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '24bc0b21-4e2d-4413-9842-31719a3669f4',
      '${vehicleData.customer_name.replace(/'/g, "''")}',
      'individual',
      '${vehicleData.phone_number}',
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_customer_id;

    RAISE NOTICE 'Created new customer % (phone: ${vehicleData.phone_number}) with ID %', '${vehicleData.customer_name.replace(/'/g, "''")}', v_customer_id;
  ELSE
    RAISE NOTICE 'Found existing customer with phone ${vehicleData.phone_number}, ID: %', v_customer_id;

    -- Update customer name if missing
    UPDATE customers
    SET first_name_ar = '${vehicleData.customer_name.replace(/'/g, "''")}'
    WHERE id = v_customer_id
      AND (first_name_ar IS NULL OR first_name_ar = '');
  END IF;

  -- Update all cancelled contracts for this vehicle
  UPDATE contracts
  SET
    customer_id = v_customer_id,
    monthly_amount = ${vehicleData.monthly_payment}
  WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND status = 'cancelled'
    AND license_plate = '${vehicleNumber}'
    AND (
      customer_id != v_customer_id
      OR monthly_amount::numeric != ${vehicleData.monthly_payment}::numeric
    );

  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  IF v_contract_count > 0 THEN
    RAISE NOTICE 'Updated % contract(s) for vehicle ${vehicleNumber}', v_contract_count;
  END IF;

END $$;
`);
});

console.log('\n\n-- End of script');
console.log('-- Total vehicles processed:', Object.keys(vehicleMap).length);
