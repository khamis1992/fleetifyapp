#!/usr/bin/env python3
"""Create closing entry: transfer net income (revenue - expenses) to Retained Earnings (equity)."""
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

# Step 1: Find or create a Retained Earnings account (equity type)
print("=== STEP 1: Find Retained Earnings account ===")
url = f"{BASE}/chart_of_accounts?select=id,account_code,account_name,account_type&company_id=eq.{CID}&account_type=eq.equity&limit=10"
req = urllib.request.Request(url, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
})
with urllib.request.urlopen(req) as resp:
    equity_accounts = json.loads(resp.read())

print(f"  Found {len(equity_accounts)} equity accounts:")
for a in equity_accounts:
    print(f"    {a['account_code']} {a['account_name']} ({a['id'][:8]}...)")

# Look for a Retained Earnings account
retained = None
for a in equity_accounts:
    if 'retained' in a['account_name'].lower() or 'أرباح' in a['account_name'] or 'مبقاة' in a['account_name']:
        retained = a
        break

if not retained and equity_accounts:
    # Use first equity account as retained earnings
    retained = equity_accounts[0]
    print(f"  Using first equity account as Retained Earnings: {retained['account_code']} {retained['account_name']}")
elif not retained:
    # Create a Retained Earnings account
    print("  No equity account found — creating one...")
    new_acc = supabase_insert('chart_of_accounts', {
        'company_id': CID,
        'account_code': '3100',
        'account_name': 'Retained Earnings / الأرباح المحتجزة',
        'account_type': 'equity',
        'balance_type': 'credit',
        'is_active': True,
        'is_header': False,
        'account_level': 2,
        'current_balance': 0,
    })
    if new_acc and len(new_acc) > 0:
        retained = new_acc[0]
        print(f"  Created: {retained['account_code']} {retained['account_name']} ({retained['id'][:8]}...)")
    else:
        print("  FAILED to create retained earnings account")
        exit(1)
else:
    print(f"  Found Retained Earnings: {retained['account_code']} {retained['account_name']}")

# Step 2: Find revenue accounts to close
print("\n=== STEP 2: Find revenue accounts to close ===")
url = f"{BASE}/chart_of_accounts?select=id,account_code,account_name,account_type&company_id=eq.{CID}&account_type=eq.revenue&is_header=eq.false&limit=50"
req = urllib.request.Request(url, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
})
with urllib.request.urlopen(req) as resp:
    revenue_accounts = json.loads(resp.read())

print(f"  Found {len(revenue_accounts)} revenue accounts:")
for a in revenue_accounts[:5]:
    print(f"    {a['account_code']} {a['account_name']} ({a['id'][:8]}...)")

# Fetch all JELs for company (paginated)
print("Fetching all JELs...")
all_jels = []
start = 0
batch = 1000
while True:
    end = start + batch - 1
    jel_url = f"{BASE}/journal_entry_lines?select=journal_entry_id,account_id,debit_amount,credit_amount"
    req = urllib.request.Request(jel_url, headers={
        'apikey': SRK,
        'Authorization': f'Bearer {SRK}',
        'Range': f'{start}-{end}',
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        all_jels.extend(data)
        if len(data) < batch:
            break
        start += batch
print(f"  Got {len(all_jels)} JELs")

# Get company JE IDs
url = f"{BASE}/journal_entries?select=id&company_id=eq.{CID}&status=eq.posted&limit=5000"
req = urllib.request.Request(url, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
})
with urllib.request.urlopen(req) as resp:
    company_jes = json.loads(resp.read())
company_je_ids = set(je['id'] for je in company_jes)

# Calculate net credit per revenue account
revenue_balances = {}
for l in all_jels:
    if l.get('journal_entry_id') not in company_je_ids:
        continue
    aid = l.get('account_id')
    # Check if this is a revenue account
    for ra in revenue_accounts:
        if ra['id'] == aid:
            d = float(l.get('debit_amount') or 0)
            c = float(l.get('credit_amount') or 0)
            if aid not in revenue_balances:
                revenue_balances[aid] = 0
            revenue_balances[aid] += c - d  # Revenue is credit balance
            break

total_revenue = sum(revenue_balances.values())
print(f"  Total revenue to close: {total_revenue:,.2f} QAR")
for aid, bal in revenue_balances.items():
    if abs(bal) > 0.01:
        acc = next((ra for ra in revenue_accounts if ra['id'] == aid), None)
        name = acc['account_name'] if acc else '?'
        print(f"    {name}: {bal:,.2f}")

# Step 4: Create closing JE
print(f"\n=== STEP 4: Create closing journal entry ===")
today = "2026-07-01"
entry_number = f"JE-CLOSE-20260701"

# Create the journal entry header
je_data = {
    'company_id': CID,
    'entry_number': entry_number,
    'entry_date': today,
    'description': 'Closing Entry - Transfer net income to Retained Earnings',
    'status': 'posted',
    'total_debit': total_revenue,
    'total_credit': total_revenue,
    'reference_type': 'closing',
    'reference_id': None,
}

je_result = supabase_insert('journal_entries', je_data)
if not je_result or len(je_result) == 0:
    print("  FAILED to create closing JE")
    exit(1)

je_id = je_result[0]['id']
print(f"  Created JE: {entry_number} (id={je_id[:8]}...)")

# Create lines: debit each revenue account, credit retained earnings
lines = []
line_num = 1
for aid, bal in revenue_balances.items():
    if abs(bal) < 0.01:
        continue
    # Debit revenue account (to zero it out)
    lines.append({
        'journal_entry_id': je_id,
        'account_id': aid,
        'debit_amount': bal,
        'credit_amount': 0,
        'line_number': line_num,
        'line_description': 'Closing entry - Revenue account closure',
    })
    line_num += 1

# Credit retained earnings with total
lines.append({
    'journal_entry_id': je_id,
    'account_id': retained['id'],
    'debit_amount': 0,
    'credit_amount': total_revenue,
    'line_number': line_num,
    'line_description': 'Closing entry - Net income to Retained Earnings',
})

print(f"  Creating {len(lines)} lines...")
jel_result = supabase_insert('journal_entry_lines', lines)
if jel_result:
    print(f"  Created {len(jel_result)} lines successfully!")
else:
    print(f"  FAILED to create lines!")

# Step 5: Re-run update_account_balances_from_entries
print("\n=== STEP 5: Re-run update_account_balances_from_entries ===")
rpc_url = f"{BASE}/rpc/update_account_balances_from_entries"
rpc_body = json.dumps({}).encode('utf-8')
rpc_req = urllib.request.Request(rpc_url, data=rpc_body, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
    'Content-Type': 'application/json',
})
try:
    with urllib.request.urlopen(rpc_req) as resp:
        result = resp.read().decode('utf-8')
        print(f"  RPC result: {result or 'OK'}")
except Exception as e:
    print(f"  RPC error: {e}")

# Step 6: Verify accounting equation
print("\n=== STEP 6: Verify accounting equation ===")
url = f"{BASE}/chart_of_accounts?select=account_type,current_balance&company_id=eq.{CID}&limit=500"
req = urllib.request.Request(url, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
})
with urllib.request.urlopen(req) as resp:
    coa_final = json.loads(resp.read())

type_bal = {}
for a in coa_final:
    at = a.get('account_type', '?')
    bal = float(a.get('current_balance') or 0)
    type_bal[at] = type_bal.get(at, 0) + bal

ta = type_bal.get('assets', 0)
tl = type_bal.get('liabilities', 0)
te = type_bal.get('equity', 0)
tr = type_bal.get('revenue', 0)

print(f"  Assets:      {ta:>15,.2f}")
print(f"  Liabilities: {tl:>15,.2f}")
print(f"  Equity:      {te:>15,.2f}")
print(f"  Revenue:     {tr:>15,.2f}")
print(f"  A = {ta:,.2f}")
print(f"  L+E = {tl+te:,.2f}")
diff = abs(ta - (tl+te))
print(f"  Diff: {diff:,.2f}")
if diff < 0.01:
    print("  PASS: Accounting equation A = L + E now balances!")
else:
    print(f"  Still imbalanced by {diff:,.2f}")