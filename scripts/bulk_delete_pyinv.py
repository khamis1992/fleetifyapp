"""
Bulk delete all PYINV* placeholder invoices and their journal entries.
5-step chain: NULL journal_entry_id -> JE to draft -> delete lines -> delete JE -> delete invoice
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

def get_all(table, select='*', filters=''):
    rows = []
    off = 0
    while True:
        url = BASE_URL + '/rest/v1/' + table + '?select=' + select + '&limit=1000&offset=' + str(off)
        if filters:
            url += '&' + filters
        r = requests.get(url, headers=H)
        if r.status_code != 200:
            break
        batch = r.json()
        rows.extend(batch)
        if len(batch) < 1000:
            break
        off += 1000
        time.sleep(0.05)
    return rows

print("=" * 70)
print("BULK DELETE PYINV* INVOICES + JOURNAL ENTRIES")
print("=" * 70)

# Get all PYINV* invoices with their journal_entry_id
invoices = get_all('invoices', 'id,invoice_number,journal_entry_id', 'invoice_number=like.PYINV-%25')
print(f"Found {len(invoices)} PYINV* invoices")

deleted_inv = 0
deleted_je = 0
failed = 0

for i, inv in enumerate(invoices):
    inv_id = inv['id']
    je_id = inv.get('journal_entry_id')
    
    # Step 1: NULL journal_entry_id on invoice
    r1 = requests.patch(BASE_URL + '/rest/v1/invoices?id=eq.' + inv_id, headers=H, json={'journal_entry_id': None})
    if r1.status_code != 200:
        failed += 1
        continue
    
    if je_id:
        # Step 2: Set JE to draft
        r2 = requests.patch(BASE_URL + '/rest/v1/journal_entries?id=eq.' + je_id, headers=H, json={'status': 'draft'})
        if r2.status_code != 200:
            failed += 1
            continue
        
        # Step 3: Delete JE lines
        r3 = requests.delete(BASE_URL + '/rest/v1/journal_entry_lines?journal_entry_id=eq.' + je_id, headers=H)
        if r3.status_code != 200:
            failed += 1
            continue
        
        # Step 4: Delete JE
        r4 = requests.delete(BASE_URL + '/rest/v1/journal_entries?id=eq.' + je_id, headers=H)
        if r4.status_code == 200:
            deleted_je += 1
    
    # Step 5: Delete invoice
    r5 = requests.delete(BASE_URL + '/rest/v1/invoices?id=eq.' + inv_id, headers=H)
    if r5.status_code == 200:
        deleted_inv += 1
    else:
        failed += 1
    
    if (i + 1) % 100 == 0:
        print(f"  Processed {i+1}/{len(invoices)}... inv={deleted_inv} je={deleted_je} fail={failed}")

print(f"\nDeleted invoices: {deleted_inv}")
print(f"Deleted journal entries: {deleted_je}")
print(f"Failed: {failed}")
print("Done!")