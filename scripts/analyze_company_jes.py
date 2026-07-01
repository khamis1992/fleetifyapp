#!/usr/bin/env python3
"""Investigate unknown accounts and compute accounting equation for company only."""
import json, os, urllib.request, urllib.parse

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

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

# Fetch all JE IDs for this company
print("Fetching company JE IDs...")
jes = fetch_paginated(f"journal_entries?select=id&company_id=eq.{CID}")
je_ids = [je['id'] for je in jes]
print(f"  {len(je_ids)} JEs for company")

# Fetch all accounts across all companies
print("Fetching ALL chart_of_accounts...")
all_accounts = fetch_paginated("chart_of_accounts?select=id,account_code,account_name,account_type,company_id")
print(f"  {len(all_accounts)} accounts total")

# Build maps
global_acc = {a['id']: a for a in all_accounts}
company_acc_ids = set(a['id'] for a in all_accounts if a.get('company_id') == CID)

# Fetch all JELs (paginated) and filter to company JEs
print("Fetching ALL journal_entry_lines...")
jels = fetch_paginated("journal_entry_lines?select=journal_entry_id,account_id,debit_amount,credit_amount")
print(f"  {len(jels)} JELs total")

# Filter to this company's JEs
company_je_set = set(je_ids)
company_jels = [l for l in jels if l.get('journal_entry_id') in company_je_set]
print(f"  {len(company_jels)} JELs belong to company {CID[:8]}")

# Analyze account types
type_debit = {}
type_credit = {}
type_count = {}
unknown_accounts = {}
for l in company_jels:
    aid = l.get('account_id')
    acc = global_acc.get(aid, {})
    at = acc.get('account_type', 'NOT_FOUND')
    d = float(l.get('debit_amount') or 0)
    c = float(l.get('credit_amount') or 0)
    type_debit[at] = type_debit.get(at, 0) + d
    type_credit[at] = type_credit.get(at, 0) + c
    type_count[at] = type_count.get(at, 0) + 1
    if aid not in company_acc_ids:
        if aid not in unknown_accounts:
            unknown_accounts[aid] = {'name': acc.get('account_name','NOT FOUND'), 'type': at, 'company': str(acc.get('company_id','?'))[:8], 'lines': 0}
        unknown_accounts[aid]['lines'] += 1

print(f"\n=== POSTING ANALYSIS (company-scoped, {len(company_jels)} lines) ===")
print(f"{'Type':<15} {'Lines':>8} {'Total Debit':>15} {'Total Credit':>15} {'Net':>15}")
print("-" * 65)
for t in sorted(type_count.keys()):
    d = type_debit.get(t, 0)
    c = type_credit.get(t, 0)
    print(f"{t:<15} {type_count[t]:>8} {d:>15,.2f} {c:>15,.2f} {d-c:>15,.2f}")

total_d = sum(type_debit.values())
total_c = sum(type_credit.values())
print("-" * 65)
print(f"{'TOTAL':<15} {len(company_jels):>8} {total_d:>15,.2f} {total_c:>15,.2f} {total_d-total_c:>15,.2f}")

# Show unknown accounts
print(f"\n=== ACCOUNTS FROM OTHER COMPANIES ({len(unknown_accounts)} unique) ===")
for aid, info in list(unknown_accounts.items())[:10]:
    print(f"  {aid[:8]}... {info['name']:<30} type={info['type']:<12} company={info['company']}... lines={info['lines']}")

# Accounting equation
ta = type_debit.get('assets', 0) - type_credit.get('assets', 0)
tr = type_credit.get('revenue', 0) - type_debit.get('revenue', 0)
te = type_debit.get('expenses', 0) - type_credit.get('expenses', 0)
tl = type_credit.get('liabilities', 0) - type_debit.get('liabilities', 0)
teq = type_credit.get('equity', 0) - type_debit.get('equity', 0)
ni = tr - te

print(f"\n=== ACCOUNTING EQUATION ===")
print(f"  Assets (net debit):      {ta:>15,.2f}")
print(f"  Liabilities (net credit):{tl:>15,.2f}")
print(f"  Equity (net credit):     {teq:>15,.2f}")
print(f"  Revenue (net credit):    {tr:>15,.2f}")
print(f"  Expenses (net debit):    {te:>15,.2f}")
print(f"  Net Income (R-E):        {ni:>15,.2f}")
print(f"\n  A = {ta:,.2f}")
print(f"  L+E = {tl+teq:,.2f}")
print(f"  A-(L+E) = {ta-(tl+teq):,.2f}")
print(f"\n  After closing NI to Retained Earnings:")
print(f"  A = L + (E + NI) = {tl} + ({teq} + {ni}) = {tl+teq+ni:,.2f}")
print(f"  A-(L+E+NI) = {ta-(tl+teq+ni):,.2f}")
if abs(ta-(tl+teq+ni)) < 0.01:
    print("  PASS: Accounting equation would balance after closing entries!")
else:
    print(f"  Still imbalanced by {ta-(tl+teq+ni):,.2f} — check for cross-company postings")