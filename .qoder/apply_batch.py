#!/usr/bin/env python3
"""
Apply cancelled contracts migration using mcp_supabase_execute_sql
This creates a simpler SQL that can be executed
"""

import re

# Read and parse the data file
with open('c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/insert_customers.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all data
pattern = r"\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)"
matches = re.findall(pattern, content)

# Filter test data and clean
processed_data = []
for contract_num, plate, name, phone in matches:
    if (not contract_num.startswith('LT0RO') and 
        not contract_num.startswith('test') and 
        plate != 'TEST-123'):
        phone_clean = phone.replace('.0', '')
        name_escaped = name.replace("'", "''")
        processed_data.append({
            'contract_num': contract_num,
            'plate': plate,
            'name': name_escaped,
            'phone': phone_clean
        })

print(f"Total contracts to process: {len(processed_data)}")

# Generate batch SQL files (50 contracts per batch)
batch_size = 50
for batch_num in range(0, len(processed_data), batch_size):
    batch = processed_data[batch_num:batch_num + batch_size]
    batch_index = batch_num // batch_size + 1
    
    output_file = f'c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_{batch_index:02d}.sql'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"-- Batch {batch_index} ({len(batch)} contracts)\n\n")
        
        for item in batch:
            contract_num = item['contract_num'].replace("'", "''")
            plate = item['plate']
            name = item['name']
            phone = item['phone']
            
            f.write(f"""
-- Process {contract_num} / {plate}
DO $$ 
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id UUID;
  v_customer_id UUID;
  v_contract_id UUID;
BEGIN
  SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '{plate}' AND company_id = v_company_id LIMIT 1;
  IF v_vehicle_id IS NULL THEN RETURN; END IF;
  
  SELECT id INTO v_customer_id FROM customers WHERE phone = '{phone}' AND company_id = v_company_id LIMIT 1;
  IF v_customer_id IS NULL THEN
    BEGIN
      WITH next_code AS (
        SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
        FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
      )
      INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
      SELECT v_company_id, 'individual', '{name}', '{phone}', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
      FROM next_code RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id FROM customers WHERE phone = '{phone}' AND company_id = v_company_id LIMIT 1;
    END;
  ELSE
    UPDATE customers SET first_name = '{name}', updated_at = NOW() WHERE id = v_customer_id;
  END IF;
  
  SELECT id INTO v_contract_id FROM contracts WHERE contract_number = '{contract_num}' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
  IF v_contract_id IS NOT NULL THEN
    UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '{plate}', updated_at = NOW() WHERE id = v_contract_id;
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented';
  END IF;
END $$;
""")
    
    print(f"Created batch_{batch_index:02d}.sql with {len(batch)} contracts")

print(f"\nGenerated {(len(processed_data) + batch_size - 1) // batch_size} batch files")
print("You can now execute them one by one using mcp_supabase_execute_sql")
