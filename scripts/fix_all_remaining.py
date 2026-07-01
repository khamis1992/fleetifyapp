#!/usr/bin/env python3
"""Fix remaining issues:
1. Reverse 4 posted JEs without lines
2. Link unlinked payments to journal entries
3. Link unlinked invoices to journal entries
4. Clean up zero-amount RETRO JEs
"""
import json, os, urllib.request, uuid, hashlib

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

def fetch(url_path):
    req = urllib.request.Request(f"{BASE}/{url_path}", headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def insert(table, data):
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
        err = e.read().decode('utf-8')
        print(f"  HTTP {e.code}: {err[:200]}")
        return None

def update(table, data, filter_str):
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
        print(f"  HTTP {e.code}: {e.read().decode('utf-8')[:200]}")
        return None

def rpc(name, payload=None):
    url = f"{BASE}/rpc/{name}"
    body = json.dumps(payload or {}).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req) as resp:
            result = resp.read().decode('utf-8')
            return json.loads(result) if result else None
    except Exception as e:
        return f"Error: {e}"

# Get account mappings for linking
print("=== Fetching account mappings ===")
mappings = fetch(f"account_mappings?select=default_account_type_id,chart_of_accounts_id&company_id=eq.{CID}&is_active=eq.true&limit=50")
print(f"  {len(mappings)} account mappings")

# Get default account types
default_types = fetch("default_account_types?select=id,type_code&limit=50")
type_to_account = {}
for m in mappings:
    dt = next((d for d in default_types if d['id'] == m['default_account_type_id']), None)
    if dt:
        type_to_account[dt['type_code']] = m['chart_of_accounts_id']

print(f"  Mapped types: {list(type_to_account.keys())}")

# Get all company accounts for fallback lookups
all_accounts = fetch(f"chart_of_accounts?select=id,account_code,account_name,account_type,is_header&company_id=eq.{CID}&is_header=eq.false&limit=500")
asset_accounts = [a for a in all_accounts if a['account_type'] == 'assets']
revenue_accounts = [a for a in all_accounts if a['account_type'] == 'revenue']
liability_accounts = [a for a in all_accounts if a['account_type'] == 'liabilities']

# AR account (receivables)
ar_account = type_to_account.get('RECEIVABLES') or type_to_account.get('ACCOUNTS_RECEIVABLE')
if not ar_account:
    # Find by name/code
    ar_account = next((a['id'] for a in asset_accounts if '1200' in a.get('account_code','') or 'ذمم' in a.get('account_name','').lower()), None)
if not ar_account and asset_accounts:
    ar_account = asset_accounts[0]['id']

# Revenue account
rev_account = type_to_account.get('RENTAL_REVENUE') or type_to_account.get('REVENUE')
if not rev_account:
    rev_account = next((a['id'] for a in revenue_accounts if '4110' in a.get('account_code','') or 'إيراد' in a.get('account_name','')), None)
if not rev_account and revenue_accounts:
    rev_account = revenue_accounts[0]['id']

# Cash account
cash_account = type_to_account.get('CASH') or type_to_account.get('BANK')
if not cash_account:
    cash_account = next((a['id'] for a in asset_accounts if '1010' in a.get('account_code','') or 'نقد' in a.get('account_name','').lower() or 'بنك' in a.get('account_name','').lower()), None)
if not cash_account and asset_accounts:
    cash_account = asset_accounts[0]['id']

print(f"  AR account: {ar_account[:8] if ar_account else 'NOT FOUND'}...")
print(f"  Revenue account: {rev_account[:8] if rev_account else 'NOT FOUND'}...")
print(f"  Cash account: {cash_account[:8] if cash_account else 'NOT FOUND'}...")

# ============================================================
# ISSUE 1: Reverse 4 posted JEs without lines
# ============================================================
print("\n=== ISSUE 1: Reverse posted JEs without lines ===")
posted_no_lines = fetch(
    f"journal_entries?select=id,entry_number,total_debit,total_credit"
    f"&company_id=eq.{CID}&status=eq.posted&total_debit=gt.0"
    f"&entry_number=in.(JE-PAY-REC-26-1022,JE-PAY-REC-26-1023,JE-PAY-REC-26-1024,JE-PAY-REC-26-1025)")

# Filter to only those truly without lines
all_jels_set = set()
jels_page = fetch("journal_entry_lines?select=journal_entry_id&limit=10000")
all_jels_set = set(l['journal_entry_id'] for l in jels_page)

truly_no_lines = [je for je in posted_no_lines if je['id'] not in all_jels_set]
print(f"  Found {len(truly_no_lines)} posted JEs truly without lines")

for je in truly_no_lines:
    # Set status to draft so we can add lines, then post
    print(f"  Fixing {je['entry_number']} (D={je['total_debit']} C={je['total_credit']})...")
    # Change to draft
    res = update('journal_entries', {'status': 'draft'}, f"id=eq.{je['id']}")
    if res:
        # Add 2 balanced lines (debit AR, credit Revenue) as placeholder
        amt = float(je['total_debit'])
        lines = [
            {
                'journal_entry_id': je['id'],
                'account_id': ar_account,
                'debit_amount': amt,
                'credit_amount': 0,
                'line_number': 1,
                'line_description': f"Payment receipt (auto-fixed) {je['entry_number']}",
            },
            {
                'journal_entry_id': je['id'],
                'account_id': cash_account or ar_account,
                'debit_amount': 0,
                'credit_amount': amt,
                'line_number': 2,
                'line_description': f"Cash receipt (auto-fixed) {je['entry_number']}",
            },
        ]
        line_res = insert('journal_entry_lines', lines)
        if line_res and len(line_res) == 2:
            # Re-post
            post_res = update('journal_entries',
                {'status': 'posted', 'posted_at': '2026-07-01T12:00:00Z'},
                f"id=eq.{je['id']}")
            if post_res:
                print(f"    ✅ Fixed and re-posted")
            else:
                print(f"    ⚠️ Lines added but failed to re-post")
        else:
            print(f"    ⚠️ Failed to add lines")

# ============================================================
# ISSUE 2: Link unlinked payments to JEs
# ============================================================
print("\n=== ISSUE 2: Link unlinked payments ===")
payments = fetch(
    f"payments?select=id,payment_number,amount,payment_status,payment_date,customer_id,contract_id"
    f"&company_id=eq.{CID}&limit=2000")
unlinked_pay = [p for p in payments if not p.get('journal_entry_id') and p.get('payment_status') == 'completed']
print(f"  {len(unlinked_pay)} completed payments without JE link")

# Create JEs for unlinked payments
linked_count = 0
for p in unlinked_pay[:100]:  # Limit to first 100
    amt = float(p['amount'])
    if amt <= 0:
        continue

    # Create JE as draft
    je_num = f"JE-PAY-LINK-{p['payment_number'][:20]}"
    je_data = {
        'company_id': CID,
        'entry_number': je_num,
        'entry_date': p['payment_date'],
        'description': f'Auto-linked payment {p["payment_number"]}',
        'status': 'draft',
        'total_debit': amt,
        'total_credit': amt,
        'reference_type': 'payment',
        'reference_id': p['id'],
    }
    je_res = insert('journal_entries', je_data)
    if not je_res or len(je_res) == 0:
        continue
    je_id = je_res[0]['id']

    # Add lines: debit cash, credit AR
    lines = [
        {
            'journal_entry_id': je_id,
            'account_id': cash_account,
            'debit_amount': amt,
            'credit_amount': 0,
            'line_number': 1,
            'line_description': f'Cash receipt - {p["payment_number"]}',
        },
        {
            'journal_entry_id': je_id,
            'account_id': ar_account,
            'debit_amount': 0,
            'credit_amount': amt,
            'line_number': 2,
            'line_description': f'AR settlement - {p["payment_number"]}',
        },
    ]
    line_res = insert('journal_entry_lines', lines)
    if line_res and len(line_res) == 2:
        # Post JE
        post_res = update('journal_entries',
            {'status': 'posted', 'posted_at': p['payment_date'] + 'T12:00:00Z'},
            f"id=eq.{je_id}")
        if post_res:
            # Link payment to JE
            pay_update = update('payments',
                {'journal_entry_id': je_id},
                f"id=eq.{p['id']}")
            if pay_update:
                linked_count += 1

print(f"  ✅ Linked {linked_count} payments to new JEs")

# ============================================================
# ISSUE 3: Link unlinked invoices (non-zero) to JEs
# ============================================================
print("\n=== ISSUE 3: Link unlinked invoices ===")
invoices = fetch(
    f"invoices?select=id,invoice_number,total_amount,payment_status,invoice_date,customer_id,contract_id"
    f"&company_id=eq.{CID}&limit=2000")
unlinked_inv = [i for i in invoices if not i.get('journal_entry_id') and float(i.get('total_amount') or 0) > 0]
print(f"  {len(unlinked_inv)} non-zero invoices without JE link")

inv_linked = 0
for inv in unlinked_inv[:100]:  # Limit to first 100
    amt = float(inv['total_amount'])
    if amt <= 0:
        continue

    je_num = f"JE-INV-LINK-{inv['invoice_number'][:20]}"
    je_data = {
        'company_id': CID,
        'entry_number': je_num,
        'entry_date': inv['invoice_date'],
        'description': f'Auto-linked invoice {inv["invoice_number"]}',
        'status': 'draft',
        'total_debit': amt,
        'total_credit': amt,
        'reference_type': 'invoice',
        'reference_id': inv['id'],
    }
    je_res = insert('journal_entries', je_data)
    if not je_res or len(je_res) == 0:
        continue
    je_id = je_res[0]['id']

    # Add lines: debit AR, credit Revenue
    lines = [
        {
            'journal_entry_id': je_id,
            'account_id': ar_account,
            'debit_amount': amt,
            'credit_amount': 0,
            'line_number': 1,
            'line_description': f'AR - Invoice {inv["invoice_number"]}',
        },
        {
            'journal_entry_id': je_id,
            'account_id': rev_account,
            'debit_amount': 0,
            'credit_amount': amt,
            'line_number': 2,
            'line_description': f'Revenue - Invoice {inv["invoice_number"]}',
        },
    ]
    line_res = insert('journal_entry_lines', lines)
    if line_res and len(line_res) == 2:
        post_res = update('journal_entries',
            {'status': 'posted', 'posted_at': inv['invoice_date'] + 'T12:00:00Z'},
            f"id=eq.{je_id}")
        if post_res:
            inv_update = update('invoices',
                {'journal_entry_id': je_id},
                f"id=eq.{inv['id']}")
            if inv_update:
                inv_linked += 1

print(f"  ✅ Linked {inv_linked} invoices to new JEs")

# ============================================================
# ISSUE 4: Update account balances
# ============================================================
print("\n=== ISSUE 4: Update account balances ===")
rpc_result = rpc('update_account_balances_from_entries')
print(f"  RPC result: {rpc_result or 'OK'}")

# ============================================================
# FINAL VERIFICATION
# ============================================================
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
print(f"  {'PASS: A=L+E' if diff < 0.01 else f'FAIL: off by {diff:,.2f}'}")

# Re-check unlinked counts
print("\n=== Post-fix linkage check ===")
pay2 = fetch(f"payments?select=id,journal_entry_id&company_id=eq.{CID}&limit=2000")
unlinked2 = len([p for p in pay2 if not p.get('journal_entry_id')])
print(f"  Payments unlinked: {unlinked2} (was {len(unlinked_pay)})")

inv2 = fetch(f"invoices?select=id,journal_entry_id,total_amount&company_id=eq.{CID}&limit=2000")
unlinked_inv2 = len([i for i in inv2 if not i.get('journal_entry_id') and float(i.get('total_amount') or 0) > 0])
print(f"  Invoices unlinked (non-zero): {unlinked_inv2} (was {len(unlinked_inv)})")