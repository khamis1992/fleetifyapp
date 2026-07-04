"""Debug: Get full error for invoice creation"""
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
r = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,amount,invoice_id,contract_id,customer_id,company_id,payment_date&invoice_id=is.null&limit=1', headers=H)
p = r.json()[0]

# Try to create a placeholder invoice
inv_data = {
    'invoice_number': 'PYINV-TEST-' + str(p.get('payment_number', 'UNK')),
    'total_amount': p.get('amount', 0),
    'status': 'paid',
    'customer_id': p.get('customer_id'),
    'company_id': p.get('company_id'),
    'invoice_date': p.get('payment_date'),
}
r2 = requests.post(BASE_URL + '/rest/v1/invoices', headers=H, json=inv_data)
print('Status:', r2.status_code)
print('Full response:')
print(json.dumps(r2.json(), indent=2) if r2.headers.get('content-type', '').startswith('application/json') else r2.text)

# Also check: what NOT NULL columns does invoices have?
# Try with ALL fields filled
inv_data2 = {
    'invoice_number': 'PYINV-TEST3',
    'total_amount': 100,
    'subtotal': 100,
    'status': 'draft',
    'payment_status': 'unpaid',
    'currency': 'QAR',
    'company_id': p.get('company_id'),
    'invoice_date': '2024-05-02',
    'due_date': '2024-05-02',
    'balance_due': 100,
}
r3 = requests.post(BASE_URL + '/rest/v1/invoices', headers=H, json=inv_data2)
print('\nFull fields POST status:', r3.status_code)
print('Response:', r3.text[:500])