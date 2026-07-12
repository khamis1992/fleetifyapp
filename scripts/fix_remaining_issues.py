#!/usr/bin/env python3
"""Fix remaining issues: 7 JEs without lines, and check unlinked payments/invoices."""
import json, os, urllib.request

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
CID = "24bc0b21-4e2d-4413-9842-31719a3669f4"

def supabase_rpc(name, payload=None):
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

def fetch(url_path):
    req = urllib.request.Request(f"{BASE}/{url_path}", headers={
        'apikey': SRK, 'Authorization': f'Bearer {SRK}',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# Issue 1: The 7 JEs without lines — 3 posted (JE-PAY-REC-26-*) + 4 draft (JE-202508-*)
# These posted JEs without lines are problematic. Let's reverse them.
print("=== ISSUE 1: JEs without lines ===")
# Fetch the 3 posted JEs without lines
posted_no_lines = fetch(
    "journal_entries?select=id,entry_number,total_debit,total_credit,status,reference_type,reference_id"
    f"&company_id=eq.{CID}&status=eq.posted&entry_number=in.(JE-PAY-REC-26-1022,JE-PAY-REC-26-1023,JE-PAY-REC-26-1024,JE-PAY-REC-26-1025)")
print(f"  Posted JEs without lines: {len(posted_no_lines)}")
for je in posted_no_lines:
    print(f"    {je['entry_number']}: D={je['total_debit']} C={je['total_credit']} ref_type={je.get('reference_type')}")
    # Reverse these using the reverse_journal_entry RPC
    result = supabase_rpc('reverse_journal_entry', {
        'p_entry_id': je['id'],
        'p_reason': 'Auto-reversal: JE has no detail lines (CFO audit fix)',
    })
    print(f"    Reversal result: {result}")

# Issue 2: Check unlinked payments count (re-verify with company filter)
print(f"\n=== ISSUE 2: Unlinked payments ===")
payments = fetch(
    f"payments?select=id,payment_number,amount,payment_status,payment_date,journal_entry_id"
    f"&company_id=eq.{CID}&limit=1000")
unlinked_pay = [p for p in payments if not p.get('journal_entry_id')]
linked_pay = [p for p in payments if p.get('journal_entry_id')]
print(f"  Total payments: {len(payments)}")
print(f"  Linked to JE: {len(linked_pay)}")
print(f"  NOT linked: {len(unlinked_pay)}")
# Show some unlinked
for p in unlinked_pay[:5]:
    print(f"    {p.get('payment_number','?')}: amount={p.get('amount')} status={p.get('payment_status')} date={p.get('payment_date')}")

# Issue 3: Check unlinked invoices
print(f"\n=== ISSUE 3: Unlinked invoices ===")
invoices = fetch(
    f"invoices?select=id,invoice_number,total_amount,payment_status,status,journal_entry_id"
    f"&company_id=eq.{CID}&limit=1000")
unlinked_inv = [i for i in invoices if not i.get('journal_entry_id')]
linked_inv = [i for i in invoices if i.get('journal_entry_id')]
print(f"  Total invoices: {len(invoices)}")
print(f"  Linked to JE: {len(linked_inv)}")
print(f"  NOT linked: {len(unlinked_inv)}")
# Show some unlinked with non-zero amounts
non_zero_unlinked = [i for i in unlinked_inv if float(i.get('total_amount') or 0) > 0]
print(f"  NOT linked with non-zero amount: {len(non_zero_unlinked)}")
for i in non_zero_unlinked[:5]:
    print(f"    {i.get('invoice_number','?')}: total={i.get('total_amount')} status={i.get('payment_status')}")

# Issue 4: Zero-amount JEs
print(f"\n=== ISSUE 4: Zero-amount JEs ===")
zero_jes = fetch(
    f"journal_entries?select=id,entry_number,status,reference_type"
    f"&company_id=eq.{CID}&total_debit=eq.0&total_credit=eq.0&limit=50")
print(f"  Zero-amount JEs: {len(zero_jes)}")
for je in zero_jes[:5]:
    print(f"    {je['entry_number']}: status={je['status']} ref_type={je.get('reference_type')}")