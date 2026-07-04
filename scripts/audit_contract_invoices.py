"""
Fleetify Contract-Invoice Audit
Check all contracts/agreements and verify every invoice falls within the contract duration.
Generate a detailed report of violations.
"""
import requests, time, json
from dotenv import dotenv_values
from collections import defaultdict

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()
H = {
    'apikey': SRK,
    'Authorization': 'Bearer ' + SRK,
    'Content-Type': 'application/json',
}
PS = 1000

def get_all(table, select='*', filters=''):
    rows = []
    off = 0
    while True:
        url = BASE_URL + '/rest/v1/' + table + '?select=' + select + '&limit=' + str(PS) + '&offset=' + str(off)
        if filters:
            url += '&' + filters
        r = requests.get(url, headers=H)
        if r.status_code != 200:
            print(f'ERROR fetching {table}: {r.status_code} {r.text[:200]}')
            break
        batch = r.json()
        rows.extend(batch)
        if len(batch) < PS:
            break
        off += PS
        time.sleep(0.05)
    return rows

print("=" * 80)
print("FLEETIFY CONTRACT-INVOICE AUDIT REPORT")
print("=" * 80)

# ============================================================
# 1. FETCH ALL CONTRACTS
# ============================================================
print("\n[1] Fetching all contracts...")
contracts = get_all('contracts', 'id,contract_number,customer_id,company_id,start_date,end_date,status,contract_type')
print(f"    Found {len(contracts)} contracts")

# Build contract lookup
contract_lookup = {}
for c in contracts:
    contract_lookup[c['id']] = c

# ============================================================
# 2. FETCH ALL INVOICES
# ============================================================
print("\n[2] Fetching all invoices...")
invoices = get_all('invoices', 'id,invoice_number,invoice_date,due_date,contract_id,customer_id,company_id,total_amount,status,payment_status,invoice_type,created_at')
print(f"    Found {len(invoices)} invoices")

# ============================================================
# 3. FETCH CUSTOMERS FOR NAMES
# ============================================================
print("\n[3] Fetching customers...")
customers = get_all('customers', 'id,first_name,last_name,company_name')
customer_lookup = {}
for c in customers:
    name = c.get('company_name') or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
    customer_lookup[c['id']] = name
print(f"    Found {len(customers)} customers")

# ============================================================
# 4. ANALYZE: Invoices vs Contract Duration
# ============================================================
print("\n[4] Analyzing invoice dates vs contract durations...")

violations = []
invoices_without_contract = []
invoices_with_invalid_contract = []
valid_invoices = []

for inv in invoices:
    inv_id = inv.get('id')
    inv_num = inv.get('invoice_number', '?')
    inv_date = inv.get('invoice_date', '')
    contract_id = inv.get('contract_id')
    
    if not contract_id:
        invoices_without_contract.append(inv)
        continue
    
    if contract_id not in contract_lookup:
        invoices_with_invalid_contract.append(inv)
        continue
    
    contract = contract_lookup[contract_id]
    start = contract.get('start_date', '')
    end = contract.get('end_date', '')
    
    if not start or not end:
        violations.append({
            'invoice_number': inv_num,
            'invoice_id': inv_id,
            'invoice_date': inv_date,
            'contract_number': contract.get('contract_number', '?'),
            'contract_id': contract_id,
            'customer': customer_lookup.get(contract.get('customer_id'), '?'),
            'contract_start': start or 'NULL',
            'contract_end': end or 'NULL',
            'violation_type': 'CONTRACT_MISSING_DATES',
            'total_amount': inv.get('total_amount', 0),
            'invoice_status': inv.get('status', '?'),
            'payment_status': inv.get('payment_status', '?'),
        })
        continue
    
    # Check if invoice_date falls within contract period
    if inv_date:
        if inv_date < start or inv_date > end:
            # Determine how far off
            if inv_date > end:
                days_off = (int(inv_date[:4]) - int(end[:4])) * 365
                violation_type = 'AFTER_CONTRACT_END'
            else:
                days_off = (int(start[:4]) - int(inv_date[:4])) * 365
                violation_type = 'BEFORE_CONTRACT_START'
            
            violations.append({
                'invoice_number': inv_num,
                'invoice_id': inv_id,
                'invoice_date': inv_date,
                'contract_number': contract.get('contract_number', '?'),
                'contract_id': contract_id,
                'customer': customer_lookup.get(contract.get('customer_id'), '?'),
                'contract_start': start,
                'contract_end': end,
                'violation_type': violation_type,
                'total_amount': float(inv.get('total_amount', 0) or 0),
                'invoice_status': inv.get('status', '?'),
                'payment_status': inv.get('payment_status', '?'),
            })
        else:
            valid_invoices.append(inv)
    else:
        violations.append({
            'invoice_number': inv_num,
            'invoice_id': inv_id,
            'invoice_date': 'NULL',
            'contract_number': contract.get('contract_number', '?'),
            'contract_id': contract_id,
            'customer': customer_lookup.get(contract.get('customer_id'), '?'),
            'contract_start': start,
            'contract_end': end,
            'violation_type': 'INVOICE_MISSING_DATE',
            'total_amount': float(inv.get('total_amount', 0) or 0),
            'invoice_status': inv.get('status', '?'),
            'payment_status': inv.get('payment_status', '?'),
        })

# ============================================================
# 5. CHECK FOR 2099 DATES (placeholder invoices)
# ============================================================
print("\n[5] Checking for placeholder invoices (2099 dates)...")
placeholder_invoices = [i for i in invoices if i.get('invoice_date', '').startswith('2099')]
print(f"    Found {len(placeholder_invoices)} invoices with 2099 dates")

# ============================================================
# 6. GENERATE REPORT
# ============================================================
print("\n[6] Generating report...")

report_lines = []
report_lines.append("=" * 80)
report_lines.append("FLEETIFY CONTRACT-INVOICE AUDIT REPORT")
report_lines.append(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
report_lines.append("=" * 80)
report_lines.append("")
report_lines.append("SUMMARY")
report_lines.append("-" * 40)
report_lines.append(f"Total contracts:        {len(contracts)}")
report_lines.append(f"Total invoices:         {len(invoices)}")
report_lines.append(f"Valid invoices:         {len(valid_invoices)}")
report_lines.append(f"Violations:             {len(violations)}")
report_lines.append(f"Invoices w/o contract:  {len(invoices_without_contract)}")
report_lines.append(f"Invalid contract ref:   {len(invoices_with_invalid_contract)}")
report_lines.append(f"Placeholder (2099):     {len(placeholder_invoices)}")
report_lines.append("")

# Violation breakdown by type
by_type = defaultdict(int)
by_type_amount = defaultdict(float)
for v in violations:
    by_type[v['violation_type']] += 1
    by_type_amount[v['violation_type']] += v.get('total_amount', 0)

report_lines.append("VIOLATION BREAKDOWN")
report_lines.append("-" * 40)
for vtype, count in sorted(by_type.items(), key=lambda x: -x[1]):
    report_lines.append(f"  {vtype}: {count} invoices (QAR {by_type_amount[vtype]:,.2f})")
report_lines.append("")

# Detailed violations
if violations:
    report_lines.append("DETAILED VIOLATIONS")
    report_lines.append("-" * 40)
    report_lines.append(f"{'Invoice #':<40} {'Date':<12} {'Contract #':<15} {'Start':<12} {'End':<12} {'Type':<25} {'Amount':<12} {'Status':<10}")
    report_lines.append("-" * 140)
    for v in sorted(violations, key=lambda x: x['violation_type']):
        report_lines.append(
            f"{v['invoice_number'][:39]:<40} {v['invoice_date']:<12} {v['contract_number'][:14]:<15} "
            f"{v['contract_start']:<12} {v['contract_end']:<12} {v['violation_type']:<25} "
            f"{v['total_amount']:>10,.2f} {v['invoice_status']:<10}"
        )
    report_lines.append("")

# Placeholder invoices (2099 dates)
if placeholder_invoices:
    report_lines.append("PLACEHOLDER INVOICES (2099 DATES)")
    report_lines.append("-" * 40)
    report_lines.append(f"{'Invoice #':<45} {'Date':<12} {'Amount':<12} {'Status':<10} {'Payment':<10}")
    report_lines.append("-" * 90)
    for inv in placeholder_invoices[:50]:
        report_lines.append(
            f"{inv.get('invoice_number', '?')[:44]:<45} {inv.get('invoice_date', ''):<12} "
            f"{float(inv.get('total_amount', 0) or 0):>10,.2f} {inv.get('status', '?'):<10} {inv.get('payment_status', '?'):<10}"
        )
    if len(placeholder_invoices) > 50:
        report_lines.append(f"  ... and {len(placeholder_invoices) - 50} more")
    report_lines.append("")

# Invoices without contracts
report_lines.append("INVOICES WITHOUT CONTRACT LINKAGE")
report_lines.append("-" * 40)
report_lines.append(f"Total: {len(invoices_without_contract)}")
if invoices_without_contract:
    # Group by invoice_type
    by_type2 = defaultdict(int)
    for i in invoices_without_contract:
        by_type2[i.get('invoice_type', '?')] += 1
    for t, c in sorted(by_type2.items(), key=lambda x: -x[1]):
        report_lines.append(f"  {t}: {c}")
report_lines.append("")

# Contracts with no invoices
contracts_with_invoices = set(i.get('contract_id') for i in invoices if i.get('contract_id') and i['contract_id'] in contract_lookup)
contracts_without_invoices = [c for c in contracts if c['id'] not in contracts_with_invoices]
report_lines.append("CONTRACTS WITHOUT INVOICES")
report_lines.append("-" * 40)
report_lines.append(f"Total: {len(contracts_without_invoices)}")
if contracts_without_invoices:
    for c in contracts_without_invoices[:20]:
        cust = customer_lookup.get(c.get('customer_id'), '?')
        report_lines.append(f"  {c.get('contract_number', '?'):<15} | {cust:<30} | {c.get('start_date', '?')} to {c.get('end_date', '?')} | {c.get('status', '?')}")
    if len(contracts_without_invoices) > 20:
        report_lines.append(f"  ... and {len(contracts_without_invoices) - 20} more")
report_lines.append("")

report_lines.append("=" * 80)
report_lines.append("END OF REPORT")
report_lines.append("=" * 80)

# Print to console
report_text = '\n'.join(report_lines)
print(report_text)

# Save to file
with open('C:/Users/khamis/Documents/fleetifyapp/CONTRACT_INVOICE_AUDIT_REPORT.txt', 'w', encoding='utf-8') as f:
    f.write(report_text)
print(f"\nReport saved to: CONTRACT_INVOICE_AUDIT_REPORT.txt")