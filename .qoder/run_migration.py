import re
import sys

# Read the insert_customers.sql file
with open('c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/insert_customers.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all data
pattern = r"\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)"
matches = re.findall(pattern, content)

# Filter and process
processed_data = []
for contract_num, plate, name, phone in matches:
    if (not contract_num.startswith('LT0RO') and 
        not contract_num.startswith('test') and 
        plate != 'TEST-123'):
        phone_clean = phone.replace('.0', '')
        name_escaped = name.replace("'", "''")
        processed_data.append((contract_num, plate, name_escaped, phone_clean))

print(f"Total contracts to process: {len(processed_data)}")
print(f"\n-- Processing {len(processed_data)} cancelled contracts for العراف company")
print("-- This will link contracts to vehicles and update customer information")
