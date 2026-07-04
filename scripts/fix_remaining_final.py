#!/usr/bin/env python3
"""Fix remaining: post drafts, link payments, fix closing entry, verify."""
import json, uuid, time, requests
from dotenv import dotenv_values
from collections import defaultdict

vals = dotenv_values('C:/Users/khamis/Documents/fleetifyapp/.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
API_KEY = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()
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
            break
        rows = r.json()
        all_rows.extend(rows)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        time.sleep(0.05)
    return all_rows

# 1. Get account IDs
print("=== Get account mappings ===")
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
equity_accounts = [a for a in all_accounts if a['account_type'] == 'equity']

ar_account = type_to_account.get('RECEIVABLES') or type_to_account.get('ACCOUNTS_RECEIVABLE')
if not ar_account:
    ar_account = next((a['id'] for a in asset_accounts if '1200' in a.get('account_code', '')), None)
if not ar_account and asset_accounts:
    ar_account = asset_accounts[0]['id']

rev_account = type_to_account.get('RENTAL_REVENUE') or type_to_account.get('REVENUE') or type_to_account.get('SALES_REVENUE')
if not rev_account:
    rev_account = next((a['id'] for a in revenue_accounts if '4110' in a.get('account_code', '')), None)
if not rev_account and revenue_accounts:
    rev_account = revenue_accounts[0]['id']

cash_account = type_to_account.get('CASH') or type_to_account.get('BANK')
if not cash_account:
    cash_account = next((a['id'] for a in asset_accounts if '1010' in a.get('account_code', '')), None)
if not cash_account and asset_accounts:
    cash_account = asset_accounts[0]['id']

equity_account = next((a['id'] for a in equity_accounts if '3110' in a.get('account_code', '')), None)
if not equity_account and equity_accounts:
    equity_account = equity_accounts[0]['id']

print(f"AR: {ar_account[:8] if ar_account else 'NOT FOUND'}")
print(f"Revenue: {rev_account[:8] if rev_account else 'NOT FOUND'}")
print(f"Cash: {cash_account[:8] if cash_account else 'NOT FOUND'}")
print(f"Equity: {equity_account[:8] if equity_account else 'NOT FOUND'}")

# 2. Post draft entries
print("\n=== Post draft entries ===")
drafts = rest_get_all('journal_entries', 'id,entry_number,status,total_debit,total_credit',
    f'company_id=eq.{CID}&status=eq.draft&limit=100')
print(f"Found {len(drafts)} draft entries")

lines = rest_get_all('journal_entry_lines', 'journal_entry_id,debit_amount,credit_amount', f'limit=10000')
linked_ids = set(l['journal_entry_id'] for l in lines)
entry_totals = defaultdict(lambda: {'debit': 0, 'credit': 0})
for l in lines:
    eid = l['journal_entry_id']
    entry_totals[eid]['debit'] += float(l.get('debit_amount') or 0)
    entry_totals[eid]['credit'] += float(l.get('credit_amount') or 0)

posted = 0
deleted = 0
for d in drafts:
    eid = d['id']
    if eid not in linked_ids:
        url = f'{BASE_URL}/rest/v1/journal_entries?id=eq.{eid}'
        r = requests.delete(url, headers=HEADERS)
        if r.status_code in (200, 204):
            deleted += 1
            print(f"  Deleted empty draft: {d.get('entry_number', '?')}")
        else:
            print(f"  Failed to delete: {d.get('entry_number', '?')} - {r.status_code} {r.text[:100]}")
    else:
        t = entry_totals.get(eid, {'debit': 0, 'credit': 0})
        if abs(t['debit'] - t['credit']) < 0.01:
            url = f'{BASE_URL}/rest/v1/journal_entries?id=eq.{eid}'
            body = json.dumps({'status': 'posted', 'posted_at': '2026-07-01T12:00:00Z'}).encode('utf-8')
            r = requests.patch(url, data=body, headers=HEADERS)
            if r.status_code == 200:
                posted += 1
                print(f"  Posted: {d.get('entry_number', '?')}")
            else:
                print(f"  Failed to post: {d.get('entry_number', '?')} - {r.status_code} {r.text[:100]}")
        else:
            print(f"  Unbalanced draft: {d.get('entry_number', '?')} D={t['debit']} C={t['credit']}")

print(f"Posted {posted} drafts, deleted {deleted} empty drafts")

# 3. Link remaining unlinked payments
print("\n=== Link remaining unlinked payments ===")
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

    je_num = f"JE-PAY-{uuid.uuid4().hex[:12]}"
    je_data = {
        'company_id': CID,
        'entry_number': je_num,
        'entry_date': p.get('payment_date') or '2026-07-01',
        'description': f'Auto-linked payment {p.get("payment_number", "?")}',
        'status': 'draft',
        'total_debit': amt,
        'total_credit': amt,
        'reference_type': 'payment',
        'reference_id': p['id'],
    }
    r = requests.post(f'{BASE_URL}/rest/v1/journal_entries',
        data=json.dumps(je_data).encode('utf-8'), headers=HEADERS)
    if r.status_code != 201:
        print(f"  Failed to create JE for {p.get('payment_number', '?')}: {r.status_code} {r.text[:150]}")
        continue
    je_id = r.json()[0]['id']

    line_data = [
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
    r2 = requests.post(f'{BASE_URL}/rest/v1/journal_entry_lines',
        data=json.dumps(line_data).encode('utf-8'), headers=HEADERS)
    if r2.status_code != 201:
        print(f"  Failed to create lines for {p.get('payment_number', '?')}: {r2.status_code} {r2.text[:150]}")
        continue

    r3 = requests.patch(f'{BASE_URL}/rest/v1/journal_entries?id=eq.{je_id}',
        data=json.dumps({'status': 'posted', 'posted_at': '2026-07-01T12:00:00Z'}).encode('utf-8'),
        headers=HEADERS)
    if r3.status_code != 200:
        print(f"  Failed to post JE for {p.get('payment_number', '?')}: {r3.status_code}")
        continue

    r4 = requests.patch(f'{BASE_URL}/rest/v1/payments?id=eq.{p["id"]}',
        data=json.dumps({'journal_entry_id': je_id}).encode('utf-8'),
        headers=HEADERS)
    if r4.status_code == 200:
        pay_linked += 1
    else:
        print(f"  Failed to link payment {p.get('payment_number', '?')}: {r4.status_code}")

print(f"  Linked {pay_linked} payments")

# 4. Fix closing entry
print("\n=== Fix closing entry ===")
existing_closing = rest_get_all('journal_entries', 'id,entry_number,status,total_debit,total_credit',
    f'company_id=eq.{CID}&entry_number=like.JE-CLOSE-*&limit=10')
print(f"  Existing closing entries: {len(existing_closing)}")
for ce in existing_closing:
    ce_lines = rest_get_all('journal_entry_lines', 'journal_entry_id,debit_amount,credit_amount',
        f'journal_entry_id=eq.{ce["id"]}&limit=20')
    total_d = sum(float(l.get('debit_amount') or 0) for l in ce_lines)
    total_c = sum(float(l.get('credit_amount') or 0) for l in ce_lines)
    print(f"    {ce['entry_number']}: status={ce['status']} D={ce['total_debit']} C={ce['total_credit']} | lines={len(ce_lines)} lines_D={total_d:,.2f} lines_C={total_c:,.2f}")

# 5. Final verification
print("\n=== FINAL VERIFICATION ===")
coa = rest_get_all('chart_of_accounts', 'account_type,current_balance',
    f'company_id=eq.{CID}&limit=500')
tb = {}
for a in coa:
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

# Re-check all 5 original issues
print("\n=== Original 5 Issues Check ===")
entries = rest_get_all('journal_entries', 'id,status,entry_number',
    f'company_id=eq.{CID}&limit=5000')
lines2 = rest_get_all('journal_entry_lines', 'journal_entry_id,debit_amount,credit_amount',
    f'limit=10000')
linked_ids2 = set(l['journal_entry_id'] for l in lines2)
empty = [e for e in entries if e['id'] not in linked_ids2]
print(f"  1. Empty entries: {len(empty)}")

entry_totals2 = defaultdict(lambda: {'debit': 0, 'credit': 0})
for l in lines2:
    eid = l['journal_entry_id']
    entry_totals2[eid]['debit'] += float(l.get('debit_amount') or 0)
    entry_totals2[eid]['credit'] += float(l.get('credit_amount') or 0)
zero_ids = [eid for eid, t in entry_totals2.items() if t['debit'] == 0 and t['credit'] == 0]
print(f"  2. Zero-amount entries: {len(zero_ids)}")

drafts2 = [e for e in entries if e.get('status') == 'draft']
print(f"  3. Draft entries: {len(drafts2)}")

pay2 = rest_get_all('payments', 'id,journal_entry_id,payment_status',
    f'company_id=eq.{CID}&limit=5000')
unlinked_pay2 = [p for p in pay2 if not p.get('journal_entry_id') and p.get('payment_status') == 'completed']
print(f"  4. Completed payments without JE: {len(unlinked_pay2)}")

inv2 = rest_get_all('invoices', 'id,journal_entry_id,total_amount',
    f'company_id=eq.{CID}&limit=5000')
unlinked_inv2 = [i for i in inv2 if not i.get('journal_entry_id') and float(i.get('total_amount') or 0) > 0]
print(f"  5. Non-zero invoices without JE: {len(unlinked_inv2)}")

print("\n=== SUMMARY ===")
print(f"  Original -> Now")
print(f"  7 empty entries       -> {len(empty)}")
print(f"  38 zero-amount        -> {len(zero_ids)}")
print(f"  352 drafts            -> {len(drafts2)}")
print(f"  59 unlinked payments  -> {len(unlinked_pay2)}")
print(f"  281 unlinked invoices -> {len(unlinked_inv2)}")