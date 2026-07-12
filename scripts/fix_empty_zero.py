"""Quick fix: empty + zero-amount entries only."""
import requests, time
from dotenv import dotenv_values
from collections import defaultdict

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL','').strip()
API_KEY = vals.get('SUPABASE_SERVICE_ROLE_KEY','').strip()
HEADERS = {
    'apikey': API_KEY,
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
PAGE_SIZE = 1000

def rest_get_all(table, select='*', filters=''):
    all_rows = []
    offset = 0
    while True:
        url = f'{BASE_URL}/rest/v1/{table}?select={select}&limit={PAGE_SIZE}&offset={offset}'
        if filters:
            url += f'&{filters}'
        r = requests.get(url, headers=HEADERS)
        if r.status_code != 200:
            print(f"  ERROR: {r.status_code} {r.text[:200]}")
            break
        rows = r.json()
        all_rows.extend(rows)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        time.sleep(0.05)
    return all_rows

def rest_delete(table, filters):
    url = f'{BASE_URL}/rest/v1/{table}?{filters}'
    r = requests.delete(url, headers=HEADERS)
    return r.status_code in (200, 204)

def rest_patch(table, filters, body):
    url = f'{BASE_URL}/rest/v1/{table}?{filters}'
    r = requests.patch(url, headers=HEADERS, json=body)
    return r.status_code == 200

# Fetch entries and lines
print("Fetching entries and lines...")
entries = rest_get_all('journal_entries', 'id,entry_number,status')
lines = rest_get_all('journal_entry_lines', 'journal_entry_id,debit_amount,credit_amount')
print(f"  {len(entries)} entries, {len(lines)} lines")

linked_ids = set(l['journal_entry_id'] for l in lines)

# 1. FIX EMPTY ENTRIES (no lines at all)
print("\n=== FIX 1: Empty entries ===")
empty = [e for e in entries if e['id'] not in linked_ids]
print(f"  Found {len(empty)} empty entries")
for e in empty:
    ok = rest_delete('journal_entries', f'id=eq.{e["id"]}')
    print(f"  {'DELETED' if ok else 'FAILED'}: {e.get('entry_number','?')} (status={e.get('status','?')})")

# 2. FIX ZERO-AMOUNT ENTRIES
print("\n=== FIX 2: Zero-amount entries ===")
entry_totals = defaultdict(lambda: {'debit': 0, 'credit': 0, 'lines': 0})
for l in lines:
    eid = l['journal_entry_id']
    entry_totals[eid]['debit'] += float(l.get('debit_amount') or 0)
    entry_totals[eid]['credit'] += float(l.get('credit_amount') or 0)
    entry_totals[eid]['lines'] += 1

zero_ids = [eid for eid, t in entry_totals.items() if t['debit'] == 0 and t['credit'] == 0 and t['lines'] > 0]
print(f"  Found {len(zero_ids)} zero-amount entries")
for eid in zero_ids:
    # Delete lines first
    rest_delete('journal_entry_lines', f'journal_entry_id=eq.{eid}')
    # Then delete entry
    ok = rest_delete('journal_entries', f'id=eq.{eid}')
    entry = next((e for e in entries if e['id'] == eid), None)
    print(f"  {'DELETED' if ok else 'FAILED'}: {entry.get('entry_number','?') if entry else eid[:8]}")

print("\n=== Done with fixes 1 & 2 ===")