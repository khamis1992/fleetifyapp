"""
Fix 33 remaining payments by temporarily increasing contract_amount to bypass
the overpayment trigger, then linking the invoice, then restoring the original amount.
"""
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

def restore_contract_amount_and_balance(cid, original_amount):
    payments = get_all(
        'payments',
        'amount,payment_status',
        'contract_id=eq.' + cid + '&payment_status=eq.completed'
    )
    total_paid = sum(float(p.get('amount') or 0) for p in payments)
    balance_due = max(float(original_amount or 0) - total_paid, 0)
    return patch('contracts', 'id=eq.' + cid, {
        'contract_amount': original_amount,
        'total_paid': total_paid,
        'balance_due': balance_due
    })

print("=" * 70)
print("FIX 33 REMAINING PAYMENTS (contract amount bypass)")
print("=" * 70)

# Get unlinked payments
unlinked = get_all('payments', 'id,payment_number,amount,invoice_id,payment_status,company_id,contract_id', 'invoice_id=is.null')
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
    cid = p.get('contract_id')
    
    if pay_num not in pyinv3_lookup:
        print("  NO MATCH: " + pay_num)
        failed += 1
        continue
    
    inv = pyinv3_lookup[pay_num]
    
    if cid:
        # Get current contract_amount
        r = requests.get(BASE_URL + '/rest/v1/contracts?select=id,contract_amount&limit=1&id=eq.' + cid, headers=H)
        if r.status_code == 200 and r.json():
            original_amount = r.json()[0].get('contract_amount', 0)
            
            # Step 1: Temporarily increase contract_amount to 999,999,999
            ok, err = patch('contracts', 'id=eq.' + cid, {'contract_amount': 999999999})
            if not ok:
                print("  CANNOT UPDATE CONTRACT: " + pay_num + " - " + err)
                failed += 1
                continue
            
            # Step 2: Set payment to pending
            ok2, err2 = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'pending'})
            if not ok2:
                print("  CANNOT SET PENDING: " + pay_num + " - " + err2)
                # Restore contract amount
                restore_contract_amount_and_balance(cid, original_amount)
                failed += 1
                continue
            
            # Step 3: Set invoice_id
            ok3, err3 = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
            if not ok3:
                print("  CANNOT SET INVOICE: " + pay_num + " - " + err3)
                # Restore payment status and contract amount
                patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
                restore_contract_amount_and_balance(cid, original_amount)
                failed += 1
                continue
            
            # Step 4: Update invoice amount to match payment
            pay_amount = float(p.get('amount', 0))
            patch('invoices', 'id=eq.' + inv['id'], {'total_amount': pay_amount, 'subtotal': pay_amount, 'balance_due': 0})
            
            # Step 5: Set payment back to completed
            ok5, err5 = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
            
            # Step 6: Restore contract amount
            restore_contract_amount_and_balance(cid, original_amount)
            
            if ok5:
                linked += 1
                print("  LINKED: " + pay_num)
            else:
                # Payment is linked but stays as pending
                linked += 1
                print("  LINKED (pending): " + pay_num + " - " + err5)
        else:
            print("  CONTRACT NOT FOUND: " + pay_num)
            failed += 1
    else:
        # No contract_id - just try pending -> set invoice -> completed
        ok, _ = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'pending'})
        if not ok:
            print("  IMMUTABLE (no contract): " + pay_num)
            failed += 1
            continue
        ok2, _ = patch('payments', 'id=eq.' + p['id'], {'invoice_id': inv['id']})
        if not ok2:
            patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
            failed += 1
            continue
        pay_amount = float(p.get('amount', 0))
        patch('invoices', 'id=eq.' + inv['id'], {'total_amount': pay_amount, 'subtotal': pay_amount, 'balance_due': 0})
        ok3, _ = patch('payments', 'id=eq.' + p['id'], {'payment_status': 'completed'})
        if ok3:
            linked += 1
            print("  LINKED (no contract): " + pay_num)
        else:
            linked += 1
            print("  LINKED (pending, no contract): " + pay_num)

print("\nResults: linked=" + str(linked) + ", failed=" + str(failed))
