import json
import re

# Read the original file
with open(r'C:\Users\khamis\.claude\projects\C--Users-khamis-Desktop-fleetifyapp\0ae2e5db-5b8f-421b-9219-b20d370b78ab\tool-results\mcp-plugin_supabase_supabase-execute_sql-1768227316699.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the JSON data
start_idx = content.find('[{')
if start_idx != -1:
    end_idx = content.rfind('}]')
    if end_idx != -1:
        json_str = content[start_idx+2:end_idx]

        # The string contains \\\\" (3 backslashes + quote)
        # We need to do the replacement twice: \\\\" -> \\" -> "
        json_unescaped = re.sub(r'\\\"', '"', json_str)
        json_unescaped = re.sub(r'\\\"', '"', json_unescaped)

        # Verify transformation
        print("First 200 chars after unescaping:")
        print(json_unescaped[:200])

        # Now extract contract records
        contracts = []

        # Use a regex to extract contract objects
        obj_pattern = r'\{[^}]*"contract_number":"([^"]+)"[^}]*"first_name":"([^"]*)"[^}]*"last_name":"([^"]*)"[^}]*\}'
        matches = re.findall(obj_pattern, json_unescaped)

        print(f"\nFound {len(matches)} contract objects")

        for match in matches:
            contracts.append({
                'contract_number': match[0],
                'first_name': match[1],
                'last_name': match[2]
            })

        print(f"\nCreated {len(contracts)} contract records")

        # Save to file
        with open(r'C:\Users\khamis\Desktop\fleetifyapp\tmp_db_customers_full.json', 'w') as f:
            json.dump(contracts, f, indent=2)

        print("\nSample records:")
        for c in contracts[:30]:
            name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
            print(f"  {c.get('contract_number', 'N/A'):<20} | {name:<40}")
