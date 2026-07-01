#!/usr/bin/env python3
"""Create a second closing entry for the new revenue from linked invoices."""
import json, os, urllib.request

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

def insert(table, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(f"{BASE}/{table}", data=body, headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        return None

def update(table, data, filter_str):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(f"{BASE}/{table}?{filter_str}", data=body, headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json', 'Prefer': 'return=representation',
    }, method='PATCH')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        return None

def fetch(url_path):
    req = urllib.request.Request(f"{BASE}/{url_path}", headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def rpc(name, payload=None):
    req = urllib.request.Request(f"{BASE}/rpc/{name}", data=json.dumps(payload or {}).encode(),
        headers={'apikey': SRK, 'Authorization': f'Bearer {SRK}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
            return 'OK'
    except Exception as e:
        return f'Error: {e}'

# Find postable equity account (3100)
equity = fetch(f"chart_of_accounts?select=id,account_code,account_name&company_id=eq.{CID}&account_type=eq.equity&is_header=eq.false&account_code=eq.3100&limit=1")
retained = equity[0] if equity else None
print(f"Retained Earnings: {retained['account_name']} ({retained['id'][:8]}...)")

# Find revenue accounts with non-zero balances
revenue = fetch(f"chart_of_accounts?select=id,account_code,account_name,current_balance&company_id=eq.{CID}&account_type=eq.revenue&is_header=eq.false&limit=50")
print(f"\nRevenue accounts with non-zero balance:")
total_rev = 0
rev_lines = []
for a in revenue:
    bal = float(a.get('current_balance') or 0)
    if abs(bal) > 0.01:
        print(f"  {a['account_code']} {a['account_name']}: {bal:,.2f}")
        total_rev += abs(bal)
        rev_lines.append({'id': a['id'], 'name': a['account_name'], 'balance': abs(bal)})

print(f"\nTotal revenue to close: {total_rev:,.2f}")

if total_rev < 0.01:
    print("No revenue to close — equation should already be balanced.")
    exit(0)

# Create closing JE as draft
je_data = {
    'company_id': CID,
    'entry_number': 'JE-CLOSE-20260701-V4',
    'entry_date': '2026-07-01',
    'description': 'Closing Entry 2 - Transfer new revenue to Retained Earnings',
    'status': 'draft',
    'total_debit': total_rev,
    'total_credit': total_rev,
    'reference_type': 'closing',
}
je_res = insert('journal_entries', je_data)
if not je_res or len(je_res) == 0:
    print("FAILED to create JE")
    exit(1)
je_id = je_res[0]['id']
print(f"\nCreated draft JE: {je_id[:8]}...")

# Add lines
lines = []
line_num = 1
for r in rev_lines:
    lines.append({
        'journal_entry_id': je_id,
        'account_id': r['id'],
        'debit_amount': r['balance'],
        'credit_amount': 0,
        'line_number': line_num,
        'line_description': f'Closing - {r["name"]}',
    })
    line_num += 1

lines.append({
    'journal_entry_id': je_id,
    'account_id': retained['id'],
    'debit_amount': 0,
    'credit_amount': total_rev,
    'line_number': line_num,
    'line_description': 'Closing - Net income to Retained Earnings',
})

print(f"Inserting {len(lines)} lines...")
line_res = insert('journal_entry_lines', lines)
if line_res and len(line_res) == len(lines):
    print(f"  {len(line_res)} lines created!")
    # Post
    post = update('journal_entries', {'status': 'posted', 'posted_at': '2026-07-01T12:00:00Z'}, f"id=eq.{je_id}")
    if post:
        print("  Posted!")
    else:
        print("  FAILED to post!")
else:
    print("  FAILED to add lines!")
    exit(1)

# Update balances
print("\nUpdating account balances...")
rpc('update_account_balances_from_entries')

# Verify
print("\n=== FINAL VERIFICATION ===")
coa = fetch(f"chart_of_accounts?select=account_type,current_balance&company_id=eq.{CID}&limit=500")
tb = {}
for a in coa:
    at = a.get('account_type', '?')
    tb[at] = tb.get(at, 0) + float(a.get('current_balance') or 0)

ta = tb.get('assets', 0)
tl = tb.get('liabilities', 0)
te = tb.get('equity', 0)
tr = tb.get('revenue', 0)
print(f"  Assets:      {ta:>15,.2f}")
print(f"  Liabilities: {tl:>15,.2f}")
print(f"  Equity:      {te:>15,.2f}")
print(f"  Revenue:     {tr:>15,.2f}")
print(f"  A = {ta:,.2f}")
print(f"  L+E = {tl+te:,.2f}")
diff = abs(ta-(tl+te))
print(f"  Diff: {diff:,.2f}")
print(f"  {'PASS: A=L+E ✅' if diff < 0.01 else f'FAIL: off by {diff:,.2f}'}")