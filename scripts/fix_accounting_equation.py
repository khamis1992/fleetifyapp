#!/usr/bin/env python3
"""Fix accounting equation: run update_account_balances_from_entries RPC."""
import json, os, urllib.request

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1/rpc"
TMP = 'C:/Users/khamis/AppData/Local/Temp'
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

def rpc_call(name, payload=None):
    url = f"{BASE}/{name}"
    data = json.dumps(payload or {}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'apikey': SRK,
        'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req) as resp:
            result = resp.read().decode('utf-8')
            return json.loads(result) if result else None
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}: {e.read().decode('utf-8')}"
    except Exception as e:
        return f"Error: {e}"

# Step 1: Check current account balances
print("=== STEP 1: Current account balances ===")
coa = json.load(open(f'{TMP}/coa.json'))
type_balances = {}
for a in coa:
    at = a.get('account_type', '?')
    bal = float(a.get('current_balance') or 0)
    type_balances[at] = type_balances.get(at, 0) + bal
for t, b in sorted(type_balances.items()):
    print(f"  {t}: {b:,.2f}")
ta = type_balances.get('assets', 0)
tl = type_balances.get('liabilities', 0)
te = type_balances.get('equity', 0)
print(f"  A={ta:,.2f} L={tl:,.2f} E={te:,.2f} L+E={tl+te:,.2f}")
print(f"  Diff: {abs(ta-(tl+te)):,.2f}")

# Step 2: Run update_account_balances_from_entries RPC
print("\n=== STEP 2: Run update_account_balances_from_entries ===")
result = rpc_call('update_account_balances_from_entries')
print(f"  Result: {result}")

# Step 3: Re-fetch account balances and check
print("\n=== STEP 3: Re-fetch account balances ===")
url = f"https://qwhunliohlkkahbspfiu.supabase.co/rest/v1/chart_of_accounts?select=account_code,account_name,account_type,current_balance&company_id=eq.{CID}&limit=500"
req = urllib.request.Request(url, headers={
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
})
with urllib.request.urlopen(req) as resp:
    coa2 = json.loads(resp.read())

type_balances2 = {}
for a in coa2:
    at = a.get('account_type', '?')
    bal = float(a.get('current_balance') or 0)
    type_balances2[at] = type_balances2.get(at, 0) + bal
for t, b in sorted(type_balances2.items()):
    print(f"  {t}: {b:,.2f}")
ta2 = type_balances2.get('assets', 0)
tl2 = type_balances2.get('liabilities', 0)
te2 = type_balances2.get('equity', 0)
print(f"  A={ta2:,.2f} L={tl2:,.2f} E={te2:,.2f} L+E={tl2+te2:,.2f}")
print(f"  Diff: {abs(ta2-(tl2+te2)):,.2f}")

# Show accounts with non-zero balances
print("\n=== Accounts with non-zero balances after update ===")
for a in coa2:
    bal = float(a.get('current_balance') or 0)
    if abs(bal) > 0.01:
        print(f"  {a['account_code']} {a['account_name']}: {bal:,.2f} ({a['account_type']})")