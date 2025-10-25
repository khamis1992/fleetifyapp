#!/usr/bin/env python3
"""
Apply cancelled contracts migration for العراف company
Processes 392 contracts from insert_customers.sql
"""

import re
import os
import subprocess
import json

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

print(f"Processing {len(processed_data)} cancelled contracts...")

# Process in batches of 50
batch_size = 50
total_batches = (len(processed_data) + batch_size - 1) // batch_size

for batch_num in range(total_batches):
    start_idx = batch_num * batch_size
    end_idx = min(start_idx + batch_size, len(processed_data))
    batch = processed_data[start_idx:end_idx]
    
    # Build SQL for this batch
    sql_parts = []
    sql_parts.append("DO $$")
    sql_parts.append("DECLARE")
    sql_parts.append("  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';")
    sql_parts.append("  v_vehicle_id UUID;")
    sql_parts.append("  v_customer_id UUID;")
    sql_parts.append("  v_contract_id UUID;")
    sql_parts.append("BEGIN")
    
    for item in batch:
        contract_num = item['contract_num'].replace("'", "''")
        plate = item['plate']
        name = item['name']
        phone = item['phone']
        
        sql_parts.append(f"""
  -- Process contract {contract_num}
  SELECT id INTO v_vehicle_id FROM vehicles 
  WHERE plate_number = '{plate}' AND company_id = v_company_id LIMIT 1;
  
  IF v_vehicle_id IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM customers 
    WHERE phone = '{phone}' AND company_id = v_company_id LIMIT 1;
    
    IF v_customer_id IS NULL THEN
      BEGIN
        WITH next_code AS (
          SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code
          FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%'
        )
        INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
        SELECT v_company_id, 'individual', '{name}', '{phone}',
               'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
        FROM next_code RETURNING id INTO v_customer_id;
      EXCEPTION WHEN unique_violation THEN
        SELECT id INTO v_customer_id FROM customers WHERE phone = '{phone}' AND company_id = v_company_id LIMIT 1;
      END;
    ELSE
      UPDATE customers SET first_name = '{name}', updated_at = NOW() WHERE id = v_customer_id;
    END IF;
    
    SELECT id INTO v_contract_id FROM contracts
    WHERE contract_number = '{contract_num}' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1;
    
    IF v_contract_id IS NOT NULL THEN
      UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, 
      license_plate = '{plate}', updated_at = NOW() WHERE id = v_contract_id;
      
      UPDATE vehicles SET status = 'available', updated_at = NOW()
      WHERE id = v_vehicle_id AND status != 'rented';
    END IF;
  END IF;
""")
    
    sql_parts.append("  RAISE NOTICE 'Batch % complete', " + str(batch_num + 1) + ";")
    sql_parts.append("END $$;")
    
    sql = '\n'.join(sql_parts)
    
    # Write to temp file
    temp_file = f'c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/batch_{batch_num + 1}.sql'
    with open(temp_file, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    print(f"Batch {batch_num + 1}/{total_batches}: Processing contracts {start_idx + 1}-{end_idx}...")
    
    # Execute using supabase CLI
    cmd = f'npx supabase db execute --file "{temp_file}"  --linked'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd='c:/Users/khamis/Desktop/fleetifyapp-3')
    
    if result.returncode != 0:
        print(f"  ERROR in batch {batch_num + 1}:")
        print(result.stderr)
        break
    else:
        print(f"  ✓ Batch {batch_num + 1} complete")
    
    # Clean up temp file
    if os.path.exists(temp_file):
        os.remove(temp_file)

print(f"\n{'='*60}")
print("Migration complete!")
print(f"Processed {end_idx} contracts across {batch_num + 1} batches")
print(f"{'='*60}")
