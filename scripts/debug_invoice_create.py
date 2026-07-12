"""Debug: Why do placeholder invoice creations fail?"""
import requests
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

# Get one unlinked payment
r = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,amount,invoice_id,contract_id,customer_id,company_id,payment_date&invoice_id=is.null&limit=1', headers=H)
print('Payment:', r.status_code, r.text[:500])
if r.status_code == 200 and r.json():
    p = r.json()[0]
    print('\nPayment details:')
    for k, v in p.items():
        print('  ' + k + ': ' + str(v))

    # Try to create a placeholder invoice
    inv_data = {
        'invoice_number': 'PYINV-TEST-' + str(p.get('payment_number', 'UNK')),
        'total_amount': p.get('amount', 0),
        'status': 'paid',
        'customer_id': p.get('customer_id'),
        'company_id': p.get('company_id'),
        'contract_id': p.get('contract_id'),
        'invoice_date': p.get('payment_date'),
    }
    inv_data = {k: v for k, v in inv_data.items() if v is not None}
    print('\nInvoice data to send:')
    for k, v in inv_data.items():
        print('  ' + k + ': ' + str(v))

    r2 = requests.post(BASE_URL + '/rest/v1/invoices', headers=H, json=inv_data)
    print('\nPOST result:', r2.status_code)
    print('Response:', r2.text[:500])

    # Also try with minimal data
    inv_data2 = {
        'invoice_number': 'PYINV-TEST2',
        'total_amount': 100,
        'status': 'draft',
        'company_id': p.get('company_id'),
    }
    r3 = requests.post(BASE_URL + '/rest/v1/invoices', headers=H, json=inv_data2)
    print('\nMinimal POST result:', r3.status_code)
    print('Response:', r3.text[:500])

    # Check what columns invoices table has
    r4 = requests.get(BASE_URL + '/rest/v1/invoices?select=*&limit=1', headers=H)
    if r4.status_code == 200 and r4.json():
        print('\nSample invoice columns:')
        for k in r4.json()[0].keys():
            print('  ' + k)