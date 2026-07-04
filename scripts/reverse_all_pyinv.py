"""
Reverse ALL remaining PYINV-linked payments using the cancelled approach.
cancelled -> invoice_id=NULL -> completed
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

def get_all(table, select='*', filters=''):
    rows = []
    off = 0
    while True:
        url = BASE_URL + '/rest/v1/' + table + '?select=' + select + '&limit=1000&offset=' + str(off)
        if filters:
            url += '&' + filters
        r = requests.get(url, headers=H)
        if r.status_code != 200:
            break
        batch = r.json()
        rows.extend(batch)
        if len(batch) < 1000:
            break
        off += 1000
        time.sleep(0.05)
    return rows

def patch(table, filters, body):
    url = BASE_URL + '/rest/v1/' + table + '?' + filters
    r = requests.patch(url, headers=H, json=body)
    return r.status_code == 200, r.text[:200]

print("=" * 70)
print("REVERSE ALL PYINV-LINKED PAYMENTS (cancelled approach)")
print("=" * 70)

# Get all PYINV/PYINV3 invoice IDs
invoices = get_all('invoices', 'id,invoice_number')
pyinv_ids = set(i['id'] for i in invoices if i.get('invoice_number', '').startswith(('PYINV-', 'PYINV3-', 'PYINV2-')))
print("PYINV* invoice IDs:", len(pyinv_ids))

# Get all payments linked to PYINV invoices
linked = get_all('payments', 'id,payment_number,amount,invoice_id,payment_status', 'invoice_id=not.is.null')
stuck = [p for p in linked if p.get('invoice_id') in pyinv_ids]
print("Payments linked to PYINV* invoices:", len(stuck))

reversed_count = 0
failed = 0
for i, p in enumerate(stuck):
    pid = p['id']
    pay_num = p.get('payment_number', '?')
    
    # Step 1: Set to cancelled
    ok1, err1 = patch('payments', 'id=eq.' + pid, {'payment_status': 'cancelled'})
    if not ok1:
        failed += 1
        if failed <= 3:
            print(f"  FAIL step1: {pay_num} - {err1[:100]}")
        continue
    
    # Step 2: Set invoice_id to NULL
    ok2, err2 = patch('payments', 'id=eq.' + pid, {'invoice_id': None})
    if not ok2:
        # Revert to completed
        patch('payments', 'id=eq.' + pid, {'payment_status': 'completed'})
        failed += 1
        if failed <= 3:
            print(f"  FAIL step2: {pay_num} - {err2[:100]}")
        continue
    
    # Step 3: Set back to completed
    ok3, err3 = patch('payments', 'id=eq.' + pid, {'payment_status': 'completed'})
    if ok3:
        reversed_count += 1
    else:
        # Leave as cancelled with invoice_id=NULL
        reversed_count += 1
    
    if (i + 1) % 100 == 0:
        print(f"  Processed {i+1}/{len(stuck)}... reversed={reversed_count} failed={failed}")

print(f"\nReversed: {reversed_count}")
print(f"Failed: {failed}")
print("Done!")
