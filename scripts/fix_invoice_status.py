"""
Change all PYINV and PYINV3 placeholder invoices to 'draft' status
so they don't appear as paid on the billing page.
"""
import requests, time
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
PS = 1000

def get_all(table, select='*', filters=''):
    rows = []
    off = 0
    while True:
        url = BASE_URL + '/rest/v1/' + table + '?select=' + select + '&limit=' + str(PS) + '&offset=' + str(off)
        if filters:
            url += '&' + filters
        r = requests.get(url, headers=H)
        if r.status_code != 200:
            break
        batch = r.json()
        rows.extend(batch)
        if len(batch) < PS:
            break
        off += PS
        time.sleep(0.05)
    return rows

print("Fetching PYINV/PYINV3 invoices...")
invoices = get_all('invoices', 'id,invoice_number,status')
pyinv = [i for i in invoices if i.get('invoice_number', '').startswith(('PYINV-', 'PYINV3-', 'PYINV2-'))]
print("Found " + str(len(pyinv)) + " placeholder invoices")

# Count by status
from collections import Counter
statuses = Counter(i.get('status', '?') for i in pyinv)
print("Statuses:", dict(statuses))

# Change all to 'draft'
changed = 0
for i, inv in enumerate(pyinv):
    if inv.get('status') != 'draft':
        r = requests.patch(
            BASE_URL + '/rest/v1/invoices?id=eq.' + inv['id'],
            headers=H,
            json={'status': 'draft'}
        )
        if r.status_code == 200:
            changed += 1
    if (i + 1) % 200 == 0:
        print("  Processed " + str(i + 1) + "/" + str(len(pyinv)) + "...")

print("Changed " + str(changed) + " invoices to draft")
print("Done!")