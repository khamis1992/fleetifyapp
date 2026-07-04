#!/usr/bin/env python3
"""Debug payment linking 400 error."""
import json, requests, uuid
from dotenv import dotenv_values

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
API_KEY = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()
HEADERS = {
    'apikey': API_KEY,
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
CID = '24bc0b21-4e2d-4413-9842-31719a3669f4'

# Get unlinked completed payments
r = requests.get(
    f'{BASE_URL}/rest/v1/payments?select=id,payment_number,amount,payment_status,payment_date,journal_entry_id'
    f'&company_id=eq.{CID}&payment_status=eq.completed&limit=2000',
    headers=HEADERS)
payments = r.json()
unlinked = [p for p in payments if not p.get('journal_entry_id')]
print(f"Total completed: {len(payments)}")
print(f"Unlinked: {len(unlinked)}")

if not unlinked:
    print("No unlinked payments found!")
    exit()

p = unlinked[0]
print(f"\nFirst unlinked: {json.dumps(p, indent=2)}")

# Get accounts
r2 = requests.get(
    f'{BASE_URL}/rest/v1/chart_of_accounts?select=id,account_code,account_name,account_type'
    f'&company_id=eq.{CID}&is_header=eq.false&account_type=eq.assets&limit=500',
    headers=HEADERS)
accounts = r2.json()
cash_acct = next((a['id'] for a in accounts if '1010' in a.get('account_code', '') or 'نقد' in a.get('account_name', '').lower() or 'بنك' in a.get('account_name', '').lower()), None)
ar_acct = next((a['id'] for a in accounts if '1200' in a.get('account_code', '') or 'ذمم' in a.get('account_name', '').lower()), None)
if not cash_acct and accounts:
    cash_acct = accounts[0]['id']
if not ar_acct and accounts:
    ar_acct = accounts[0]['id']
print(f"cash_acct: {cash_acct}")
print(f"ar_acct: {ar_acct}")

# Create JE
je_num = f"JE-PAY-{uuid.uuid4().hex[:12]}"
je_data = {
    'company_id': CID,
    'entry_number': je_num,
    'entry_date': p.get('payment_date') or '2026-07-01',
    'description': f"Auto-linked payment {p.get('payment_number', '?')}",
    'status': 'draft',
    'total_debit': float(p['amount']),
    'total_credit': float(p['amount']),
    'reference_type': 'payment',
    'reference_id': p['id'],
}
r3 = requests.post(f'{BASE_URL}/rest/v1/journal_entries',
    data=json.dumps(je_data).encode('utf-8'), headers=HEADERS)
print(f"\nJE insert: {r3.status_code}")
if r3.status_code == 201:
    je_id = r3.json()[0]['id']
    print(f"JE ID: {je_id}")

    line_data = [
        {
            'journal_entry_id': je_id,
            'account_id': cash_acct,
            'debit_amount': float(p['amount']),
            'credit_amount': 0,
            'line_number': 1,
            'line_description': f'Cash receipt - {p.get("payment_number", "?")}',
        },
        {
            'journal_entry_id': je_id,
            'account_id': ar_acct,
            'debit_amount': 0,
            'credit_amount': float(p['amount']),
            'line_number': 2,
            'line_description': f'AR settlement - {p.get("payment_number", "?")}',
        },
    ]
    r4 = requests.post(f'{BASE_URL}/rest/v1/journal_entry_lines',
        data=json.dumps(line_data).encode('utf-8'), headers=HEADERS)
    print(f"Lines insert: {r4.status_code}")
    if r4.status_code != 201:
        print(f"Lines error: {r4.text[:500]}")
    else:
        r5 = requests.patch(f'{BASE_URL}/rest/v1/journal_entries?id=eq.{je_id}',
            data=json.dumps({'status': 'posted', 'posted_at': '2026-07-01T12:00:00Z'}).encode('utf-8'),
            headers=HEADERS)
        print(f"Post JE: {r5.status_code}")
        if r5.status_code != 200:
            print(f"Post error: {r5.text[:500]}")

        r6 = requests.patch(f'{BASE_URL}/rest/v1/payments?id=eq.{p["id"]}',
            data=json.dumps({'journal_entry_id': je_id}).encode('utf-8'),
            headers=HEADERS)
        print(f"Link payment: {r6.status_code}")
        if r6.status_code != 200:
            print(f"Link error: {r6.text[:500]}")
        else:
            print("SUCCESS! Payment linked.")
else:
    print(f"JE error: {r3.text[:500]}")