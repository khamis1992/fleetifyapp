"""
Test: Can we change payment_status to pending, patch invoice_id, then set back to completed?
"""
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

# Get PAY-0455
r = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,invoice_id,payment_status,company_id&payment_number=eq.PAY-0455&limit=1', headers=H)
p = r.json()[0]
print('Payment:', p)

# Get a PYINV3 invoice for same company
r2 = requests.get(BASE_URL + '/rest/v1/invoices?select=id,invoice_number,company_id&invoice_number=like.PYINV3-%25&company_id=eq.' + p['company_id'] + '&limit=1', headers=H)
print('Invoice:', r2.text[:200])
inv = r2.json()[0]

# Step 1: Change payment_status to pending
print('\n1. PATCH payment_status -> pending...')
r3 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'payment_status': 'pending'})
print('   Status:', r3.status_code, r3.text[:300])

if r3.status_code == 200:
    # Step 2: Set invoice_id
    print('\n2. PATCH invoice_id...')
    r4 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'invoice_id': inv['id']})
    print('   Status:', r4.status_code, r4.text[:300])
    
    if r4.status_code == 200:
        # Step 3: Set payment_status back to completed
        print('\n3. PATCH payment_status -> completed...')
        r5 = requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'payment_status': 'completed'})
        print('   Status:', r5.status_code, r5.text[:300])
        
        # Verify
        r6 = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,invoice_id,payment_status&payment_number=eq.PAY-0455&limit=1', headers=H)
        print('\nFinal state:', r6.text[:200])
    else:
        # Try to revert status
        requests.patch(BASE_URL + '/rest/v1/payments?id=eq.' + p['id'], headers=H, json={'payment_status': 'completed'})
        print('\nReverted payment_status to completed')