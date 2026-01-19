#!/usr/bin/env python3
"""
Execute the cancelled contracts migration in batches using Supabase API
"""

import re
import time

# Read the data file
with open('c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/insert_customers.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract and process data
pattern = r"\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)"
matches = re.findall(pattern, content)

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

print(f"📊 Total contracts to process: {len(processed_data)}")
print(f"⏱️  This will take approximately {len(processed_data) // 10} iterations")
print("")

# Generate compact SQL statements for manual execution
batch_size = 10
total_batches = (len(processed_data) + batch_size - 1) // batch_size

for batch_num in range(total_batches):
    start_idx = batch_num * batch_size
    end_idx = min(start_idx + batch_size, len(processed_data))
    batch = processed_data[start_idx:end_idx]
    
    output_file = f'c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/compact_batch_{batch_num + 1:03d}.sql'
    
    sql_parts = []
    for item in batch:
        contract_num = item['contract_num'].replace("'", "''")
        plate = item['plate']
        name = item['name']
        phone = item['phone']
        
        # Compact single-line DO block
        sql_parts.append(f"DO $$ DECLARE v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'; v_vehicle_id UUID; v_customer_id UUID; v_contract_id UUID; BEGIN SELECT id INTO v_vehicle_id FROM vehicles WHERE plate_number = '{plate}' AND company_id = v_company_id LIMIT 1; IF v_vehicle_id IS NULL THEN RETURN; END IF; SELECT id INTO v_customer_id FROM customers WHERE phone = '{phone}' AND company_id = v_company_id LIMIT 1; IF v_customer_id IS NULL THEN WITH next_code AS (SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)), 0) + 1 as code FROM customers WHERE company_id = v_company_id AND customer_code LIKE 'IND-25-%') INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at) SELECT v_company_id, 'individual', '{name}', '{phone}', 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW() FROM next_code RETURNING id INTO v_customer_id; ELSE UPDATE customers SET first_name = '{name}', updated_at = NOW() WHERE id = v_customer_id; END IF; SELECT id INTO v_contract_id FROM contracts WHERE contract_number = '{contract_num}' AND company_id = v_company_id AND status = 'cancelled' LIMIT 1; IF v_contract_id IS NOT NULL THEN UPDATE contracts SET vehicle_id = v_vehicle_id, customer_id = v_customer_id, license_plate = '{plate}', updated_at = NOW() WHERE id = v_contract_id; UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_vehicle_id AND status != 'rented'; END IF; END $$;")
    
    # Add progress check
    sql_parts.append(f"SELECT COUNT(*) as processed FROM contracts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND status = 'cancelled' AND vehicle_id IS NOT NULL;")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(sql_parts))
    
    print(f"✅ Created compact_batch_{batch_num + 1:03d}.sql ({len(batch)} contracts, {start_idx + 1}-{end_idx})")

print(f"\n{'='*60}")
print(f"✅ Generated {total_batches} compact batch files")
print(f"📁 Files: compact_batch_001.sql through compact_batch_{total_batches:03d}.sql")
print(f"{'='*60}")
print("\n💡 Execute these using mcp_supabase_execute_sql tool")
print("   Each batch processes 10 contracts and shows progress")
