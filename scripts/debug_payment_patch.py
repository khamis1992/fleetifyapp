"""
Debug: Why is the payment PATCH failing?
Check if invoice_id can be set on a payment, and fix all 3 remaining issues.
"""
import requests, json
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

# Get one unlinked payment
r = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,invoice_id,company_id&invoice_id=is.null&limit=1', headers=H)
print('Unlinked payment:', r.text[:300])
p = r.json()[0]

# Get a PYINV3 invoice for the same company
r2 = requests.get(BASE_URL + '/rest/v1/invoices?select=id,invoice_number,company_id&invoice_number=like.PYINV3-%25&limit=1', headers=H)
print('\nPYINV3 invoice:', r2.text[:300])
if r2.json():
    inv = r2.json()[0]
    print('\nTrying to link payment ' + str(p.get('payment_number')) + ' to invoice ' + str(inv.get('invoice_number')))
    print('  Payment ID: ' + str(p['id']))
    print('  Invoice ID: ' + str(inv['id']))
    
    # Try PATCH
    r3 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'invoice_id': inv['id']})
    print('\nPATCH status:', r3.status_code)
    print('PATCH response:', r3.text[:500])
    
    if r3.status_code == 200:
        print('SUCCESS!')
    else:
        # Check if there's a constraint
        print('\nTrying with Prefer header...')
        r4 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers={
            'apikey': SRK,
            'Authorization': 'Bearer ' + SRK,
            'Content-Type': 'application/json',
        }, json={'invoice_id': inv['id']})
        print('PATCH2 status:', r4.status_code)
        print('PATCH2 response:', r4.text[:500])