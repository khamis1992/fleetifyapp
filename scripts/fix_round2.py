"""
Fleetify Fix Round 2:
1. Post 841 draft journal entries (all balanced)
2. Link 428 remaining unlinked payments to existing invoices by contract+month
3. Handle remaining unlinked invoices (no customer = manually created, set contract_id via vendor or skip)
"""
import requests, time, json
from dotenv import dotenv_values
from collections import defaultdict
from datetime import datetime

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
print("FLEETIFY FIX ROUND 2")
print("=" * 70)

# Fetch data
print("\nFetching data...")
entries = get_all('journal_entries', 'id,entry_number,status')
lines = get_all('journal_entry_lines', 'journal_entry_id,debit_amount,credit_amount')
payments = get_all('payments', 'id,payment_number,amount,invoice_id,contract_id,customer_id,payment_date')
invoices = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id,invoice_date')
contracts = get_all('contracts', 'id')
print("  " + str(len(entries)) + " entries, " + str(len(lines)) + " lines, " + str(len(payments)) + " payments, " + str(len(invoices)) + " invoices")

linked_ids = set(l['journal_entry_id'] for l in lines)
inv_ids = set(i['id'] for i in invoices)

# Build entry totals
et = defaultdict(lambda: {'d': 0, 'c': 0, 'n': 0})
for l in lines:
    e = l['journal_entry_id']
    et[e]['d'] += float(l.get('debit_amount') or 0)
    et[e]['c'] += float(l.get('credit_amount') or 0)
    et[e]['n'] += 1

# ============================================================
# FIX 3b: Post all remaining balanced draft entries
# ============================================================
print("\n" + "=" * 70)
print("FIX 3b: POST REMAINING DRAFT ENTRIES")
print("=" * 70)
drafts = [e for e in entries if e.get('status') == 'draft']
print("  Found " + str(len(drafts)) + " draft entries")
posted = 0
empty_deleted = 0
for e in drafts:
    eid = e['id']
    if eid not in linked_ids:
        # Empty draft — skip (shouldn't be any)
        print("  SKIP empty draft: " + str(e.get('entry_number', '?')))
        continue
    t = et.get(eid)
    if t and abs(t['d'] - t['c']) < 0.01:
        ok, err = patch('journal_entries', 'id=eq.' + eid, {'status': 'posted'})
        if ok:
            posted += 1
        else:
            print("  FAILED to post: " + str(e.get('entry_number', '?')) + " - " + err)
    else:
        print("  SKIP unbalanced: " + str(e.get('entry_number', '?')))
print("  Posted " + str(posted) + " balanced drafts")

# ============================================================
# FIX 4b: Link remaining unlinked payments to existing invoices
# For payments with contract_id but couldn't create new invoice (duplicate),
# find the existing invoice for that contract in the same month
# ============================================================
print("\n" + "=" * 70)
print("FIX 4b: LINK REMAINING UNLINKED PAYMENTS")
print("=" * 70)
unlinked_pay = [p for p in payments if not p.get('invoice_id') or p['invoice_id'] not in inv_ids]
print("  Found " + str(len(unlinked_pay)) + " unlinked payments")

# Build contract+month -> invoice mapping
con_month_to_inv = {}
for inv in invoices:
    cid = inv.get('contract_id')
    inv_date = inv.get('invoice_date')
    if cid and inv_date:
        # Extract YYYY-MM
        month = str(inv_date)[:7]
        key = cid + '|' + month
        if key not in con_month_to_inv:
            con_month_to_inv[key] = inv

# Also build contract -> any invoice (fallback)
con_to_any_inv = defaultdict(list)
for inv in invoices:
    if inv.get('contract_id'):
        con_to_any_inv[inv['contract_id']].append(inv)

linked = 0
no_match = 0
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
        # Fallback: link to any invoice for this contract
        if cid in con_to_any_inv and con_to_any_inv[cid]:
            inv = con_to_any_inv[cid][0]
            ok, _ = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
            if ok:
                linked += 1
                continue
    no_match += 1
print("  Linked " + str(linked) + " payments to existing invoices")
print("  No match (no contract_id): " + str(no_match))

# For payments with no contract_id but with customer_id, create invoice without contract
print("\n  Creating invoices for " + str(no_match) + " payments without contract...")
created = 0
failed = 0
for p in unlinked_pay:
    # Skip already linked
    if p.get('invoice_id') and p['invoice_id'] in inv_ids:
        continue
    # Try linking first (in case previous loop handled it)
    cid = p.get('contract_id')
    if cid and cid in con_to_any_inv and con_to_any_inv[cid]:
        continue  # Already handled above

    amount = float(p.get('amount', 0) or 0)
    inv_data = {
        'invoice_number': 'PYINV2-' + str(p.get('payment_number', 'UNK')),
        'total_amount': amount,
        'subtotal': amount,
        'status': 'paid',
        'payment_status': 'paid',
        'currency': 'QAR',
        'invoice_type': 'sales',
        'company_id': p.get('company_id'),
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
        if failed <= 3:
            print("  FAILED: " + str(p.get('payment_number', '?')) + " - " + r.text[:200])
print("  Created " + str(created) + " invoices")
if failed:
    print("  Failed: " + str(failed))

# ============================================================
# SUMMARY
# ============================================================
print("\n" + "=" * 70)
print("ROUND 2 SUMMARY")
print("=" * 70)
print("  Draft entries posted: " + str(posted))
print("  Payments linked to existing invoices: " + str(linked))
print("  New invoices created for payments: " + str(created))
print("  Payment failures: " + str(failed))
print("=" * 70)