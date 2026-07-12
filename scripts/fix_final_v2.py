#!/usr/bin/env python3
"""Final fix: Link remaining unlinked payments & invoices to journal entries.
Uses UUID-based entry_numbers to avoid duplicate key 409 errors.
Also creates a closing entry to zero out Revenue into Equity (Retained Earnings).
"""
import json, os, urllib.request, uuid, time
from dotenv import dotenv_values

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
API_KEY = vals.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
HEADERS = {
    'apikey': API_KEY,
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
CID = '24bc0b21-4e2d-4413-9842-31719a3669f4'
PAGE_SIZE = 1000


def rest_get_all(table, select, filters=''):
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


import requests


def insert(table, data):
    url = f'{BASE_URL}/rest/v1/{table}'
    body = json.dumps(data).encode('utf-8')
    r = requests.post(url, data=body, headers=HEADERS)
    if r.status_code == 201:
        return r.json()
    else:
        return None


def update(table, data, filter_str):
    url = f'{BASE_URL}/rest/v1/{table}?{filter_str}'
    body = json.dumps(data).encode('utf-8')
    r = requests.patch(url, data=body, headers=HEADERS)
    if r.status_code == 200:
        return r.json()
    return None


def rpc(name, payload=None):
    url = f'{BASE_URL}/rpc/{name}'
    body = json.dumps(payload or {}).encode('utf-8')
    r = requests.post(url, data=body, headers=HEADERS)
    if r.status_code == 200:
        result = r.text
        return json.loads(result) if result else None
    return f"Error {r.status_code}: {r.text[:200]}"


# ============================================================
# Step 1: Get account mappings
# ============================================================
print("=== Step 1: Get account mappings ===")
mappings = rest_get_all('account_mappings', 'default_account_type_id,chart_of_accounts_id',
                        f'company_id=eq.{CID}&is_active=eq.true&limit=50')
default_types = rest_get_all('default_account_types', 'id,type_code', 'limit=50')
type_to_account = {}
for m in mappings:
    dt = next((d for d in default_types if d['id'] == m['default_account_type_id']), None)
    if dt:
        type_to_account[dt['type_code']] = m['chart_of_accounts_id']

all_accounts = rest_get_all('chart_of_accounts', 'id,account_code,account_name,account_type',
                            f'company_id=eq.{CID}&is_header=eq.false&limit=500')
asset_accounts = [a for a in all_accounts if a['account_type'] == 'assets']
revenue_accounts = [a for a in all_accounts if a['account_type'] == 'revenue']
liability_accounts = [a for a in all_accounts if a['account_type'] == 'liabilities']
equity_accounts = [a for a in all_accounts if a['account_type'] == 'equity']

ar_account = type_to_account.get('RECEIVABLES') or type_to_account.get('ACCOUNTS_RECEIVABLE')
if not ar_account:
    ar_account = next((a['id'] for a in asset_accounts if '1200' in a.get('account_code', '') or 'ذمم' in a.get('account_name', '').lower()), None)
if not ar_account and asset_accounts:
    ar_account = asset_accounts[0]['id']

rev_account = type_to_account.get('RENTAL_REVENUE') or type_to_account.get('REVENUE') or type_to_account.get('SALES_REVENUE')
if not rev_account:
    rev_account = next((a['id'] for a in revenue_accounts if '4110' in a.get('account_code', '') or 'إيراد' in a.get('account_name', '')), None)
if not rev_account and revenue_accounts:
    rev_account = revenue_accounts[0]['id']

cash_account = type_to_account.get('CASH') or type_to_account.get('BANK')
if not cash_account:
    cash_account = next((a['id'] for a in asset_accounts if '1010' in a.get('account_code', '') or 'نقد' in a.get('account_name', '').lower() or 'بنك' in a.get('account_name', '').lower()), None)
if not cash_account and asset_accounts:
    cash_account = asset_accounts[0]['id']

# Equity account (retained earnings)
equity_account = next((a['id'] for a in equity_accounts if '3110' in a.get('account_code', '') or 'احتياطي' in a.get('account_name', '').lower() or 'حق' in a.get('account_name', '').lower()), None)
if not equity_account and equity_accounts:
    equity_account = equity_accounts[0]['id']

print(f"  AR account:       {ar_account[:8] if ar_account else 'NOT FOUND'}...")
print(f"  Revenue account:  {rev_account[:8] if rev_account else 'NOT FOUND'}...")
print(f"  Cash account:     {cash_account[:8] if cash_account else 'NOT FOUND'}...")
print(f"  Equity account:   {equity_account[:8] if equity_account else 'NOT FOUND'}...")

# ============================================================
# Step 2: Link unlinked COMPLETED payments to JEs
# ============================================================
print("\n=== Step 2: Link unlinked completed payments ===")
payments = rest_get_all('payments',
    'id,payment_number,amount,payment_status,payment_date,journal_entry_id',
    f'company_id=eq.{CID}&limit=5000')

unlinked_pay = [p for p in payments if not p.get('journal_entry_id') and p.get('payment_status') == 'completed']
print(f"  {len(unlinked_pay)} completed payments without JE link")

pay_linked = 0
for p in unlinked_pay:
    amt = float(p['amount'])
    if amt <= 0:
        continue

    # Use UUID to guarantee unique entry_number
    je_num = f"JE-PAY-{uuid.uuid4().hex[:12]}"
    je_data = {
        'company_id': CID,
        'entry_number': je_num,
        'entry_date': p['payment_date'],
        'description': f'Auto-linked payment {p.get("payment_number", "?")}',
        'status': 'draft',
        'total_debit': amt,
        'total_credit': amt,
        'reference_type': 'payment',
        'reference_id': p['id'],
    }
    je_res = insert('journal_entries', je_data)
    if not je_res:
        continue

    je_id = je_res[0]['id']
    lines = [
        {
            'journal_entry_id': je_id,
            'account_id': cash_account,
            'debit_amount': amt,
            'credit_amount': 0,
            'line_number': 1,
            'line_description': f'Cash receipt - {p.get("payment_number", "?")}',
        },
        {
            'journal_entry_id': je_id,
            'account_id': ar_account,
            'debit_amount': 0,
            'credit_amount': amt,
            'line_number': 2,
            'line_description': f'AR settlement - {p.get("payment_number", "?")}',
        },
    ]
    line_res = insert('journal_entry_lines', lines)
    if line_res and len(line_res) == 2:
        post_res = update('journal_entries',
            {'status': 'posted', 'posted_at': (p['payment_date'] or '2026-07-01') + 'T12:00:00Z'},
            f'id=eq.{je_id}')
        if post_res:
            update('payments', {'journal_entry_id': je_id}, f'id=eq.{p["id"]}')
            pay_linked += 1

print(f"  ✅ Linked {pay_linked} payments to new JEs")

# ============================================================
# Step 3: Link unlinked invoices (non-zero) to JEs
# ============================================================
print("\n=== Step 3: Link unlinked invoices ===")
invoices = rest_get_all('invoices',
    'id,invoice_number,total_amount,invoice_date,journal_entry_id',
    f'company_id=eq.{CID}&limit=5000')

unlinked_inv = [i for i in invoices if not i.get('journal_entry_id') and float(i.get('total_amount') or 0) > 0]
print(f"  {len(unlinked_inv)} non-zero invoices without JE link")

inv_linked = 0
for inv in unlinked_inv:
    amt = float(inv['total_amount'])
    if amt <= 0:
        continue

    je_num = f"JE-INV-{uuid.uuid4().hex[:12]}"
    je_data = {
        'company_id': CID,
        'entry_number': je_num,
        'entry_date': inv.get('invoice_date') or '2026-07-01',
        'description': f'Auto-linked invoice {inv.get("invoice_number", "?")}',
        'status': 'draft',
        'total_debit': amt,
        'total_credit': amt,
        'reference_type': 'invoice',
        'reference_id': inv['id'],
    }
    je_res = insert('journal_entries', je_data)
    if not je_res:
        continue

    je_id = je_res[0]['id']
    lines = [
        {
            'journal_entry_id': je_id,
            'account_id': ar_account,
            'debit_amount': amt,
            'credit_amount': 0,
            'line_number': 1,
            'line_description': f'AR - Invoice {inv.get("invoice_number", "?")}',
        },
        {
            'journal_entry_id': je_id,
            'account_id': rev_account,
            'debit_amount': 0,
            'credit_amount': amt,
            'line_number': 2,
            'line_description': f'Revenue - Invoice {inv.get("invoice_number", "?")}',
        },
    ]
    line_res = insert('journal_entry_lines', lines)
    if line_res and len(line_res) == 2:
        post_res = update('journal_entries',
            {'status': 'posted', 'posted_at': (inv.get('invoice_date') or '2026-07-01') + 'T12:00:00Z'},
            f'id=eq.{je_id}')
        if post_res:
            update('invoices', {'journal_entry_id': je_id}, f'id=eq.{inv["id"]}')
            inv_linked += 1

print(f"  ✅ Linked {inv_linked} invoices to new JEs")

# ============================================================
# Step 4: Update account balances
# ============================================================
print("\n=== Step 4: Update account balances ===")
rpc_result = rpc('update_account_balances_from_entries')
print(f"  RPC result: {rpc_result or 'OK'}")

# ============================================================
# Step 5: Create closing entry (Revenue → Equity/Retained Earnings)
# ============================================================
print("\n=== Step 5: Create closing entry ===")
coa = rest_get_all('chart_of_accounts', 'id,account_type,current_balance',
                   f'company_id=eq.{CID}&limit=500')
total_revenue = sum(float(a.get('current_balance') or 0) for a in coa if a['account_type'] == 'revenue')
total_expenses = sum(float(a.get('current_balance') or 0) for a in coa if a['account_type'] == 'expenses')
net_income = total_revenue - total_expenses
print(f"  Total Revenue:  {total_revenue:,.2f}")
print(f"  Total Expenses: {total_expenses:,.2f}")
print(f"  Net Income:     {net_income:,.2f}")

if abs(net_income) > 0.01:
    # Check if closing entry already exists
    existing_closing = rest_get_all('journal_entries', 'id,entry_number',
        f'company_id=eq.{CID}&entry_number=like.JE-CLOSE-*&limit=10')
    if existing_closing:
        print(f"  Closing entry already exists ({len(existing_closing)} found). Skipping.")
    else:
        # Create closing entry: debit Revenue, credit Retained Earnings
        je_num = f"JE-CLOSE-{uuid.uuid4().hex[:8]}"
        je_data = {
            'company_id': CID,
            'entry_number': je_num,
            'entry_date': '2026-07-01',
            'description': 'Closing entry: Transfer net income to Retained Earnings',
            'status': 'draft',
            'total_debit': net_income,
            'total_credit': net_income,
            'reference_type': 'closing',
        }
        je_res = insert('journal_entries', je_data)
        if je_res:
            je_id = je_res[0]['id']
            lines = []
            line_num = 1
            # Debit each revenue account to zero it out
            for a in coa:
                if a['account_type'] == 'revenue':
                    bal = float(a.get('current_balance') or 0)
                    if abs(bal) > 0.01:
                        lines.append({
                            'journal_entry_id': je_id,
                            'account_id': a['id'],
                            'debit_amount': bal,
                            'credit_amount': 0,
                            'line_number': line_num,
                            'line_description': f'Closing revenue account {a.get("account_code", "")}',
                        })
                        line_num += 1
            # Credit equity (retained earnings) with net income
            if equity_account:
                lines.append({
                    'journal_entry_id': je_id,
                    'account_id': equity_account,
                    'debit_amount': 0,
                    'credit_amount': net_income,
                    'line_number': line_num,
                    'line_description': 'Retained earnings - net income closing',
                })
            # Insert lines
            line_res = insert('journal_entry_lines', lines)
            if line_res:
                # Post the closing entry
                update('journal_entries',
                    {'status': 'posted', 'posted_at': '2026-07-01T12:00:00Z'},
                    f'id=eq.{je_id}')
                print(f"  ✅ Closing entry created: {je_num} ({len(lines)} lines, {net_income:,.2f} QAR)")
            else:
                print(f"  ⚠️ Failed to insert closing entry lines")
        else:
            print(f"  ⚠️ Failed to create closing entry")
else:
    print("  No net income to close. Skipping.")

# Re-update balances after closing
rpc_result = rpc('update_account_balances_from_entries')
print(f"  Balance update: {rpc_result or 'OK'}")

# ============================================================
# FINAL VERIFICATION
# ============================================================
print("\n=== FINAL VERIFICATION ===")
coa2 = rest_get_all('chart_of_accounts', 'account_type,current_balance',
                    f'company_id=eq.{CID}&limit=500')
tb = {}
for a in coa2:
    at = a.get('account_type', '?')
    tb[at] = tb.get(at, 0) + float(a.get('current_balance') or 0)

ta = tb.get('assets', 0)
tl = tb.get('liabilities', 0)
te = tb.get('equity', 0)
tr = tb.get('revenue', 0)
tex = tb.get('expenses', 0)
print(f"  Assets:      {ta:>15,.2f}")
print(f"  Liabilities: {tl:>15,.2f}")
print(f"  Equity:      {te:>15,.2f}")
print(f"  Revenue:     {tr:>15,.2f}")
print(f"  Expenses:    {tex:>15,.2f}")
print(f"  A = {ta:,.2f}")
print(f"  L+E = {tl+te:,.2f}")
diff = abs(ta - (tl + te))
print(f"  Diff: {diff:,.2f}")
print(f"  {'PASS: A=L+E' if diff < 0.01 else f'FAIL: off by {diff:,.2f}'}")

# Re-check linkage counts
print("\n=== Post-fix linkage check ===")
pay2 = rest_get_all('payments', 'id,journal_entry_id,payment_status',
    f'company_id=eq.{CID}&limit=5000')
unlinked_pay2 = [p for p in pay2 if not p.get('journal_entry_id') and p.get('payment_status') == 'completed']
print(f"  Completed payments without JE: {len(unlinked_pay2)}")

inv2 = rest_get_all('invoices', 'id,journal_entry_id,total_amount',
    f'company_id=eq.{CID}&limit=5000')
unlinked_inv2 = [i for i in inv2 if not i.get('journal_entry_id') and float(i.get('total_amount') or 0) > 0]
print(f"  Non-zero invoices without JE: {len(unlinked_inv2)}")

# Check for empty/zero-amount/draft entries
entries = rest_get_all('journal_entries', 'id,status,total_debit,total_credit',
    f'company_id=eq.{CID}&limit=5000')
lines = rest_get_all('journal_entry_lines', 'journal_entry_id,debit_amount,credit_amount',
    f'limit=10000')
linked_ids = set(l['journal_entry_id'] for l in lines)
empty = [e for e in entries if e['id'] not in linked_ids]
drafts = [e for e in entries if e.get('status') == 'draft']
print(f"  Empty entries: {len(empty)}")
print(f"  Draft entries: {len(drafts)}")

from collections import defaultdict
entry_totals = defaultdict(lambda: {'debit': 0, 'credit': 0})
for l in lines:
    eid = l['journal_entry_id']
    entry_totals[eid]['debit'] += float(l.get('debit_amount') or 0)
    entry_totals[eid]['credit'] += float(l.get('credit_amount') or 0)
zero_ids = [eid for eid, t in entry_totals.items() if t['debit'] == 0 and t['credit'] == 0]
print(f"  Zero-amount entries: {len(zero_ids)}")

# Check unlinked invoices (no contract_id)
inv_contract = rest_get_all('invoices', 'id,contract_id',
    f'company_id=eq.{CID}&limit=5000')
no_contract = [i for i in inv_contract if not i.get('contract_id')]
print(f"  Invoices without contract: {len(no_contract)}")

# Check unlinked payments (no invoice_id)
pay_inv = rest_get_all('payments', 'id,invoice_id',
    f'company_id=eq.{CID}&limit=5000')
no_invoice = [p for p in pay_inv if not p.get('invoice_id')]
print(f"  Payments without invoice: {len(no_invoice)}")