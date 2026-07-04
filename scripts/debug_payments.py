"""Debug: Check what payments are missing"""
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

# Get unlinked payments and check their company_id
r = requests.get(BASE_URL + '/rest/v1/payments?select=id,payment_number,amount,invoice_id,contract_id,customer_id,company_id,payment_date&invoice_id=is.null&limit=10', headers=H)
print('Unlinked payments (first 10):')
for p in r.json()[:10]:
    print('  ' + str(p.get('payment_number')) + ' | company_id=' + str(p.get('company_id')) + ' | customer=' + str(p.get('customer_id')) + ' | contract=' + str(p.get('contract_id')) + ' | amount=' + str(p.get('amount')))

# Check: do these payments belong to a different company?
# Get distinct company_ids from payments
r2 = requests.get(BASE_URL + '/rest/v1/payments?select=company_id&limit=5000', headers=H)
companies = set()
for p in r2.json():
    if p.get('company_id'):
        companies.add(p['company_id'])
print('\nDistinct company_ids in payments: ' + str(len(companies)))
for c in companies:
    print('  ' + str(c))

# Check: what company_ids exist?
r3 = requests.get(BASE_URL + '/rest/v1/companies?select=id,name&limit=10', headers=H)
print('\nCompanies:')
for c in r3.json():
    print('  ' + str(c.get('id')) + ' | ' + str(c.get('name', '?')))