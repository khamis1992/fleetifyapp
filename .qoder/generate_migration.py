"""
Process all cancelled contracts from insert_customers.sql
This script reads the data and processes it in batches
"""
import re

# Read the SQL file
with open('c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/insert_customers.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all data
pattern = r"\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)"
matches = re.findall(pattern, content)

# Filter out test contracts
filtered = []
for contract_num, plate, name, phone in matches:
    if (not contract_num.startswith('LT0RO') and 
        not contract_num.startswith('test') and 
        plate != 'TEST-123'):
        phone_clean = phone.replace('.0', '')
        name_escaped = name.replace("'", "''")
        filtered.append((contract_num, plate, name_escaped, phone_clean))

print(f"Total contracts to process: {len(filtered)}")

# Generate the complete SQL migration
sql = """-- ===============================
-- Link ALL Remaining Cancelled Contracts
-- Generated from insert_customers.sql
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
  RAISE NOTICE 'Processing cancelled contracts...';
  
  CREATE TEMP TABLE temp_contract_data (
    contract_number TEXT,
    plate TEXT,
    customer_name TEXT,
    phone TEXT
  );
  
  INSERT INTO temp_contract_data VALUES
"""

# Add all data
for i, (contract_num, plate, name, phone) in enumerate(filtered):
    if i > 0:
        sql += ",\n"
    sql += f"    ('{contract_num}', '{plate}', '{name}', '{phone}')"

sql += """;
  
  FOR v_contract_data IN
    SELECT DISTINCT contract_number, plate, customer_name, phone
    FROM temp_contract_data
  LOOP
    SELECT id INTO v_vehicle_id FROM vehicles 
    WHERE plate_number = v_contract_data.plate AND company_id = v_company_id LIMIT 1;
    
    IF v_vehicle_id IS NULL THEN
      v_skipped_no_vehicle := v_skipped_no_vehicle + 1;
      CONTINUE;
    END IF;
    
    SELECT id INTO v_customer_id FROM customers 
    WHERE phone = v_contract_data.phone AND company_id = v_company_id LIMIT 1;
    
    IF v_customer_id IS NULL THEN
      BEGIN
        WITH next_code AS (
          SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
          FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
        )
        INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
        SELECT v_company_id, 'individual', v_contract_data.customer_name, v_contract_data.phone,
               'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
        FROM next_code RETURNING id INTO v_customer_id;
        v_created_customers := v_created_customers + 1;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_customer_id FROM customers WHERE phone = v_contract_data.phone AND company_id = v_company_id LIMIT 1;
      END;
    ELSE
      UPDATE customers SET first_name = v_contract_data.customer_name, updated_at = NOW() WHERE id = v_customer_id;
      v_updated_customers := v_updated_customers + 1;
    END IF;
    
    SELECT id INTO v_contract_id FROM contracts
    WHERE contract_number = v_contract_data.contract_number AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
    
    IF v_contract_id IS NOT NULL THEN
      UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, 
      license_plate = v_contract_data.plate, updated_at = NOW() WHERE id = v_contract_id;
      v_updated_contracts := v_updated_contracts + 1;
      
      UPDATE vehicles SET status = 'available', updated_at = NOW()
      WHERE id = v_vehicle_id AND status != 'rented';
    ELSE
      v_skipped_no_contract := v_skipped_no_contract + 1;
    END IF;
    
    IF v_updated_contracts % 50 = 0 THEN
      RAISE NOTICE 'Processed % contracts...', v_updated_contracts;
    END IF;
  END LOOP;
  
  DROP TABLE temp_contract_data;
  
  RAISE NOTICE '';
  RAISE NOTICE '========== Complete ==========';
  RAISE NOTICE 'Contracts Updated: %', v_updated_contracts;
  RAISE NOTICE 'Customers Created: %', v_created_customers;
  RAISE NOTICE 'Customers Updated: %', v_updated_customers;
  RAISE NOTICE 'Skipped (no vehicle): %', v_skipped_no_vehicle;
  RAISE NOTICE 'Skipped (no contract): %', v_skipped_no_contract;
END $$;
"""

# Write to file
with open('c:/Users/khamis/Desktop/fleetifyapp-3/supabase/migrations/20251025200000_link_all_cancelled_from_file.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"Migration file created with {len(filtered)} contracts!")
print("File: 20251025200000_link_all_cancelled_from_file.sql")
