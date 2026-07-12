"""Debug: Check exact error for PYINV2 invoice creation"""
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

# Get PAY-0455
r = requests.get(BASE_URL + '/rest/v1/payments?select=*&payment_number=eq.PAY-0455&limit=1', headers=H)
p = r.json()[0]
print('Payment PAY-0455:')
for k, v in p.items():
    print('  ' + k + ': ' + str(v))

# Try to create invoice with exact data
inv_data = {
    'invoice_number': 'PYINV2-PAY-0455',
    'total_amount': float(p.get('amount', 0)),
    'subtotal': float(p.get('amount', 0)),
    'status': 'paid',
    'payment_status': 'paid',
    'currency': 'QAR',
    'invoice_type': 'sales',
    'company_id': p.get('company_id'),
    'customer_id': p.get('customer_id'),
    'invoice_date': p.get('payment_date'),
    'due_date': p.get('payment_date'),
    'balance_due': 0,
}
# Remove None values
inv_data = {k: v for k, v in inv_data.items() if v is not None}
print('\nInvoice data:')
print(json.dumps(inv_data, indent=2))

r2 = requests.post(BASE_URL + '/rest/v1/invoices', headers=H, json=inv_data)
print('\nPOST status:', r2.status_code)
print('Response:', json.dumps(r2.json(), indent=2) if r2.headers.get('content-type', '').startswith('application/json') else r2.text)