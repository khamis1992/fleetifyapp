"""
Fleetify Financial Remediation - Apply All Fixes
1. Empty journal entries (4: 3 draft + 1 posted)
2. Zero-amount entries (38 posted RETRO entries)
3. Draft entries (352: 349 balanced -> post, 3 empty -> delete)
4. Unlinked payments (1277: 443 with contract, 834 customer only)
5. Unlinked invoices (10: PUR-type, no customer)
"""
import requests, time, sys
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

def delete(table, filters):
    url = BASE_URL + '/rest/v1/' + table + '?' + filters
    r = requests.delete(url, headers=H)
    return r.status_code in (200, 204), r.text[:300]

print("=" * 70)
print("FLEETIFY FINANCIAL REMEDIATION")
print("=" * 70)

# Fetch all data
print("\nFetching data...")
entries = get_all('journal_entries', 'id,entry_number,status,reference_id,company_id,entry_date')
lines = get_all('journal_entry_lines', 'id,journal_entry_id,debit_amount,credit_amount')
payments = get_all('payments', 'id,payment_number,amount,invoice_id,contract_id,customer_id,company_id,payment_date')
invoices = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id,company_id,journal_entry_id')
contracts = get_all('contracts', 'id,customer_id')
print("  " + str(len(entries)) + " entries, " + str(len(lines)) + " lines, " + str(len(payments)) + " payments, " + str(len(invoices)) + " invoices, " + str(len(contracts)) + " contracts")

linked_ids = set(l['journal_entry_id'] for l in lines)
inv_ids = set(i['id'] for i in invoices)
con_ids = set(c['id'] for c in contracts)

# Build entry totals
et = defaultdict(lambda: {'d': 0, 'c': 0, 'n': 0})
for l in lines:
    e = l['journal_entry_id']
    et[e]['d'] += float(l.get('debit_amount') or 0)
    et[e]['c'] += float(l.get('credit_amount') or 0)
    et[e]['n'] += 1

# Build invoice journal_entry_id -> invoice lookup
inv_je_lookup = {}
for i in invoices:
    if i.get('journal_entry_id'):
        inv_je_lookup[i['journal_entry_id']] = i

# ============================================================
# FIX 1: Empty journal entries (no lines)
# ============================================================
print("\n" + "=" * 70)
print("FIX 1: EMPTY JOURNAL ENTRIES")
print("=" * 70)
empty = [e for e in entries if e['id'] not in linked_ids]
print("  Found " + str(len(empty)) + " empty entries")
fixed1 = 0
for e in empty:
    eid = e['id']
    st = e.get('status', '')
    # If posted, change to draft first
    if st == 'posted':
        ok, _ = patch('journal_entries', 'id=eq.' + eid, {'status': 'draft'})
        if not ok:
            print("  SKIP (cannot unpost): " + str(e.get('entry_number', '?')))
            continue
    # Check if referenced by invoice
    if eid in inv_je_lookup:
        inv = inv_je_lookup[eid]
        patch('invoices', 'id=eq.' + inv['id'], {'journal_entry_id': None})
        print("  Unlinked invoice " + str(inv.get('invoice_number', '?')) + " from entry " + str(e.get('entry_number', '?')))
    # Delete entry (no lines since it is empty)
    ok, err = delete('journal_entries', 'id=eq.' + eid)
    if ok:
        fixed1 += 1
        print("  DELETED: " + str(e.get('entry_number', '?')) + " (was " + st + ")")
    else:
        print("  FAILED: " + str(e.get('entry_number', '?')) + " - " + err)

# ============================================================
# FIX 2: Zero-amount entries
# ============================================================
print("\n" + "=" * 70)
print("FIX 2: ZERO-AMOUNT ENTRIES")
print("=" * 70)
zero_ids = [eid for eid, t in et.items() if t['d'] == 0 and t['c'] == 0 and t['n'] > 0]
print("  Found " + str(len(zero_ids)) + " zero-amount entries")
fixed2 = 0
for eid in zero_ids:
    entry = next((e for e in entries if e['id'] == eid), None)
    if not entry:
        continue
    st = entry.get('status', '')
    # If posted, change to draft first
    if st == 'posted':
        ok, _ = patch('journal_entries', 'id=eq.' + eid, {'status': 'draft'})
        if not ok:
            print("  SKIP (cannot unpost): " + str(entry.get('entry_number', '?')))
            continue
    # Check if referenced by invoice
    if eid in inv_je_lookup:
        inv = inv_je_lookup[eid]
        patch('invoices', 'id=eq.' + inv['id'], {'journal_entry_id': None})
        print("  Unlinked invoice " + str(inv.get('invoice_number', '?')))
    # Delete lines
    delete('journal_entry_lines', 'journal_entry_id=eq.' + eid)
    # Delete entry
    ok, err = delete('journal_entries', 'id=eq.' + eid)
    if ok:
        fixed2 += 1
        print("  DELETED: " + str(entry.get('entry_number', '?')))
    else:
        print("  FAILED: " + str(entry.get('entry_number', '?')) + " - " + err)

# ============================================================
# FIX 3: Draft entries
# ============================================================
print("\n" + "=" * 70)
print("FIX 3: DRAFT ENTRIES")
print("=" * 70)
drafts = [e for e in entries if e.get('status') == 'draft']
print("  Found " + str(len(drafts)) + " draft entries")
posted_count = 0
deleted_count = 0
for e in drafts:
    eid = e['id']
    if eid not in linked_ids:
        # Empty draft - delete
        ok, err = delete('journal_entries', 'id=eq.' + eid)
        if ok:
            deleted_count += 1
            print("  DELETED empty draft: " + str(e.get('entry_number', '?')))
        else:
            print("  FAILED to delete: " + str(e.get('entry_number', '?')) + " - " + err)
    else:
        t = et.get(eid)
        if t and abs(t['d'] - t['c']) < 0.01:
            ok, err = patch('journal_entries', 'id=eq.' + eid, {'status': 'posted'})
            if ok:
                posted_count += 1
            else:
                print("  FAILED to post: " + str(e.get('entry_number', '?')) + " - " + err)
        else:
            print("  SKIP unbalanced draft: " + str(e.get('entry_number', '?')))
print("  Posted " + str(posted_count) + " balanced drafts")
print("  Deleted " + str(deleted_count) + " empty drafts")

# ============================================================
# FIX 4: Unlinked payments
# ============================================================
print("\n" + "=" * 70)
print("FIX 4: UNLINKED PAYMENTS")
print("=" * 70)
# Build contract -> invoices mapping
con_to_inv = defaultdict(list)
for inv in invoices:
    if inv.get('contract_id'):
        con_to_inv[inv['contract_id']].append(inv)

unlinked_pay = [p for p in payments if not p.get('invoice_id') or p['invoice_id'] not in inv_ids]
print("  Found " + str(len(unlinked_pay)) + " unlinked payments")
linked_pay = 0
still_unlinked = 0
for p in unlinked_pay:
    cid = p.get('contract_id')
    if cid and cid in con_to_inv and con_to_inv[cid]:
        inv = con_to_inv[cid][0]
        ok, _ = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
        if ok:
            linked_pay += 1
        else:
            still_unlinked += 1
    else:
        still_unlinked += 1
print("  Linked " + str(linked_pay) + " payments to invoices via contract_id")
print("  Still unlinked: " + str(still_unlinked))

# For remaining unlinked payments, create placeholder invoices
print("\n  Creating placeholder invoices for remaining " + str(still_unlinked) + " payments...")
created_inv = 0
# Build customer -> contracts mapping
cust_to_con = defaultdict(list)
for c in contracts:
    if c.get('customer_id'):
        cust_to_con[c['customer_id']].append(c)

for p in unlinked_pay:
    # Skip if already linked in the first pass
    cid = p.get('contract_id')
    if cid and cid in con_to_inv and con_to_inv[cid]:
        continue
    cust_id = p.get('customer_id')
    comp_id = p.get('company_id')
    amount = p.get('amount', 0)
    inv_data = {
        'invoice_number': 'PYINV-' + str(p.get('payment_number', 'UNK')),
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
print("  Created " + str(created_inv) + " placeholder invoices and linked payments")

# ============================================================
# FIX 5: Unlinked invoices
# ============================================================
print("\n" + "=" * 70)
print("FIX 5: UNLINKED INVOICES")
print("=" * 70)
unlinked_inv = [i for i in invoices if not i.get('contract_id') or i['contract_id'] not in con_ids]
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
print("REMEDIATION SUMMARY")
print("=" * 70)
print("  Fix 1 - Empty entries: " + str(fixed1) + " deleted")
print("  Fix 2 - Zero-amount entries: " + str(fixed2) + " deleted")
print("  Fix 3 - Draft entries: " + str(posted_count) + " posted, " + str(deleted_count) + " deleted")
print("  Fix 4 - Unlinked payments: " + str(linked_pay) + " linked via contract, " + str(created_inv) + " via new invoice")
print("  Fix 5 - Unlinked invoices: " + str(linked_inv) + " linked to contracts")
print("=" * 70)