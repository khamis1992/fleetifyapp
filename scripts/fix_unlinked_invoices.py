"""
Fix unlinked invoices: For invoices with customer_id but no contract,
create a placeholder contract for that customer.
"""
import requests, time
from dotenv import dotenv_values
from collections import defaultdict

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()
H = {
    'apikey': SRK,
    'Authorization': 'Bearer ' + SRK,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
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
            break
        batch = r.json()
        rows.extend(batch)
        if len(batch) < PS:
            break
        off += PS
        time.sleep(0.05)
    return rows

def patch(table, filters, body):
    url = BASE_URL + '/rest/v1/' + table + '?' + filters
    r = requests.patch(url, headers=H, json=body)
    return r.status_code == 200, r.text[:300]

print("=" * 70)
print("FIX UNLINKED INVOICES: Create placeholder contracts")
print("=" * 70)

# Get unlinked invoices
invoices = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id,company_id')
contracts = get_all('contracts', 'id,customer_id,company_id')
con_ids = set(c['id'] for c in contracts)
unlinked = [i for i in invoices if not i.get('contract_id') or i['contract_id'] not in con_ids]
print("Unlinked invoices:", len(unlinked))

# Build customer -> contracts mapping
cust_to_con = defaultdict(list)
for c in contracts:
    if c.get('customer_id'):
        cust_to_con[c['customer_id']].append(c)

# Group unlinked invoices by customer_id
with_customer = [i for i in unlinked if i.get('customer_id')]
without_customer = [i for i in unlinked if not i.get('customer_id')]
print("  With customer_id:", len(with_customer))
print("  Without customer_id:", len(without_customer))

# For invoices with customer but no contract:
# 1. Check if customer already has contracts (link to existing)
# 2. If no contracts, create a placeholder contract
linked = 0
created_contracts = 0
needs_contract = defaultdict(list)  # customer_id -> [invoices]

for inv in with_customer:
    cust_id = inv['customer_id']
    if cust_id in cust_to_con and cust_to_con[cust_id]:
        # Link to existing contract
        con_id = cust_to_con[cust_id][0]['id']
        ok, _ = patch('invoices', 'id=eq.' + inv['id'], {'contract_id': con_id})
        if ok:
            linked += 1
        else:
            needs_contract[cust_id].append(inv)
    else:
        needs_contract[cust_id].append(inv)

print("\n  Linked to existing contracts:", linked)
print("  Need new contracts:", len(needs_contract), "customers")

# Create placeholder contracts for customers without any
for cust_id, invs in needs_contract.items():
    if not invs:
        continue
    # Get company_id from first invoice
    comp_id = invs[0].get('company_id')
    if not comp_id:
        continue
    # Try to create a contract
    contract_data = {
        'company_id': comp_id,
        'customer_id': cust_id,
        'contract_number': 'PYCON-' + cust_id[:8],
        'status': 'completed',
        'start_date': '2024-01-01',
        'end_date': '2025-12-31',
    }
    r = requests.post(BASE_URL + '/rest/v1/contracts', headers=H, json=contract_data)
    if r.status_code == 201:
        new_con = r.json()[0] if r.json() else None
        if new_con:
            created_contracts += 1
            # Link all invoices for this customer to this contract
            for inv in invs:
                patch('invoices', 'id=eq.' + inv['id'], {'contract_id': new_con['id']})
            # Also add to mapping for future use
            cust_to_con[cust_id].append(new_con)
    else:
        if created_contracts < 3:
            print("  FAILED to create contract for customer " + cust_id[:8] + ": " + r.text[:200])

print("  Created placeholder contracts:", created_contracts)

# Final check for invoices without customer_id
print("\n  Invoices without customer_id (cannot link):", len(without_customer))
for inv in without_customer[:10]:
    print("    " + str(inv.get('invoice_number', '?')) + " | amount=" + str(inv.get('total_amount', '?')) + " | status=" + str(inv.get('status', '?')))

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print("  Invoices linked to existing contracts:", linked)
print("  Placeholder contracts created:", created_contracts)
print("  Invoices without customer (cannot link):", len(without_customer))
print("=" * 70)