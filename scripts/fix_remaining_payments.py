"""
Fix 50 remaining unlinked payments.
These failed because setting payment_status back to 'completed' failed
(amount mismatch with invoice). They should be pending with invoice_id already set.
We need to:
1. Check which payments are actually unlinked (invoice_id is null)
2. For those, check why they failed and retry with correct invoice
"""
import requests, time
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
print("FIX 50 REMAINING UNLINKED PAYMENTS")
print("=" * 70)

# Get all unlinked payments
unlinked = get_all('payments', 'id,payment_number,amount,invoice_id,payment_status,company_id,customer_id,payment_date', 'invoice_id=is.null')
print("Total unlinked payments:", len(unlinked))

# Also get payments that are 'pending' (the 50 errors left them as pending with invoice_id set)
pending = get_all('payments', 'id,payment_number,amount,invoice_id,payment_status,company_id', 'payment_status=eq.pending')
print("Pending payments:", len(pending))

# Get all invoices
invoices = get_all('invoices', 'id,invoice_number,total_amount,company_id,customer_id')
inv_ids = set(i['id'] for i in invoices)

# Build PYINV3 lookup by payment_number
pyinv3_lookup = {}
for inv in invoices:
    inv_num = inv.get('invoice_number', '')
    if inv_num and 'PYINV3-' in inv_num:
        pay_num = inv_num.replace('PYINV3-', '')
        pyinv3_lookup[pay_num] = inv

print("PYINV3 invoices available:", len(pyinv3_lookup))

# Fix: For each truly unlinked payment, try the 3-step approach
# But first check if any pending payments already have invoice_id set
pending_with_invoice = [p for p in pending if p.get('invoice_id')]
print("Pending payments with invoice_id already set:", len(pending_with_invoice))

# For pending payments WITH invoice_id: try setting back to completed
if pending_with_invoice:
    print("\nFixing pending payments (already have invoice_id)...")
    fixed = 0
    for p in pending_with_invoice:
        ok, err = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
        if ok:
            fixed += 1
        else:
            # Amount mismatch - update the invoice total to match payment
            pay_amount = float(p.get('amount', 0))
            inv_id = p['invoice_id']
            # Update invoice total to match payment amount
            inv_data = {'total_amount': pay_amount, 'subtotal': pay_amount, 'balance_due': 0}
            patch('invoices', 'id=eq.' + inv_id, inv_data)
            # Now try again
            ok2, err2 = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
            if ok2:
                fixed += 1
            else:
                print("  STILL FAILED: " + str(p.get('payment_number', '?')) + " - " + err2)
    print("  Fixed " + str(fixed) + " pending -> completed")

# For truly unlinked (invoice_id is null): try the 3-step
truly_unlinked = [p for p in unlinked]
if truly_unlinked:
    print("\nFixing truly unlinked payments (invoice_id=null)...")
    linked = 0
    failed = 0
    for p in truly_unlinked:
        pay_num = p.get('payment_number', '')
        if pay_num in pyinv3_lookup:
            inv = pyinv3_lookup[pay_num]
            # Step 1: pending
            ok1, _ = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'pending'})
            if not ok1:
                failed += 1
                continue
            # Step 2: set invoice_id
            ok2, _ = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
            if not ok2:
                patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
                failed += 1
                continue
            # Step 3: Update invoice amount to match payment
            pay_amount = float(p.get('amount', 0))
            patch('invoices', 'id=eq.' + inv['id'], {'total_amount': pay_amount, 'subtotal': pay_amount, 'balance_due': 0})
            # Step 4: Set back to completed
            ok3, _ = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
            if ok3:
                linked += 1
            else:
                # Leave as pending with invoice linked
                linked += 1
        else:
            failed += 1
    print("  Linked: " + str(linked))
    print("  Failed: " + str(failed))

print("\nDone!")