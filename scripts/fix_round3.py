"""
Fleetify Fix Round 3: Final cleanup
- Link remaining unlinked payments (fix: include company_id in select)
- Handle remaining unlinked invoices
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
    return r.status_code == 200, r.text[:200]

print("=" * 70)
print("FLEETIFY FIX ROUND 3: FINAL CLEANUP")
print("=" * 70)

# Fetch data — NOTE: include company_id in payments select!
print("\nFetching data...")
payments = get_all('payments', 'id,payment_number,amount,invoice_id,contract_id,customer_id,company_id,payment_date')
invoices = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id,company_id,invoice_date')
contracts = get_all('contracts', 'id,customer_id')
print("  " + str(len(payments)) + " payments, " + str(len(invoices)) + " invoices, " + str(len(contracts)) + " contracts")

inv_ids = set(i['id'] for i in invoices)
con_ids = set(c['id'] for c in contracts)

# Build contract+month -> invoice mapping
con_month_to_inv = {}
for inv in invoices:
    cid = inv.get('contract_id')
    inv_date = inv.get('invoice_date')
    if cid and inv_date:
        month = str(inv_date)[:7]
        key = cid + '|' + month
        if key not in con_month_to_inv:
            con_month_to_inv[key] = inv

# Build contract -> any invoice (fallback)
con_to_any_inv = defaultdict(list)
for inv in invoices:
    if inv.get('contract_id'):
        con_to_any_inv[inv['contract_id']].append(inv)

# Build customer -> contracts mapping
cust_to_con = defaultdict(list)
for c in contracts:
    if c.get('customer_id'):
        cust_to_con[c['customer_id']].append(c)

# ============================================================
# FIX 4c: Link remaining unlinked payments
# ============================================================
print("\n" + "=" * 70)
print("FIX 4c: LINK REMAINING UNLINKED PAYMENTS")
print("=" * 70)
unlinked_pay = [p for p in payments if not p.get('invoice_id') or p['invoice_id'] not in inv_ids]
print("  Found " + str(len(unlinked_pay)) + " unlinked payments")

# Phase 1: Link via contract+month
print("\n  Phase 1: Linking via contract+month...")
linked = 0
still_unlinked = []
for p in unlinked_pay:
    cid = p.get('contract_id')
    pdate = p.get('payment_date')
    if cid and pdate:
        month = str(pdate)[:7]
        key = cid + '|' + month
        if key in con_month_to_inv:
            inv = con_month_to_inv[key]
            ok, _ = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
            if ok:
                linked += 1
                continue
        # Fallback: any invoice for this contract
        if cid in con_to_any_inv and con_to_any_inv[cid]:
            inv = con_to_any_inv[cid][0]
            ok, _ = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
            if ok:
                linked += 1
                continue
    still_unlinked.append(p)
print("  Linked " + str(linked) + " payments to existing invoices")
print("  Still unlinked: " + str(len(still_unlinked)))

# Phase 2: Create placeholder invoices for remaining
print("\n  Phase 2: Creating placeholder invoices for " + str(len(still_unlinked)) + " payments...")
created = 0
failed = 0
for i, p in enumerate(still_unlinked):
    amount = float(p.get('amount', 0) or 0)
    comp_id = p.get('company_id')  # This time we DO have it!
    inv_data = {
        'invoice_number': 'PYINV3-' + str(p.get('payment_number', 'UNK' + str(i))),
        'total_amount': amount,
        'subtotal': amount,
        'status': 'paid',
        'payment_status': 'paid',
        'currency': 'QAR',
        'invoice_type': 'sales',
        'company_id': comp_id,
        'customer_id': p.get('customer_id'),
        'invoice_date': p.get('payment_date'),
        'due_date': p.get('payment_date'),
        'balance_due': 0,
    }
    inv_data = {k: v for k, v in inv_data.items() if v is not None}
    r = requests.post(BASE_URL + '/rest/v1/invoices', headers=H, json=inv_data)
    if r.status_code == 201:
        new_inv = r.json()[0] if r.json() else None
        if new_inv:
            patch('payments', 'id=eq.' + p['id'], {'invoice_id': new_inv['id']})
            created += 1
    else:
        failed += 1
        if failed <= 5:
            print("  FAILED: " + str(p.get('payment_number', '?')) + " - " + r.text[:200])
    if (i + 1) % 200 == 0:
        print("    Processed " + str(i + 1) + "/" + str(len(still_unlinked)) + "...")
print("  Created " + str(created) + " placeholder invoices")
if failed:
    print("  Failed: " + str(failed))

# ============================================================
# FIX 5b: Unlinked invoices — link to contracts via customer
# ============================================================
print("\n" + "=" * 70)
print("FIX 5b: UNLINKED INVOICES")
print("=" * 70)
# Re-fetch invoices
invoices2 = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id')
unlinked_inv = [i for i in invoices2 if not i.get('contract_id') or i['contract_id'] not in con_ids]
print("  Found " + str(len(unlinked_inv)) + " unlinked invoices")
linked_inv = 0
skipped = 0
for inv in unlinked_inv:
    cust_id = inv.get('customer_id')
    if cust_id and cust_id in cust_to_con and cust_to_con[cust_id]:
        con_id = cust_to_con[cust_id][0]['id']
        ok, _ = patch('invoices', 'id=eq.' + inv['id'], {'contract_id': con_id})
        if ok:
            linked_inv += 1
        else:
            skipped += 1
    else:
        skipped += 1
print("  Linked " + str(linked_inv) + " invoices to contracts")
print("  Skipped (no customer/match): " + str(skipped))

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 70)
print("ROUND 3 SUMMARY")
print("=" * 70)
print("  Payments linked to existing invoices: " + str(linked))
print("  New invoices created for payments: " + str(created))
print("  Payment failures: " + str(failed))
print("  Invoices linked to contracts: " + str(linked_inv))
print("  Invoices skipped: " + str(skipped))
print("=" * 70)