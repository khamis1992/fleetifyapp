#!/usr/bin/env python3
"""Create closing entry properly: create as draft, add lines, then post."""
import json, os, urllib.request

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

def supabase_insert(table, data):
    url = f"{BASE}/{table}"
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={
        'apikey': SRK,
        'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode('utf-8')}")
        return None
    except Exception as e:
        print(f"  Error: {e}")
        return None

def supabase_update(table, data, filter_str):
    url = f"{BASE}/{table}?{filter_str}"
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={
        'apikey': SRK,
        'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }, method='PATCH')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode('utf-8')}")
        return None

def fetch_paginated(url_path):
    all_data = []
    start = 0
    batch = 1000
    while True:
        end = start + batch - 1
        req = urllib.request.Request(f"{BASE}/{url_path}", headers={
            'apikey': SRK,
            'Authorization': f'Bearer {SRK}',
            'Range': f'{start}-{end}',
        })
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            all_data.extend(data)
            if len(data) < batch:
                break
            start += batch
    return all_data

# Step 0: Delete the failed closing JE from previous attempt
print("=== STEP 0: Delete previous failed closing JE ===")
prev = supabase_update('journal_entries', {'status': 'draft'},
    f'id=eq.e2219ab4-0000-0000-0000-000000000000')  # Won't match, that's OK
# Actually delete by entry_number
del_url = f"{BASE}/journal_entries?entry_number=eq.JE-CLOSE-20260701"
del_req = urllib.request.Request(del_url, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
}, method='DELETE')
try:
    with urllib.request.urlopen(del_req) as resp:
        print(f"  Deleted previous JE: {resp.read().decode()}")
except Exception as e:
    print(f"  Delete result: {e}")

# Step 1: Find Retained Earnings account
print("\n=== STEP 1: Find Retained Earnings ===")
url = f"{BASE}/chart_of_accounts?select=id,account_code,account_name&company_id=eq.{CID}&account_type=eq.equity&account_code=eq.321&limit=1"
req = urllib.request.Request(url, headers={'apikey': SRK, 'Authorization': f'Bearer {SRK}'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())
retained = data[0] if data else None
print(f"  Retained Earnings: {retained['account_code']} {retained['account_name']} ({retained['id'][:8]}...)")

# Step 2: Find ALL revenue accounts (non-header)
print("\n=== STEP 2: Find revenue accounts ===")
revenue_accounts = fetch_paginated(
    f"chart_of_accounts?select=id,account_code,account_name&company_id=eq.{CID}&account_type=eq.revenue&is_header=eq.false&limit=50")
print(f"  Found {len(revenue_accounts)} revenue accounts")

# Step 3: Fetch all JELs and company JE IDs, compute revenue balances
print("\n=== STEP 3: Calculate revenue balances ===")
all_jels = fetch_paginated("journal_entry_lines?select=journal_entry_id,account_id,debit_amount,credit_amount")
company_jes = fetch_paginated(f"journal_entries?select=id&company_id=eq.{CID}&status=eq.posted&limit=5000")
company_je_ids = set(je['id'] for je in company_jes)
print(f"  {len(company_je_ids)} posted JEs, {len(all_jels)} total JELs")

revenue_ids = set(ra['id'] for ra in revenue_accounts)
revenue_balances = {}
for l in all_jels:
    if l.get('journal_entry_id') not in company_je_ids:
        continue
    aid = l.get('account_id')
    if aid in revenue_ids:
        d = float(l.get('debit_amount') or 0)
        c = float(l.get('credit_amount') or 0)
        revenue_balances[aid] = revenue_balances.get(aid, 0) + c - d

total_revenue = sum(revenue_balances.values())
print(f"  Total revenue to close: {total_revenue:,.2f} QAR")
for aid, bal in sorted(revenue_balances.items(), key=lambda x: -abs(x[1])):
    if abs(bal) > 0.01:
        acc = next((ra for ra in revenue_accounts if ra['id'] == aid), None)
        name = acc['account_name'] if acc else '?'
        print(f"    {name}: {bal:,.2f}")

# Step 4: Create closing JE as DRAFT first
print(f"\n=== STEP 4: Create closing JE as draft ===")
entry_number = f"JE-CLOSE-20260701-V2"
je_data = {
    'company_id': CID,
    'entry_number': entry_number,
    'entry_date': '2026-07-01',
    'description': 'Closing Entry - Transfer net income to Retained Earnings',
    'status': 'draft',
    'total_debit': total_revenue,
    'total_credit': total_revenue,
    'reference_type': 'closing',
}
je_result = supabase_insert('journal_entries', je_data)
if not je_result or len(je_result) == 0:
    print("  FAILED to create JE")
    exit(1)
je_id = je_result[0]['id']
print(f"  Created draft JE: {entry_number} (id={je_id[:8]}...)")

# Step 5: Add lines (while draft)
print(f"\n=== STEP 5: Add lines ===")
lines = []
line_num = 1
for aid, bal in revenue_balances.items():
    if abs(bal) < 0.01:
        continue
    lines.append({
        'journal_entry_id': je_id,
        'account_id': aid,
        'debit_amount': bal,
        'credit_amount': 0,
        'line_number': line_num,
        'line_description': 'Closing entry - Revenue account closure',
    })
    line_num += 1

# Credit retained earnings
lines.append({
    'journal_entry_id': je_id,
    'account_id': retained['id'],
    'debit_amount': 0,
    'credit_amount': total_revenue,
    'line_number': line_num,
    'line_description': 'Closing entry - Net income to Retained Earnings',
})

print(f"  Inserting {len(lines)} lines...")
jel_result = supabase_insert('journal_entry_lines', lines)
if jel_result and len(jel_result) == len(lines):
    print(f"  SUCCESS: {len(jel_result)} lines created!")
else:
    print(f"  FAILED or partial: {jel_result}")
    exit(1)

# Step 6: Post the JE (change status from draft to posted)
print(f"\n=== STEP 6: Post the closing JE ===")
post_result = supabase_update('journal_entries',
    {'status': 'posted', 'posted_at': '2026-07-01T00:00:00Z'},
    f'id=eq.{je_id}')
if post_result and len(post_result) > 0:
    print(f"  SUCCESS: JE posted!")
else:
    print(f"  FAILED to post JE!")

# Step 7: Re-run update_account_balances_from_entries
print(f"\n=== STEP 7: Update account balances ===")
rpc_url = f"{BASE}/rpc/update_account_balances_from_entries"
rpc_body = json.dumps({}).encode('utf-8')
rpc_req = urllib.request.Request(rpc_url, data=rpc_body, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
    'Content-Type': 'application/json',
})
try:
    with urllib.request.urlopen(rpc_req) as resp:
        resp.read()
        print(f"  RPC: OK")
except Exception as e:
    print(f"  RPC error: {e}")

# Step 8: Verify accounting equation
print(f"\n=== STEP 8: Verify accounting equation ===")
coa_final = fetch_paginated(f"chart_of_accounts?select=account_type,current_balance&company_id=eq.{CID}&limit=500")
type_bal = {}
for a in coa_final:
    at = a.get('account_type', '?')
    bal = float(a.get('current_balance') or 0)
    type_bal[at] = type_bal.get(at, 0) + bal

ta = type_bal.get('assets', 0)
tl = type_bal.get('liabilities', 0)
te = type_bal.get('equity', 0)
tr = type_bal.get('revenue', 0)
te_exp = type_bal.get('expenses', 0)

print(f"  Assets:      {ta:>15,.2f}")
print(f"  Liabilities: {tl:>15,.2f}")
print(f"  Equity:      {te:>15,.2f}")
print(f"  Revenue:     {tr:>15,.2f}")
print(f"  Expenses:    {te_exp:>15,.2f}")
print(f"  A = {ta:,.2f}")
print(f"  L+E = {tl+te:,.2f}")
diff = abs(ta - (tl+te))
print(f"  Diff: {diff:,.2f}")
if diff < 0.01:
    print(f"  PASS: A = L + E — accounting equation balanced!")
else:
    print(f"  Still imbalanced by {diff:,.2f}")