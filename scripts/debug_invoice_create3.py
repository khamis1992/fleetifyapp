"""Debug: Create invoice with invoice_type"""
import requests, json
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
p = r.json()[0]

# Check existing invoices for valid invoice_type values
r_types = requests.get(BASE_URL + '/rest/v1/invoices?select=invoice_type&limit=5', headers=H)
print('Sample invoice_types:', r_types.text[:200])

# Try with invoice_type='sales'
inv_data = {
    'invoice_number': 'PYINV-TEST4',
    'total_amount': p.get('amount', 0),
    'subtotal': p.get('amount', 0),
    'status': 'paid',
    'payment_status': 'paid',
    'currency': 'QAR',
    'company_id': p.get('company_id'),
    'invoice_date': p.get('payment_date'),
    'due_date': p.get('payment_date'),
    'balance_due': 0,
    'invoice_type': 'sales',
}
print('\nSending:', json.dumps(inv_data, indent=2))
r2 = requests.post(BASE_URL + '/rest/v1/invoices', headers=H, json=inv_data)
print('\nStatus:', r2.status_code)
print('Response:', r2.text[:500])

if r2.status_code == 201:
    print('\nSUCCESS! Created invoice.')
    # Clean up - delete it
    inv = r2.json()[0]
    requests.delete(BASE_URL + '/rest/v1/invoices?id=eq.' + inv['id'], headers=H)
    print('Cleaned up test invoice.')