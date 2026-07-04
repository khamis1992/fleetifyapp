"""Test: Link invoice by temporarily changing dates to avoid constraints"""
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

# Get the invoice (already has 2099-01-01 as invoice_date from previous test)
r = requests.get(BASE_URL + '/rest/v1/invoices?select=id,invoice_number,customer_id,invoice_date,due_date,invoice_month&invoice_number=eq.PYINV-PAY-0455&limit=1', headers=H)
inv = r.json()[0]
print('Invoice:', inv['invoice_number'], '| date:', inv['invoice_date'], '| due:', inv['due_date'])

# Get contracts for this customer
r2 = requests.get(BASE_URL + '/rest/v1/contracts?select=id,contract_number,start_date&customer_id=eq.' + inv['customer_id'] + '&limit=5', headers=H)
con = r2.json()[0]
print('Contract:', con['contract_number'], '| start:', con.get('start_date'))

# Step 1: Set due_date to 2099-01-01 to match invoice_date
r3 = requests.patch(BASE_URL + '/rest/v1/invoices?id=eq.' + inv['id'], headers=H, json={
    'due_date': '2099-01-01'
})
print('Set due_date:', r3.status_code, r3.text[:200])

if r3.status_code == 200:
    # Step 2: Set contract_id
    r4 = requests.patch(BASE_URL + '/rest/v1/invoices?id=eq.' + inv['id'], headers=H, json={'contract_id': con['id']})
    print('Set contract_id:', r4.status_code, r4.text[:300])
    
    if r4.status_code == 200:
        print('SUCCESS! Now restore original dates...')
        # Step 3: Restore original dates
        r5 = requests.patch(BASE_URL + '/rest/v1/invoices?id=eq.' + inv['id'], headers=H, json={
            'invoice_date': '2024-05-01',
            'due_date': '2024-05-01',
            'invoice_month': '2024-05-01'
        })
        print('Restore dates:', r5.status_code, r5.text[:300])
    else:
        print('FAILED to set contract_id')