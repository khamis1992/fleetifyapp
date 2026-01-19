import re

# Read the input file
with open('c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/insert_customers.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all VALUES rows
pattern = r"\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)"
matches = re.findall(pattern, content)

# Generate the INSERT statements
output_lines = []
for contract_num, plate, name, phone in matches:
    # Clean phone number (remove .0)
    phone_clean = phone.replace('.0', '')
    # Escape single quotes in names
    name_escaped = name.replace("'", "''")
    output_lines.append(f"    ('{contract_num}', '{plate}', '{name_escaped}', '{phone_clean}')")

# Join with commas
output = ',\n'.join(output_lines) + ';'

# Write to output file
with open('c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/converted_data.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"Converted {len(matches)} rows")
print("Output written to converted_data.txt")
