#!/usr/bin/env python3
import json, sys
from collections import defaultdict

def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except:
        return []

je = load('/tmp/je.json')
jel = load('/tmp/jel.json')
coa = load('/tmp/coa.json')
pay = load('/tmp/pay.json')
inv = load('/tmp/inv.json')
periods = load('/tmp/periods.json')
bt = load('/tmp/bt.json')
dep = load('/tmp/dep.json')
bud = load('/tmp/bud.json')

print("=" * 80)
print("FLEETIFY CFO-LEVEL FINANCIAL SYSTEM AUDIT REPORT")
print("Company: Al-Araf Car Rental (24bc0b21-4e2d-4413-9842-31719a3669f4)")
print("=" * 80)

# ===== DOMAIN 1: Double-Entry Integrity =====
print("\n" + "=" * 60)
print("DOMAIN 1: DOUBLE-ENTRY INTEGRITY")
print("=" * 60)

# Check header-level balance (total_debit vs total_credit on journal_entries)
unbalanced_header = [e for e in je if abs(float(e.get('total_debit',0)) - float(e.get('total_credit',0))) > 0.01]
print(f"\n1a. Journal Entries (header-level balance):")
print(f"  Total JEs: {len(je)}")
print(f"  Unbalanced (total_debit != total_credit): {len(unbalanced_header)}")
if unbalanced_header:
    print("  CRITICAL FINDINGS:")
    for e in unbalanced_header[:10]:
        diff = float(e['total_debit']) - float(e['total_credit'])
        print(f"    {e['entry_number']}: D={e['total_debit']} C={e['total_credit']} diff={diff}")
else:
    print("  PASS: All journal entries have balanced debit=credit at header level.")

# Check line-level balance (sum of debit_amount vs credit_amount per JE)
je_line_sums = defaultdict(lambda: {'debit': 0, 'credit': 0, 'count': 0})
for line in jel:
    jid = line.get('journal_entry_id')
    if jid:
        je_line_sums[jid]['debit'] += float(line.get('debit_amount') or 0)
        je_line_sums[jid]['credit'] += float(line.get('credit_amount') or 0)
        je_line_sums[jid]['count'] += 1

unbalanced_lines = []
for jid, sums in je_line_sums.items():
    if abs(sums['debit'] - sums['credit']) > 0.01:
        unbalanced_lines.append((jid, sums))

print(f"\n1b. Journal Entry Lines (line-level balance):")
print(f"  Total JEs with lines: {len(je_line_sums)}")
print(f"  Unbalanced JEs (sum(debit) != sum(credit)): {len(unbalanced_lines)}")
if unbalanced_lines:
    print("  CRITICAL FINDINGS:")
    for jid, sums in unbalanced_lines[:10]:
        diff = sums['debit'] - sums['credit']
        print(f"    JE ID {jid}: D={sums['debit']} C={sums['credit']} diff={diff} lines={sums['count']}")
else:
    print("  PASS: All journal entry lines have balanced debit=credit at line level.")

# Check for JEs with no lines
je_ids = set(e['id'] for e in je)
je_ids_with_lines = set(je_line_sums.keys())
jes_without_lines = je_ids - je_ids_with_lines
print(f"\n1c. JEs without any lines:")
print(f"  JEs with no lines: {len(jes_without_lines)}")
if jes_without_lines:
    print("  WARNING: These entries have no detail lines (cannot verify balance):")
    for jid in list(jes_without_lines)[:5]:
        print(f"    {jid}")

# Check for entries with only 1 line (double-entry requires >= 2)
single_line_jes = [jid for jid, sums in je_line_sums.items() if sums['count'] < 2]
print(f"\n1d. JEs with fewer than 2 lines (violates double-entry):")
print(f"  Count: {len(single_line_jes)}")
if single_line_jes:
    print("  CRITICAL: Double-entry requires at least 2 lines per entry.")

# Status breakdown
status_counts = defaultdict(int)
for e in je:
    status_counts[e.get('status','unknown')] += 1
print(f"\n1e. JE Status breakdown:")
for status, count in sorted(status_counts.items()):
    print(f"  {status}: {count}")

# ===== DOMAIN 2: Chart of Accounts =====
print("\n" + "=" * 60)
print("DOMAIN 2: CHART OF ACCOUNTS")
print("=" * 60)
print(f"  Total accounts: {len(coa)}")

# Account types
type_counts = defaultdict(int)
for a in coa:
    type_counts[a.get('account_type','MISSING')] += 1
print(f"\n2a. Account types:")
for t, c in sorted(type_counts.items()):
    print(f"  {t}: {c}")

# Check for accounts with NULL/invalid types
invalid_types = [a for a in coa if a.get('account_type') not in ('assets','liabilities','equity','revenue','expense')]
print(f"\n2b. Accounts with invalid/NULL type: {len(invalid_types)}")
if invalid_types:
    for a in invalid_types[:5]:
        print(f"  {a.get('account_code')}: type={a.get('account_type')}")

# Check for duplicate account codes
codes = [a.get('account_code') for a in coa if a.get('account_code')]
dupes = [c for c in codes if codes.count(c) > 1]
print(f"\n2c. Duplicate account codes: {len(set(dupes))}")
if dupes:
    print(f"  Duplicate codes: {list(set(dupes))[:10]}")

# Check header accounts (should not have postings)
headers = [a for a in coa if a.get('is_header') == True]
non_headers = [a for a in coa if a.get('is_header') == False]
print(f"\n2d. Header accounts: {len(headers)}, Postable accounts: {len(non_headers)}")

# Check inactive accounts
inactive = [a for a in coa if a.get('is_active') == False]
print(f"\n2e. Inactive accounts: {len(inactive)}")

# Parent-child hierarchy check
accounts_by_id = {a.get('id'): a for a in coa}
circular = []
missing_parent = []
for a in coa:
    pid = a.get('parent_account_id')
    if pid:
        if pid == a.get('id'):
            circular.append(a)
        if pid not in accounts_by_id:
            missing_parent.append(a)
print(f"\n2f. Hierarchy issues:")
print(f"  Circular references (account is own parent): {len(circular)}")
print(f"  Missing parent accounts: {len(missing_parent)}")

# ===== DOMAIN 3: GL & Sub-Ledger Reconciliation =====
print("\n" + "=" * 60)
print("DOMAIN 3: GL & SUB-LEDGER RECONCILIATION")
print("=" * 60)

# Check if payments have journal_entry_id linking
payments_with_je = [p for p in pay if p.get('journal_entry_id')]
payments_without_je = [p for p in pay if not p.get('journal_entry_id')]
print(f"\n3a. Payment to GL linkage:")
print(f"  Total payments: {len(pay)}")
print(f"  Payments linked to JE: {len(payments_with_je)}")
print(f"  Payments WITHOUT JE link: {len(payments_without_je)}")
if payments_without_je:
    print(f"  WARNING: {len(payments_without_je)} payments are not linked to journal entries (GL gap)")

# Check if invoices have journal_entry_id linking
invoices_with_je = [i for i in inv if i.get('journal_entry_id')]
invoices_without_je = [i for i in inv if not i.get('journal_entry_id')]
print(f"\n3b. Invoice to GL linkage:")
print(f"  Total invoices: {len(inv)}")
print(f"  Invoices linked to JE: {len(invoices_with_je)}")
print(f"  Invoices WITHOUT JE link: {len(invoices_without_je)}")
if invoices_without_je:
    print(f"  WARNING: {len(invoices_without_je)} invoices are not linked to journal entries")

# ===== DOMAIN 4: Trial Balance =====
print("\n" + "=" * 60)
print("DOMAIN 4: TRIAL BALANCE (from account balances)")
print("=" * 60)

# Sum current_balance by account_type
type_balances = defaultdict(float)
for a in coa:
    balance = float(a.get('current_balance') or 0)
    type_balances[a.get('account_type','unknown')] += balance
print(f"\n4a. Account balances by type:")
for t, b in sorted(type_balances.items()):
    print(f"  {t}: {b:,.2f}")

total_assets = type_balances.get('assets', 0)
total_liabilities = type_balances.get('liabilities', 0)
total_equity = type_balances.get('equity', 0)
print(f"\n4b. Accounting equation check:")
print(f"  Assets: {total_assets:,.2f}")
print(f"  Liabilities: {total_liabilities:,.2f}")
print(f"  Equity: {total_equity:,.2f}")
print(f"  L+E = {total_liabilities + total_equity:,.2f}")
diff = abs(total_assets - (total_liabilities + total_equity))
print(f"  Difference (Assets - (Liabilities+Equity)): {diff:,.2f}")
if diff > 0.01:
    print("  WARNING: Accounting equation not balanced!")
else:
    print("  PASS: Accounting equation balances.")
