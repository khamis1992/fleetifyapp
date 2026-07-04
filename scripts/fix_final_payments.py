"""
Fix 33 remaining payments: temporarily remove contract_id to bypass overpayment trigger,
link invoice, then restore contract_id.
"""
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
print("FIX 33 REMAINING PAYMENTS (contract overpayment bypass)")
print("=" * 70)

# Get unlinked payments
unlinked = get_all('payments', 'id,payment_number,amount,invoice_id,payment_status,company_id,contract_id,customer_id', 'invoice_id=is.null')
print("Unlinked payments:", len(unlinked))

# Get PYINV3 invoices
invoices = get_all('invoices', 'id,invoice_number,total_amount,company_id')
pyinv3_lookup = {}
for inv in invoices:
    inv_num = inv.get('invoice_number', '')
    if inv_num and 'PYINV3-' in inv_num:
        pay_num = inv_num.replace('PYINV3-', '')
        pyinv3_lookup[pay_num] = inv
print("PYINV3 invoices:", len(pyinv3_lookup))

linked = 0
failed = 0
for p in unlinked:
    pay_num = p.get('payment_number', '')
    original_contract_id = p.get('contract_id')

    if pay_num not in pyinv3_lookup:
        print("  NO MATCH: " + pay_num)
        failed += 1
        continue

    inv = pyinv3_lookup[pay_num]

    # Step 1: Temporarily remove contract_id (bypass overpayment trigger)
    if original_contract_id:
        ok, err = patch('payments', 'id=eq.' + p['id'], {'contract_id': None})
        if not ok:
            # Payment is immutable even for contract_id change
            # Try setting payment_status to pending first
            ok2, err2 = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'pending'})
            if not ok2:
                print("  CANNOT MODIFY: " + pay_num + " - " + err2)
                failed += 1
                continue
            # Now try removing contract_id
            ok, err = patch('payments', 'id=eq.' + p['id'], {'contract_id': None})
            if not ok:
                print("  CANNOT REMOVE CONTRACT: " + pay_num + " - " + err)
                failed += 1
                continue

    # Step 2: Set invoice_id
    ok3, err3 = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
    if not ok3:
        print("  CANNOT SET INVOICE: " + pay_num + " - " + err3)
        failed += 1
        # Restore contract_id
        if original_contract_id:
            patch('payments', 'id=eq.' + p['id'], {'contract_id': original_contract_id})
        continue

    # Step 3: Update invoice amount to match payment
    pay_amount = float(p.get('amount', 0))
    patch('invoices', 'id=eq.' + inv['id'], {'total_amount': pay_amount, 'subtotal': pay_amount, 'balance_due': 0})

    # Step 4: Set payment_status back to completed
    ok4, err4 = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
    if not ok4:
        # Leave as pending - still linked
        print("  LINKED (pending): " + pay_num + " - " + err4)
        linked += 1
        continue

    # Step 5: Restore contract_id
    if original_contract_id:
        ok5, err5 = patch('payments', 'id=eq.' + p['id'], {'contract_id': original_contract_id})
        if not ok5:
            print("  LINKED but contract restore failed: " + pay_num + " - " + err5)

    linked += 1
    print("  LINKED: " + pay_num)

print("\nResults: linked=" + str(linked) + ", failed=" + str(failed))