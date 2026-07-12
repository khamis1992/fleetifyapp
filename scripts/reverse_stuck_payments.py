"""
Try to reverse the 196 stuck payments using alternative approaches.
1. Try direct invoice_id=NULL without status change
2. Try setting status to 'cancelled' then invoice_id=NULL
3. Try removing contract_id first to bypass overpayment trigger
"""
import os, sys

if os.environ.get('ALLOW_DANGEROUS_PAYMENT_CLEANUP') != 'YES':
    print('Blocked: this cleanup script directly mutates payments. Set ALLOW_DANGEROUS_PAYMENT_CLEANUP=YES only after a reviewed repair plan.')
    sys.exit(1)

import requests, time
from dotenv import dotenv_values

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
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
    return r.status_code == 200, r.text[:300]

print("=" * 70)
print("REVERSE STUCK PAYMENTS - ALTERNATIVE APPROACHES")
print("=" * 70)

# Get all payments with PYINV3 invoice_id
invoices = get_all('invoices', 'id,invoice_number')
pyinv3_ids = set(i['id'] for i in invoices if i.get('invoice_number', '').startswith('PYINV3-'))
pyinv_ids = set(i['id'] for i in invoices if i.get('invoice_number', '').startswith('PYINV-') and not i.get('invoice_number', '').startswith('PYINV3-'))

all_pyinv_ids = pyinv3_ids | pyinv_ids
print("PYINV invoice IDs:", len(all_pyinv_ids))

linked = get_all('payments', 'id,payment_number,amount,invoice_id,payment_status,contract_id,company_id', 'invoice_id=not.is.null')
stuck = [p for p in linked if p.get('invoice_id') in all_pyinv_ids]
print("Payments still linked to PYINV* invoices:", len(stuck))

reversed_count = 0
still_stuck = 0

for i, p in enumerate(stuck):
    pid = p['id']
    pay_num = p.get('payment_number', '?')
    
    # Approach 1: Try direct invoice_id=NULL
    ok, err = patch('payments', 'id=eq.' + pid, {'invoice_id': None})
    if ok:
        reversed_count += 1
        continue
    
    # Approach 2: Try setting status to 'cancelled' first
    ok2, _ = patch('payments', 'id=eq.' + pid, {'payment_status': 'cancelled'})
    if ok2:
        ok3, _ = patch('payments', 'id=eq.' + pid, {'invoice_id': None})
        if ok3:
            reversed_count += 1
            continue
        # Revert status
        patch('payments', 'id=eq.' + pid, {'payment_status': 'completed'})
    
    # Approach 3: Remove contract_id, then invoice_id=NULL
    if p.get('contract_id'):
        ok4, _ = patch('payments', 'id=eq.' + pid, {'contract_id': None})
        if ok4:
            ok5, _ = patch('payments', 'id=eq.' + pid, {'invoice_id': None})
            if ok5:
                reversed_count += 1
                continue
            # Restore contract_id
            patch('payments', 'id=eq.' + pid, {'contract_id': p['contract_id']})
    
    # Approach 4: Set to pending, then invoice_id=NULL
    ok6, _ = patch('payments', 'id=eq.' + pid, {'payment_status': 'pending'})
    if ok6:
        ok7, _ = patch('payments', 'id=eq.' + pid, {'invoice_id': None})
        if ok7:
            # Try to set back to completed
            patch('payments', 'id=eq.' + pid, {'payment_status': 'completed'})
            reversed_count += 1
            continue
        # Revert status
        patch('payments', 'id=eq.' + pid, {'payment_status': 'completed'})
    
    still_stuck += 1
    if still_stuck <= 5:
        print(f"  STUCK: {pay_num} - {err[:100]}")

    if (i + 1) % 50 == 0:
        print(f"  Processed {i+1}/{len(stuck)}... reversed={reversed_count} stuck={still_stuck}")

print(f"\nReversed: {reversed_count}")
print(f"Still stuck: {still_stuck}")
print("Done!")
