"""Clean up test invoice and check current state"""
import requests
from dotenv import dotenv_values

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()
H = {
    'apikey': SRK,
    'Authorization': 'Bearer ' + SRK,
    'Content-Type': 'application/json',
}

# Delete test invoice
r = requests.delete(BASE_URL + '/rest/v1/invoices?invoice_number=like.PYINV2-TEST%25', headers=H)
print('Deleted test invoices:', r.status_code)

r2 = requests.delete(BASE_URL + '/rest/v1/invoices?invoice_number=eq.PYINV2-PAY-0455', headers=H)
print('Deleted PYINV2-PAY-0455:', r2.status_code)

# Check current unlinked payments count
r3 = requests.get(BASE_URL + '/rest/v1/payments?select=id&invoice_id=is.null&limit=5000', headers=H)
print('\nCurrent unlinked payments:', len(r3.json()))

# Check how many have company_id
r4 = requests.get(BASE_URL + '/rest/v1/payments?select=id,company_id&invoice_id=is.null&limit=5000', headers=H)
with_co = sum(1 for p in r4.json() if p.get('company_id'))
without_co = sum(1 for p in r4.json() if not p.get('company_id'))
print('  With company_id:', with_co)
print('  Without company_id:', without_co)

# Check what's the actual error for these payments when creating invoices
# Pick one without company_id
no_co = [p for p in r4.json() if not p.get('company_id')]
if no_co:
    pid = no_co[0]['id']
    r5 = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,amount,company_id,customer_id,payment_date&limit=1', headers=H)
    print('\nSample payment without company_id:', r5.json())