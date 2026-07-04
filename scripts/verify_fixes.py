"""
Fleetify Financial Remediation — Post-Fix Verification
Verifies all 5 issues are resolved
"""
import requests, time
from dotenv import dotenv_values
from collections import defaultdict

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()
H = {
    'apikey': SRK,
    'Authorization': 'Bearer ' + SRK,
    'Content-Type': 'application/json'
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

print("=" * 70)
print("FLEETIFY POST-FIX VERIFICATION")
print("=" * 70)

# Fetch all data
entries = get_all('journal_entries', 'id,entry_number,status')
lines = get_all('journal_entry_lines', 'journal_entry_id,debit_amount,credit_amount')
payments = get_all('payments', 'id,payment_number,invoice_id,contract_id,customer_id')
invoices = get_all('invoices', 'id,invoice_number,status,contract_id,customer_id')
contracts = get_all('contracts', 'id')

linked_ids = set(l['journal_entry_id'] for l in lines)
inv_ids = set(i['id'] for i in invoices)
con_ids = set(c['id'] for c in contracts)

# 1. Empty entries
empty = [e for e in entries if e['id'] not in linked_ids]
print("\n1. Empty journal entries: " + str(len(empty)))
for e in empty[:5]:
    print("   " + str(e.get('entry_number', '?')) + " (status=" + str(e.get('status', '?')) + ")")

# 2. Zero-amount entries
et = defaultdict(lambda: {'d': 0, 'c': 0, 'n': 0})
for l in lines:
    e = l['journal_entry_id']
    et[e]['d'] += float(l.get('debit_amount') or 0)
    et[e]['c'] += float(l.get('credit_amount') or 0)
    et[e]['n'] += 1
zero_ids = [eid for eid, t in et.items() if t['d'] == 0 and t['c'] == 0 and t['n'] > 0]
print("\n2. Zero-amount entries: " + str(len(zero_ids)))

# 3. Draft entries
drafts = [e for e in entries if e.get('status') == 'draft']
print("\n3. Draft entries: " + str(len(drafts)))
draft_with_lines = [e for e in drafts if e['id'] in linked_ids]
draft_empty = [e for e in drafts if e['id'] not in linked_ids]
print("   With lines: " + str(len(draft_with_lines)))
print("   Without lines: " + str(len(draft_empty)))

# 4. Unlinked payments
unlinked_pay = [p for p in payments if not p.get('invoice_id') or p['invoice_id'] not in inv_ids]
print("\n4. Unlinked payments: " + str(len(unlinked_pay)))
unlinked_no_inv = [p for p in payments if not p.get('invoice_id')]
unlinked_bad_inv = [p for p in payments if p.get('invoice_id') and p['invoice_id'] not in inv_ids]
print("   NULL invoice_id: " + str(len(unlinked_no_inv)))
print("   Non-existent invoice_id: " + str(len(unlinked_bad_inv)))

# 5. Unlinked invoices
unlinked_inv = [i for i in invoices if not i.get('contract_id') or i['contract_id'] not in con_ids]
print("\n5. Unlinked invoices: " + str(len(unlinked_inv)))
unlinked_no_con = [i for i in invoices if not i.get('contract_id')]
unlinked_bad_con = [i for i in invoices if i.get('contract_id') and i['contract_id'] not in con_ids]
print("   NULL contract_id: " + str(len(unlinked_no_con)))
print("   Non-existent contract_id: " + str(len(unlinked_bad_con)))

# Summary
print("\n" + "=" * 70)
print("VERIFICATION SUMMARY")
print("=" * 70)
all_pass = True
checks = [
    ("Empty entries", len(empty)),
    ("Zero-amount entries", len(zero_ids)),
    ("Draft entries", len(drafts)),
    ("Unlinked payments", len(unlinked_pay)),
    ("Unlinked invoices", len(unlinked_inv)),
]
for name, count in checks:
    status = "PASS" if count == 0 else "FAIL"
    if count > 0:
        all_pass = False
    print("  " + name + ": " + str(count) + " [" + status + "]")

if all_pass:
    print("\n  *** ALL CHECKS PASSED ***")
else:
    print("\n  *** SOME CHECKS FAILED — remaining issues above ***")
print("=" * 70)