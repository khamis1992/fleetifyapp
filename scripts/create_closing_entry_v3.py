#!/usr/bin/env python3
"""Create closing entry using a postable retained earnings account."""
import json, os, urllib.request

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

def supabase_insert(table, data):
    url = f"{BASE}/{table}"
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode('utf-8')}")
        return None

def supabase_update(table, data, filter_str):
    url = f"{BASE}/{table}?{filter_str}"
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
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
    while True:
        end = start + 999
        req = urllib.request.Request(f"{BASE}/{url_path}", headers={
            'apikey': SRK, 'Authorization': f'Bearer {SRK}',
            'Range': f'{start}-{end}',
        })
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            all_data.extend(data)
            if len(data) < 1000:
                break
            start += 1000
    return all_data

# Delete the failed draft JE from previous attempt
print("=== Cleanup previous attempts ===")
for entry_num in ['JE-CLOSE-20260701', 'JE-CLOSE-20260701-V2']:
    del_url = f"{BASE}/journal_entries?entry_number=eq.{entry_num}"
    del_req = urllib.request.Request(del_url, headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
    }, method='DELETE')
    try:
        with urllib.request.urlopen(del_req) as resp:
            resp.read()
            print(f"  Deleted {entry_num}")
    except:
        pass

# Step 1: Find a postable (non-header) equity account
print("\n=== STEP 1: Find postable equity account ===")
equity_accounts = fetch_paginated(
    f"chart_of_accounts?select=id,account_code,account_name,is_header,account_level&company_id=eq.{CID}&account_type=eq.equity&limit=50")

postable_equity = [a for a in equity_accounts if a.get('is_header') == False]
print(f"  {len(equity_accounts)} equity accounts, {len(postable_equity)} postable")
for a in equity_accounts:
    print(f"    {a['account_code']} {a['account_name']} header={a.get('is_header')} level={a.get('account_level')}")

# Find or create a postable retained earnings account
retained = None
for a in postable_equity:
    if 'retained' in a['account_name'].lower() or 'أرباح' in a['account_name']:
        retained = a
        break

if not retained and postable_equity:
    retained = postable_equity[0]
    print(f"\n  Using: {retained['account_code']} {retained['account_name']} (id={retained['id'][:8]}...)")
elif not retained:
    # Create a postable retained earnings account under 321
    print("\n  Creating postable retained earnings account...")
    new_acc = supabase_insert('chart_of_accounts', {
        'company_id': CID,
        'account_code': '3210',
        'account_name': 'Retained Earnings (Postable)',
        'account_type': 'equity',
        'balance_type': 'credit',
        'is_active': True,
        'is_header': False,
        'account_level': 3,
        'current_balance': 0,
    })
    if new_acc and len(new_acc) > 0:
        retained = new_acc[0]
        print(f"  Created: {retained['account_code']} {retained['account_name']} (id={retained['id'][:8]}...)")
    else:
        print("  FAILED to create account!")
        exit(1)
else:
    print(f"\n  Using: {retained['account_code']} {retained['account_name']} (id={retained['id'][:8]}...)")

# Step 2: Find revenue accounts
print("\n=== STEP 2: Revenue accounts ===")
revenue_accounts = fetch_paginated(
    f"chart_of_accounts?select=id,account_code,account_name&company_id=eq.{CID}&account_type=eq.revenue&is_header=eq.false&limit=50")
print(f"  {len(revenue_accounts)} revenue accounts")

# Step 3: Calculate revenue balances
print("\n=== STEP 3: Calculate revenue balances ===")
all_jels = fetch_paginated("journal_entry_lines?select=journal_entry_id,account_id,debit_amount,credit_amount")
company_jes = fetch_paginated(f"journal_entries?select=id&company_id=eq.{CID}&status=eq.posted&limit=5000")
company_je_ids = set(je['id'] for je in company_jes)

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
print(f"  Total revenue: {total_revenue:,.2f} QAR")
for aid, bal in sorted(revenue_balances.items(), key=lambda x: -abs(x[1])):
    if abs(bal) > 0.01:
        acc = next((ra for ra in revenue_accounts if ra['id'] == aid), None)
        print(f"    {acc['account_name'] if acc else '?'}: {bal:,.2f}")

# Step 4: Create closing JE as draft
print(f"\n=== STEP 4: Create closing JE as draft ===")
je_data = {
    'company_id': CID,
    'entry_number': 'JE-CLOSE-20260701-V3',
    'entry_date': '2026-07-01',
    'description': 'Closing Entry - Transfer net income to Retained Earnings',
    'status': 'draft',
    'total_debit': total_revenue,
    'total_credit': total_revenue,
    'reference_type': 'closing',
}
je_result = supabase_insert('journal_entries', je_data)
if not je_result or len(je_result) == 0:
    print("  FAILED to create JE!")
    exit(1)
je_id = je_result[0]['id']
print(f"  Created: id={je_id[:8]}...")

# Step 5: Add lines
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
        'line_description': 'Closing - Revenue closure',
    })
    line_num += 1

lines.append({
    'journal_entry_id': je_id,
    'account_id': retained['id'],
    'debit_amount': 0,
    'credit_amount': total_revenue,
    'line_number': line_num,
    'line_description': 'Closing - Net income to Retained Earnings',
})

print(f"  Inserting {len(lines)} lines...")
jel_result = supabase_insert('journal_entry_lines', lines)
if jel_result and len(jel_result) == len(lines):
    print(f"  SUCCESS: {len(jel_result)} lines!")
else:
    print(f"  FAILED: {jel_result}")
    exit(1)

# Step 6: Post JE
print(f"\n=== STEP 6: Post JE ===")
post_result = supabase_update('journal_entries',
    {'status': 'posted', 'posted_at': '2026-07-01T12:00:00Z'},
    f'id=eq.{je_id}')
if post_result:
    print(f"  Posted!")
else:
    print(f"  FAILED to post!")

# Step 7: Update balances
print(f"\n=== STEP 7: Update balances ===")
rpc_url = f"{BASE}/rpc/update_account_balances_from_entries"
rpc_req = urllib.request.Request(rpc_url, data=json.dumps({}).encode(),
    headers={'apikey': SRK, 'Authorization': f'Bearer {SRK}', 'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(rpc_req) as resp:
        resp.read()
        print(f"  OK")
except Exception as e:
    print(f"  Error: {e}")

# Step 8: Verify
print(f"\n=== STEP 8: Verify ===")
coa = fetch_paginated(f"chart_of_accounts?select=account_type,current_balance&company_id=eq.{CID}&limit=500")
tb = {}
for a in coa:
    at = a.get('account_type', '?')
    tb[at] = tb.get(at, 0) + float(a.get('current_balance') or 0)

ta = tb.get('assets', 0)
tl = tb.get('liabilities', 0)
te = tb.get('equity', 0)
tr = tb.get('revenue', 0)
print(f"  Assets: {ta:>15,.2f}")
print(f"  Liab:   {tl:>15,.2f}")
print(f"  Equity: {te:>15,.2f}")
print(f"  Revenue:{tr:>15,.2f}")
print(f"  A = {ta:,.2f}")
print(f"  L+E = {tl+te:,.2f}")
diff = abs(ta-(tl+te))
print(f"  Diff: {diff:,.2f}")
if diff < 0.01:
    print("  PASS: A = L + E!")
else:
    print(f"  Still off by {diff:,.2f}")