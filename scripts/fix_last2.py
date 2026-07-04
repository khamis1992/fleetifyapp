"""Fix the last 2 unlinked payments: PAY-0995 and PAY-1272"""
import requests
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

for pay_num in ['PAY-0995', 'PAY-1272']:
    print('--- ' + pay_num + ' ---')
    
    # Get payment
    r = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,amount,invoice_id,payment_status&payment_number=eq.' + pay_num + '&limit=1', headers=H)
    p = r.json()[0]
    print('Payment status:', p['payment_status'])
    
    # Set to pending
    r2 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'payment_status': 'pending'})
    print('Set pending:', r2.status_code)
    
    # Get PYINV3 invoice and update to paid
    r3 = requests.get(BASE_URL + '/rest/v1/invoices?select=id,invoice_number,status,payment_status,total_amount,balance_due&invoice_number=eq.PYINV3-' + pay_num + '&limit=1', headers=H)
    if not r3.json():
        print('No PYINV3 invoice found!')
        continue
    inv = r3.json()[0]
    print('Invoice:', inv['invoice_number'], '| status=', inv['status'], '| payment_status=', inv['payment_status'])
    
    # Update invoice to paid
    r4 = requests.patch(BASE_URL + '/rest/v1/invoices?id=eq.' + inv['id'], headers=H, json={
        'status': 'paid',
        'payment_status': 'paid',
        'balance_due': 0,
        'paid_amount': float(inv['total_amount'])
    })
    print('Update invoice to paid:', r4.status_code)
    
    # Set invoice_id on payment
    r5 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'invoice_id': inv['id']})
    print('Set invoice_id:', r5.status_code, r5.text[:300])
    
    if r5.status_code == 200:
        # Set back to completed
        r6 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'payment_status': 'completed'})
        print('Set completed:', r6.status_code, r6.text[:200])
    else:
        # Revert
        requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'payment_status': 'completed'})
        print('FAILED - reverted to completed')

# Final check
r7 = requests.get(BASE_URL + '/rest/v1/payments?select=id&invoice_id=is.null&limit=10', headers=H)
print('\nFinal unlinked payments:', len(r7.json()))