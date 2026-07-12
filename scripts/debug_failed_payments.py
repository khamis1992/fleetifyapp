"""Debug: why can't we set PAY-IMP-1767526937-70 to pending?"""
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

# Get payment
r = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,amount,invoice_id,payment_status,company_id,customer_id,contract_id&payment_number=eq.PAY-IMP-1767526937-70&limit=1', headers=H)
p = r.json()[0]
print('Payment:', p)

# Try step 1: set to pending
print('\n1. PATCH payment_status -> pending...')
r2 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'payment_status': 'pending'})
print('  Status:', r2.status_code)
print('  Response:', r2.text[:500])

# Check if there's a PYINV3 invoice for this payment
r3 = requests.get(BASE_URL + '/rest/v1/invoices?select=id,invoice_number,total_amount&invoice_number=eq.PYINV3-PAY-IMP-1767526937-70&limit=1', headers=H)
print('\nPYINV3 invoice:', r3.text[:300])

# Also check ALL PYINV3 invoices for this company
r4 = requests.get(BASE_URL + '/rest/v1/invoices?select=id,invoice_number,total_amount&invoice_number=like.PYINV3-PAY-IMP%25&limit=5', headers=H)
print('\nPYINV3-PAY-IMP invoices:', r4.text[:500])