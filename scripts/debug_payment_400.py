#!/usr/bin/env python3
"""Debug: investigate 400 error on payment JE creation."""
import json, requests, uuid
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

# Get one of the failed payments
r = requests.get(
    f'{BASE_URL}/rest/v1/payments?select=id,payment_number,amount,payment_status,payment_date,company_id'
    f'&company_id=eq.{CID}&payment_status=eq.completed&limit=5',
    headers=HEADERS)
payments = r.json()
print(f"Found {len(payments)} payments")
for p in payments[:3]:
    print(f"  {p.get('payment_number')}: amount={p.get('amount')} date={p.get('payment_date')}")

# Try to create a JE for the first one
if payments:
    p = payments[0]
    je_num = f"JE-PAY-DEBUG-{uuid.uuid4().hex[:8]}"
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
    print(f"\nTrying to insert JE: {json.dumps(je_data, indent=2)}")
    r2 = requests.post(f'{BASE_URL}/rest/v1/journal_entries',
        data=json.dumps(je_data).encode('utf-8'), headers=HEADERS)
    print(f"Status: {r2.status_code}")
    print(f"Response: {r2.text[:500]}")

    if r2.status_code == 201:
        je_id = r2.json()[0]['id']
        print(f"JE created: {je_id}")

        # Now try inserting lines
        # First get valid account IDs
        r3 = requests.get(
            f'{BASE_URL}/rest/v1/chart_of_accounts?select=id,account_code,account_type'
            f'&company_id=eq.{CID}&is_header=eq.false&limit=5',
            headers=HEADERS)
        accounts = r3.json()
        print(f"Sample accounts: {accounts[:3]}")

        if accounts:
            cash_acct = next((a['id'] for a in accounts if a['account_type'] == 'assets'), accounts[0]['id'])
            ar_acct = next((a['id'] for a in accounts if a['account_type'] == 'assets'), accounts[0]['id'])

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
            print(f"\nTrying to insert lines: {json.dumps(line_data, indent=2)}")
            r4 = requests.post(f'{BASE_URL}/rest/v1/journal_entry_lines',
                data=json.dumps(line_data).encode('utf-8'), headers=HEADERS)
            print(f"Lines status: {r4.status_code}")
            print(f"Lines response: {r4.text[:500]}")

        # Clean up - delete the test JE
        r5 = requests.delete(f'{BASE_URL}/rest/v1/journal_entries?id=eq.{je_id}', headers=HEADERS)
        print(f"\nCleanup: {r5.status_code}")