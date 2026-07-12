"""
Fleetify Fix 4+5: Unlinked payments and invoices
Optimized: Uses SQL via Supabase RPC or direct batch operations
"""
import requests, time, json
from dotenv import dotenv_values
from collections import defaultdict

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
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
            print('  ERR ' + table + ': ' + str(r.status_code) + ' ' + r.text[:200])
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

def rpc(fn, params):
    r = requests.post(BASE_URL + '/rest/v1/rpc/' + fn, headers=H, json=params)
    return r.status_code == 200, r.text[:500]

print("=" * 70)
print("FLEETIFY FIX 4+5: UNLINKED PAYMENTS AND INVOICES")
print("=" * 70)

# Fetch data
print("\nFetching data...")
payments = get_all('payments', 'id,payment_number,amount,invoice_id,contract_id,customer_id,company_id,payment_date')
invoices = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id,company_id,journal_entry_id')
contracts = get_all('contracts', 'id,customer_id')
print("  " + str(len(payments)) + " payments, " + str(len(invoices)) + " invoices, " + str(len(contracts)) + " contracts")

inv_ids = set(i['id'] for i in invoices)
con_ids = set(c['id'] for c in contracts)

# Build contract -> invoices mapping
con_to_inv = defaultdict(list)
for inv in invoices:
    if inv.get('contract_id'):
        con_to_inv[inv['contract_id']].append(inv)

# Build customer -> contracts mapping
cust_to_con = defaultdict(list)
for c in contracts:
    if c.get('customer_id'):
        cust_to_con[c['customer_id']].append(c)

# ============================================================
# FIX 4: Unlinked payments
# ============================================================
print("\n" + "=" * 70)
print("FIX 4: UNLINKED PAYMENTS")
print("=" * 70)
unlinked_pay = [p for p in payments if not p.get('invoice_id') or p['invoice_id'] not in inv_ids]
print("  Found " + str(len(unlinked_pay)) + " unlinked payments")

# Phase 1: Link payments to existing invoices via contract_id
print("\n  Phase 1: Linking via contract_id...")
linked_pay = 0
still_unlinked = []
for p in unlinked_pay:
    cid = p.get('contract_id')
    if cid and cid in con_to_inv and con_to_inv[cid]:
        inv = con_to_inv[cid][0]
        ok, _ = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
        if ok:
            linked_pay += 1
        else:
            still_unlinked.append(p)
    else:
        still_unlinked.append(p)
print("  Linked " + str(linked_pay) + " payments via contract_id")
print("  Still unlinked: " + str(len(still_unlinked)))

# Phase 2: Create placeholder invoices for remaining unlinked payments
print("\n  Phase 2: Creating placeholder invoices for " + str(len(still_unlinked)) + " payments...")
created_inv = 0
failed = 0
for i, p in enumerate(still_unlinked):
    cust_id = p.get('customer_id')
    comp_id = p.get('company_id')
    amount = p.get('amount', 0)
    inv_data = {
        'invoice_number': 'PYINV-' + str(p.get('payment_number', 'UNK' + str(i))),
        'total_amount': amount,
        'status': 'paid',
        'customer_id': cust_id,
        'company_id': comp_id,
        'contract_id': p.get('contract_id'),
        'invoice_date': p.get('payment_date'),
    }
    inv_data = {k: v for k, v in inv_data.items() if v is not None}
    r = requests.post(BASE_URL + '/rest/v1/invoices', headers=H, json=inv_data)
    if r.status_code == 201:
        new_inv = r.json()[0] if r.json() else None
        if new_inv:
            patch('payments', 'id=eq.' + p['id'], {'invoice_id': new_inv['id']})
            created_inv += 1
    else:
        failed += 1
    if (i + 1) % 100 == 0:
        print("    Processed " + str(i + 1) + "/" + str(len(still_unlinked)) + "...")
print("  Created " + str(created_inv) + " placeholder invoices")
if failed:
    print("  Failed: " + str(failed))

# ============================================================
# FIX 5: Unlinked invoices
# ============================================================
print("\n" + "=" * 70)
print("FIX 5: UNLINKED INVOICES")
print("=" * 70)
# Re-fetch invoices to get updated state
invoices2 = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id,company_id')
unlinked_inv = [i for i in invoices2 if not i.get('contract_id') or i['contract_id'] not in con_ids]
print("  Found " + str(len(unlinked_inv)) + " unlinked invoices")
linked_inv = 0
for inv in unlinked_inv:
    cust_id = inv.get('customer_id')
    if cust_id and cust_id in cust_to_con and cust_to_con[cust_id]:
        con_id = cust_to_con[cust_id][0]['id']
        ok, _ = patch('invoices', 'id=eq.' + inv['id'], {'contract_id': con_id})
        if ok:
            linked_inv += 1
            print("  Linked " + str(inv.get('invoice_number', '?')) + " to contract via customer")
        else:
            print("  FAILED to link " + str(inv.get('invoice_number', '?')))
    else:
        print("  SKIP " + str(inv.get('invoice_number', '?')) + " - no customer or no matching contract")
print("  Linked " + str(linked_inv) + " invoices to contracts")

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print("  Fix 4 - Unlinked payments: " + str(linked_pay) + " linked via contract, " + str(created_inv) + " via new invoice")
print("  Fix 5 - Unlinked invoices: " + str(linked_inv) + " linked to contracts")
print("=" * 70)