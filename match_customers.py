import json
import pandas as pd
from difflib import SequenceMatcher

# Load Excel data
excel_df = pd.read_csv(r'C:\Users\khamis\Desktop\fleetifyapp\excel_leases_full.csv')
print(f"Loaded {len(excel_df)} unique lease agreements from Excel")

# Load database contracts
with open(r'C:\Users\khamis\Desktop\fleetifyapp\tmp_db_customers_full.json', 'r') as f:
    db_customers = json.load(f)

print(f"Loaded {len(db_customers)} contracts from database")

# Create a mapping of customer name to their contracts in database
db_by_customer = {}
for record in db_customers:
    full_name = f"{record['first_name']} {record['last_name']}".strip().lower()
    if full_name not in db_by_customer:
        db_by_customer[full_name] = []
    db_by_customer[full_name].append(record['contract_number'])

# Normalize customer names for comparison
def normalize_name(name):
    """Normalize name for comparison"""
    if pd.isna(name):
        return ""
    # Convert to lowercase, remove extra spaces, remove special chars
    name = str(name).lower().strip()
    name = ' '.join(name.split())  # Remove extra spaces
    return name

# Find matches by customer name
exact_matches = []
potential_matches = []
no_matches = []

for _, row in excel_df.iterrows():
    lease_id = row['lease_identifier']
    excel_customer = row['customer_name']
    vehicle_number = row['vehicle_number']
    total_amount = row['total_amount']
    payment_count = row['payment_count']

    normalized_excel_name = normalize_name(excel_customer)

    # Check for exact match (case-insensitive)
    found_exact = False
    for db_name, contracts in db_by_customer.items():
        if normalized_excel_name == db_name:
            exact_matches.append({
                'excel_lease_id': lease_id,
                'excel_customer': excel_customer,
                'db_contracts': contracts,
                'vehicle_number': vehicle_number,
                'total_amount': total_amount,
                'payment_count': payment_count
            })
            found_exact = True
            break

    if not found_exact:
        # Try fuzzy matching
        best_match = None
        best_ratio = 0
        for db_name in db_by_customer.keys():
            ratio = SequenceMatcher(None, normalized_excel_name, db_name).ratio()
            if ratio > best_ratio and ratio > 0.7:  # 70% similarity threshold
                best_ratio = ratio
                best_match = (db_name, db_by_customer[db_name])

        if best_match:
            potential_matches.append({
                'excel_lease_id': lease_id,
                'excel_customer': excel_customer,
                'normalized_excel': normalized_excel_name,
                'db_name': best_match[0],
                'db_contracts': best_match[1],
                'similarity': best_ratio,
                'vehicle_number': vehicle_number,
                'total_amount': total_amount,
                'payment_count': payment_count
            })
        else:
            no_matches.append({
                'excel_lease_id': lease_id,
                'excel_customer': excel_customer,
                'vehicle_number': vehicle_number,
                'total_amount': total_amount,
                'payment_count': payment_count
            })

print("\n" + "="*80)
print("CUSTOMER NAME MATCHING RESULTS")
print("="*80)

print(f"\nExact matches found: {len(exact_matches)}")
print(f"Potential matches (fuzzy): {len(potential_matches)}")
print(f"No matches found: {len(no_matches)}")

# Analyze renamed agreements
print("\n" + "-"*80)
print("RENAMED AGREEMENTS (Same customer, different contract number)")
print("-"*80)

# Find exact matches where the contract numbers don't match
renamed_agreements = []
for match in exact_matches:
    excel_contract = match['excel_lease_id']
    db_contracts = match['db_contracts']

    # Check if any of the DB contracts match the Excel contract
    if excel_contract not in db_contracts:
        renamed_agreements.append({
            'excel_contract': excel_contract,
            'db_contracts': db_contracts,
            'customer': match['excel_customer'],
            'total_amount': match['total_amount'],
            'payment_count': match['payment_count']
        })

print(f"\nFound {len(renamed_agreements)} potentially renamed agreements")
print("\nTop 20 renamed agreements by payment amount:")
sorted_renamed = sorted(renamed_agreements, key=lambda x: x['total_amount'], reverse=True)
for i, item in enumerate(sorted_renamed[:20], 1):
    print(f"{i:3}. {item['excel_contract']:<15} -> {item['db_contracts']} | {item['customer']:<30} | {item['total_amount']:>10.2f} QAR")

# Save detailed report
report = {
    'summary': {
        'total_excel_contracts': len(excel_df),
        'total_db_contracts': len(db_customers),
        'exact_matches': len(exact_matches),
        'potential_fuzzy_matches': len(potential_matches),
        'no_matches': len(no_matches),
        'renamed_agreements': len(renamed_agreements)
    },
    'renamed_agreements': sorted_renamed,
    'no_match_customers': sorted(no_matches, key=lambda x: x['total_amount'], reverse=True)[:50]
}

with open(r'C:\Users\khamis\Desktop\fleetifyapp\customer_matching_report.json', 'w') as f:
    json.dump(report, f, indent=2)

print("\n" + "="*80)
print("SAVED: customer_matching_report.json")
print("="*80)

# Calculate financial impact
total_renamed_amount = sum(item['total_amount'] for item in renamed_agreements)
total_nomatch_amount = sum(item['total_amount'] for item in no_matches)

print("\n" + "="*80)
print("FINANCIAL IMPACT")
print("="*80)
print(f"Amount in renamed agreements: {total_renamed_amount:,.2f} QAR")
print(f"Amount in no-match agreements: {total_nomatch_amount:,.2f} QAR")
print(f"Total Excel amount: {excel_df['total_amount'].sum():,.2f} QAR")
