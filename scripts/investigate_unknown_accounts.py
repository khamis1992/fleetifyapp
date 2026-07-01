#!/usr/bin/env python3
"""Investigate the 1744 UNKNOWN account lines and create a closing entry for the accounting equation."""
import json, os, urllib.request

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

# Fetch all accounts across ALL companies to find the UNKNOWN account IDs
print("Fetching ALL chart_of_accounts (all companies)...")
all_accounts = []
start = 0
batch = 1000
while True:
    end = start + batch - 1
    url = f"{BASE}/chart_of_accounts?select=id,account_code,account_name,account_type,company_id&limit={batch}"
    req = urllib.request.Request(url, headers={
        'apikey': SRK,
        'Authorization': f'Bearer {SRK}',
        'Range': f'{start}-{end}',
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        all_accounts.extend(data)
        if len(data) < batch:
            break
        start += batch
print(f"  Got {len(all_accounts)} accounts across all companies")

# Build global account map
global_acc_map = {a['id']: a for a in all_accounts}

# Fetch JELs for this company only (via journal_entries filter)
print("Fetching JELs for company via journal_entries join...")
jel_url = f"{BASE}/journal_entry_lines?select=journal_entry_id,account_id,debit_amount,credit_amount&journal_entry_id=in.(select id from journal_entries where company_id eq.{CID})&limit=10000"
req = urllib.request.Request(jel_url, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
})
with urllib.request.urlopen(req) as resp:
    jels = json.loads(resp.read())
print(f"  Got {len(jels)} JELs for company {CID[:8]}")

# Find UNKNOWN account IDs
coa_ids = set(a['id'] for a in all_accounts if a.get('company_id') == CID)
unknown_ids = set()
company_acc_ids = set(a['id'] for a in all_accounts)
for l in jels:
    aid = l.get('account_id')
    if aid and aid not in coa_ids:
        unknown_ids.add(aid)

print(f"\n  {len(unknown_ids)} unique account IDs not in company's CoA")
print(f"  These reference accounts from other companies or missing accounts")

# Show some unknown accounts
for aid in list(unknown_ids)[:10]:
    acc = global_acc_map.get(aid, {})
    print(f"    {aid[:8]}... code={acc.get('account_code','?')} name={acc.get('account_name','NOT FOUND')} type={acc.get('account_type','?')} company={str(acc.get('company_id','?'))[:8]}...")

# Now compute the accounting equation with ONLY this company's JELs
type_debit = {}
type_credit = {}
for l in jels:
    aid = l.get('account_id')
    at = global_acc_map.get(aid, {}).get('account_type', 'UNKNOWN')
    d = float(l.get('debit_amount') or 0)
    c = float(l.get('credit_amount') or 0)
    type_debit[at] = type_debit.get(at, 0) + d
    type_credit[at] = type_credit.get(at, 0) + c

print(f"\n=== POSTING ANALYSIS (company-scoped, {len(jels)} lines) ===")
print(f"{'Type':<15} {'Total Debit':>15} {'Total Credit':>15} {'Net':>15}")
print("-" * 65)
for t in sorted(set(list(type_debit.keys()) + list(type_credit.keys()))):
    d = type_debit.get(t, 0)
    c = type_credit.get(t, 0)
    print(f"{t:<15} {d:>15,.2f} {c:>15,.2f} {d-c:>15,.2f}")

ta = type_debit.get('assets', 0) - type_credit.get('assets', 0)
tr = type_credit.get('revenue', 0) - type_debit.get('revenue', 0)
te = type_debit.get('expenses', 0) - type_credit.get('expenses', 0)
tl = type_credit.get('liabilities', 0) - type_debit.get('liabilities', 0)
teq = type_credit.get('equity', 0) - type_debit.get('equity', 0)
net_income = tr - te

print(f"\n=== ACCOUNTING EQUATION ===")
print(f"  Assets (net debit):     {ta:>15,.2f}")
print(f"  Liabilities (net cred): {tl:>15,.2f}")
print(f"  Equity (net credit):    {teq:>15,.2f}")
print(f"  Revenue (net credit):   {tr:>15,.2f}")
print(f"  Expenses (net debit):   {te:>15,.2f}")
print(f"  Net Income:             {net_income:>15,.2f}")
print(f"  A = {ta:,.2f}")
print(f"  L+E = {tl+teq:,.2f}")
print(f"  A - (L+E) = {ta-(tl+teq):,.2f}")
print(f"  If we close net income to equity: A = L + (E + NI) = {tl} + ({teq} + {net_income}) = {tl+teq+net_income:,.2f}")
print(f"  After closing: A - (L+E+NI) = {ta-(tl+teq+net_income):,.2f}")