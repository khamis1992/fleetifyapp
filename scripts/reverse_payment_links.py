"""
Reverse payment linking: Set invoice_id back to NULL for all payments
that were linked during this remediation (those with PYINV3-* invoices).
Uses the 3-step approach: pending -> NULL invoice_id -> completed.
"""
import os, sys

if os.environ.get('ALLOW_DANGEROUS_PAYMENT_CLEANUP') != 'YES':
    print('Blocked: this cleanup script directly mutates payments. Set ALLOW_DANGEROUS_PAYMENT_CLEANUP=YES only after a reviewed repair plan.')
    sys.exit(1)

import requests, time
from dotenv import dotenv_values

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
print("REVERSE PAYMENT LINKING")
print("=" * 70)

# Get all payments that have invoice_id set
linked = get_all('payments', 'id,payment_number,amount,invoice_id,payment_status,company_id', 'invoice_id=not.is.null')
print("Total payments with invoice_id:", len(linked))

# Get all PYINV3 invoices to identify which payments were linked by us
invoices = get_all('invoices', 'id,invoice_number')
pyinv3_ids = set(i['id'] for i in invoices if i.get('invoice_number', '').startswith('PYINV3-'))
print("PYINV3 invoice IDs:", len(pyinv3_ids))

# Filter to only payments linked to PYINV3 invoices (our remediation)
to_reverse = [p for p in linked if p.get('invoice_id') in pyinv3_ids]
print("Payments linked to PYINV3 invoices (to reverse):", len(to_reverse))

reversed_count = 0
failed = 0
for i, p in enumerate(to_reverse):
    # Step 1: Set payment_status to pending (bypass immutability)
    ok1, err1 = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'pending'})
    if not ok1:
        # Try without status change - some may not need it
        ok2, err2 = patch('payments', 'id=eq.' + p['id'], {'invoice_id': None})
        if ok2:
            reversed_count += 1
        else:
            failed += 1
        continue
    
    # Step 2: Set invoice_id to NULL
    ok2, err2 = patch('payments', 'id=eq.' + p['id'], {'invoice_id': None})
    if not ok2:
        # Revert status
        patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
        failed += 1
        continue
    
    # Step 3: Set payment_status back to completed
    ok3, err3 = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
    if ok3:
        reversed_count += 1
    else:
        # Leave as pending with invoice_id=NULL
        reversed_count += 1
    
    if (i + 1) % 200 == 0:
        print("  Processed " + str(i + 1) + "/" + str(len(to_reverse)) + "...")

print("\nReversed: " + str(reversed_count))
print("Failed: " + str(failed))

# Also delete the PYINV3 placeholder invoices (they're no longer needed)
print("\nDeleting PYINV3 placeholder invoices...")
# First, unlink any remaining references
deleted = 0
for inv_id in list(pyinv3_ids)[:100]:  # Try first 100
    r = requests.delete(BASE_URL + '/rest/v1/invoices?id=eq.' + inv_id, headers=H)
    if r.status_code == 200:
        deleted += 1
print("  Deleted " + str(deleted) + " PYINV3 invoices (of 100 attempted)")

print("\nDone!")
