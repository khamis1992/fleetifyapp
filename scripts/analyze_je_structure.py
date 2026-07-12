#!/usr/bin/env python3
"""Analyze JE structure — what account types are being used in postings?"""
import json, os, urllib.request

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

# Fetch JELs joined with CoA to see what account types are being posted
def fetch_all_paginated(url):
    all_data = []
    batch = 1000
    start = 0
    while True:
        end = start + batch - 1
        req = urllib.request.Request(f"{BASE}/{url}", headers={
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

# Fetch chart_of_accounts for the company
print("Fetching chart_of_accounts...")
coa = fetch_all_paginated(f"chart_of_accounts?select=id,account_code,account_name,account_type&company_id=eq.{CID}&limit=500")
print(f"  Got {len(coa)} accounts")

# Build account_id -> account_type map
acc_type_map = {a['id']: a.get('account_type', '?') for a in coa}
acc_name_map = {a['id']: a.get('account_name', '?') for a in coa}

# Fetch all JELs
print("Fetching journal_entry_lines...")
jels = fetch_all_paginated("journal_entry_lines?select=journal_entry_id,account_id,debit_amount,credit_amount,line_number")
print(f"  Got {len(jels)} lines")

# Analyze: what account types are being posted to?
type_debit = {}
type_credit = {}
type_count = {}
for l in jels:
    aid = l.get('account_id')
    at = acc_type_map.get(aid, 'UNKNOWN')
    d = float(l.get('debit_amount') or 0)
    c = float(l.get('credit_amount') or 0)
    type_debit[at] = type_debit.get(at, 0) + d
    type_credit[at] = type_credit.get(at, 0) + c
    type_count[at] = type_count.get(at, 0) + 1

print("\n=== POSTING ANALYSIS BY ACCOUNT TYPE ===")
print(f"{'Type':<15} {'Lines':>8} {'Total Debit':>15} {'Total Credit':>15} {'Net':>15}")
print("-" * 65)
for t in sorted(type_count.keys()):
    d = type_debit.get(t, 0)
    c = type_credit.get(t, 0)
    net = d - c
    print(f"{t:<15} {type_count[t]:>8} {d:>15,.2f} {c:>15,.2f} {net:>15,.2f}")

total_d = sum(type_debit.values())
total_c = sum(type_credit.values())
print("-" * 65)
print(f"{'TOTAL':<15} {len(jels):>8} {total_d:>15,.2f} {total_c:>15,.2f} {total_d-total_c:>15,.2f}")

# Check if there are UNKNOWN accounts (account_id not in CoA for this company)
unknown_count = type_count.get('UNKNOWN', 0)
if unknown_count > 0:
    print(f"\nWARNING: {unknown_count} lines reference accounts not in this company's CoA (cross-company postings?)")

# Key finding: does the system post to liability/equity accounts at all?
liab_debit = type_debit.get('liabilities', 0)
liab_credit = type_credit.get('liabilities', 0)
equity_debit = type_debit.get('equity', 0)
equity_credit = type_credit.get('equity', 0)
print(f"\n=== KEY FINDING ===")
print(f"Liabilities: D={liab_debit:,.2f} C={liab_credit:,.2f}")
print(f"Equity: D={equity_debit:,.2f} C={equity_credit:,.2f}")
if liab_debit == 0 and liab_credit == 0:
    print("CRITICAL: No postings to liability accounts — system doesn't record liabilities!")
if equity_debit == 0 and equity_credit == 0:
    print("CRITICAL: No postings to equity accounts — system doesn't record equity!")
    print("  This is WHY the accounting equation (A=L+E) fails.")
    print("  The system only posts to assets and revenue/expense accounts.")
    print("  Revenue is a temporary account that should be closed to retained earnings (equity).")
    print("  FIX: Add closing entries that transfer net income (revenue - expenses) to retained earnings.")