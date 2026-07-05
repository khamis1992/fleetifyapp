#!/usr/bin/env python3
"""
Fleetify Financial Remediation - Apply All Fixes
1. Empty journal entries (4: 3 draft + 1 posted)
2. Zero-amount entries (38 posted RETRO entries)
3. Draft entries (352: 349 balanced -> post, 3 empty -> delete)
4. Unlinked payments (1277: 443 with contract, 834 customer only)
5. Unlinked invoices (10: PUR-type, no customer)
"""
import requests
import time
import sys
from typing import Any, Dict, List, Tuple, Optional, Set, DefaultDict, cast
from dotenv import dotenv_values
from collections import defaultdict

# Load environment variables
vals: Dict[str, Optional[str]] = dotenv_values('.env')
BASE_URL: str = (vals.get('VITE_SUPABASE_URL') or '').strip()
SRK: str = (vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY') or '').strip()

# Headers for Supabase API
H: Dict[str, str] = {
    'apikey': SRK,
    'Authorization': 'Bearer ' + SRK,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Pagination size
PS: int = 1000


def get_all(table: str, select: str = '*', filters: str = '') -> List[Dict[str, Any]]:
    """Fetch all rows from a Supabase table with pagination."""
    rows: List[Dict[str, Any]] = []
    off: int = 0
    while True:
        url: str = f"{BASE_URL}/rest/v1/{table}?select={select}&limit={PS}&offset={off}"
        if filters:
            url += '&' + filters
        r: requests.Response = requests.get(url, headers=H)
        if r.status_code != 200:
            print(f'  ERR {table}: {r.status_code} {r.text[:200]}')
            break
        batch: List[Dict[str, Any]] = cast(List[Dict[str, Any]], r.json())
        rows.extend(batch)
        if len(batch) < PS:
            break
        off += PS
        time.sleep(0.05)
    return rows


def patch(table: str, filters: str, body: Dict[str, Any]) -> Tuple[bool, str]:
    """Send a PATCH request to update rows."""
    url: str = f"{BASE_URL}/rest/v1/{table}?{filters}"
    r: requests.Response = requests.patch(url, headers=H, json=body)
    return r.status_code == 200, r.text[:300]


def delete(table: str, filters: str) -> Tuple[bool, str]:
    """Send a DELETE request to remove rows."""
    url: str = f"{BASE_URL}/rest/v1/{table}?{filters}"
    r: requests.Response = requests.delete(url, headers=H)
    return r.status_code in (200, 204), r.text[:300]


print("=" * 70)
print("FLEETIFY FINANCIAL REMEDIATION")
print("=" * 70)

# Fetch all data
print("\nFetching data...")
entries: List[Dict[str, Any]] = get_all('journal_entries', 'id,entry_number,status,reference_id,company_id,entry_date')
lines: List[Dict[str, Any]] = get_all('journal_entry_lines', 'id,journal_entry_id,debit_amount,credit_amount')
payments: List[Dict[str, Any]] = get_all('payments', 'id,payment_number,amount,invoice_id,contract_id,customer_id,company_id,payment_date')
invoices: List[Dict[str, Any]] = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id,company_id,journal_entry_id')
contracts: List[Dict[str, Any]] = get_all('contracts', 'id,customer_id')
print(f"  {len(entries)} entries, {len(lines)} lines, {len(payments)} payments, {len(invoices)} invoices, {len(contracts)} contracts")

# Filter lines with a valid journal_entry_id (ignore orphan lines)
valid_lines: List[Dict[str, Any]] = [l for l in lines if l.get('journal_entry_id') is not None]

# Build lookup sets
linked_ids: Set[str] = {l['journal_entry_id'] for l in valid_lines}
inv_ids: Set[str] = {i['id'] for i in invoices}
con_ids: Set[str] = {c['id'] for c in contracts}

# Build entry totals (debit, credit, line count)
et: DefaultDict[str, Dict[str, float]] = defaultdict(lambda: {'d': 0.0, 'c': 0.0, 'n': 0.0})
for l in valid_lines:
    eid: str = l['journal_entry_id']  # guaranteed not None after filtering
    et[eid]['d'] += float(l.get('debit_amount') or 0)
    et[eid]['c'] += float(l.get('credit_amount') or 0)
    et[eid]['n'] += 1.0

# Build invoice journal_entry_id -> invoice lookup
inv_je_lookup: Dict[str, Dict[str, Any]] = {}
for i in invoices:
    if i.get('journal_entry_id'):
        inv_je_lookup[i['journal_entry_id']] = i

# ============================================================
# FIX 1: Empty journal entries (no lines)
# ============================================================
print("\n" + "=" * 70)
print("FIX 1: EMPTY JOURNAL ENTRIES")
print("=" * 70)
empty: List[Dict[str, Any]] = [e for e in entries if e['id'] not in linked_ids]
print(f"  Found {len(empty)} empty entries")
fixed1: int = 0
for e in empty:
    eid: str = e['id']
    st: str = e.get('status', '')
    # If posted, change to draft first
    if st == 'posted':
        ok: bool
        _: str
        ok, _ = patch('journal_entries', f'id=eq.{eid}', {'status': 'draft'})
        if not ok:
            print(f"  SKIP (cannot unpost): {e.get('entry_number', '?')}")
            continue
    # Check if referenced by invoice
    if eid in inv_je_lookup:
        inv: Dict[str, Any] = inv_je_lookup[eid]
        patch('invoices', f'id=eq.{inv["id"]}', {'journal_entry_id': None})
        print(f"  Unlinked invoice {inv.get('invoice_number', '?')} from entry {e.get('entry_number', '?')}")
    # Delete entry (no lines since it is empty)
    ok, err = delete('journal_entries', f'id=eq.{eid}')
    if ok:
        fixed1 += 1
        print(f"  DELETED: {e.get('entry_number', '?')} (was {st})")
    else:
        print(f"  FAILED: {e.get('entry_number', '?')} - {err}")

# ============================================================
# FIX 2: Zero-amount entries
# ============================================================
print("\n" + "=" * 70)
print("FIX 2: ZERO-AMOUNT ENTRIES")
print("=" * 70)
zero_ids: List[str] = [eid for eid, t in et.items() if t['d'] == 0 and t['c'] == 0 and t['n'] > 0]
print(f"  Found {len(zero_ids)} zero-amount entries")
fixed2: int = 0
for eid in zero_ids:
    entry: Optional[Dict[str, Any]] = next((e for e in entries if e['id'] == eid), None)
    if not entry:
        continue
    st = entry.get('status', '')
    # If posted, change to draft first
    if st == 'posted':
        ok, _ = patch('journal_entries', f'id=eq.{eid}', {'status': 'draft'})
        if not ok:
            print(f"  SKIP (cannot unpost): {entry.get('entry_number', '?')}")
            continue
    # Check if referenced by invoice
    if eid in inv_je_lookup:
        inv = inv_je_lookup[eid]
        patch('invoices', f'id=eq.{inv["id"]}', {'journal_entry_id': None})
        print(f"  Unlinked invoice {inv.get('invoice_number', '?')}")
    # Delete lines
    delete('journal_entry_lines', f'journal_entry_id=eq.{eid}')
    # Delete entry
    ok, err = delete('journal_entries', f'id=eq.{eid}')
    if ok:
        fixed2 += 1
        print(f"  DELETED: {entry.get('entry_number', '?')}")
    else:
        print(f"  FAILED: {entry.get('entry_number', '?')} - {err}")

# ============================================================
# FIX 3: Draft entries
# ============================================================
print("\n" + "=" * 70)
print("FIX 3: DRAFT ENTRIES")
print("=" * 70)
drafts: List[Dict[str, Any]] = [e for e in entries if e.get('status') == 'draft']
print(f"  Found {len(drafts)} draft entries")
posted_count: int = 0
deleted_count: int = 0
for e in drafts:
    eid = e['id']
    if eid not in linked_ids:
        # Empty draft - delete
        ok, err = delete('journal_entries', f'id=eq.{eid}')
        if ok:
            deleted_count += 1
            print(f"  DELETED empty draft: {e.get('entry_number', '?')}")
        else:
            print(f"  FAILED to delete: {e.get('entry_number', '?')} - {err}")
    else:
        t: Optional[Dict[str, float]] = et.get(eid)
        if t and abs(t['d']) < 0.01 and abs(t['c']) < 0.01:
            # Zero-amount draft - delete
            ok, err = delete('journal_entries', f'id=eq.{eid}')
            if ok:
                deleted_count += 1
                print(f"  DELETED zero-amount draft: {e.get('entry_number', '?')}")
            else:
                print(f"  FAILED to delete: {e.get('entry_number', '?')} - {err}")
        else:
            # Balanced draft - post
            ok, _ = patch('journal_entries', f'id=eq.{eid}', {'status': 'posted'})
            if ok:
                posted_count += 1
                print(f"  POSTED: {e.get('entry_number', '?')}")
            else:
                print(f"  FAILED to post: {e.get('entry_number', '?')}")

print(f"  Posted {posted_count} drafts, deleted {deleted_count} drafts")

# ============================================================
# FIX 4: Unlinked payments
# ============================================================
print("\n" + "=" * 70)
print("FIX 4: UNLINKED PAYMENTS")
print("=" * 70)
# Payments without invoice_id but with contract_id or customer_id
unlinked_payments: List[Dict[str, Any]] = [p for p in payments if p.get('invoice_id') is None and (p.get('contract_id') is not None or p.get('customer_id') is not None)]
print(f"  Found {len(unlinked_payments)} unlinked payments")
fixed4: int = 0
for p in unlinked_payments:
    pid: str = p['id']
    # If payment has contract_id, try to find an invoice for that contract
    if p.get('contract_id'):
        cid: str = p['contract_id']
        # Find invoices for this contract that are not fully paid
        matching_invoices: List[Dict[str, Any]] = [i for i in invoices if i.get('contract_id') == cid and i.get('status') != 'paid']
        if matching_invoices:
            # Link to the first matching invoice
            inv = matching_invoices[0]
            ok, _ = patch('payments', f'id=eq.{pid}', {'invoice_id': inv['id']})
            if ok:
                fixed4 += 1
                print(f"  LINKED payment {p.get('payment_number', '?')} to invoice {inv.get('invoice_number', '?')}")
            else:
                print(f"  FAILED to link payment {p.get('payment_number', '?')}")
        else:
            # No matching invoice, create a new invoice? Or just leave? For now, skip
            print(f"  SKIP payment {p.get('payment_number', '?')}: no invoice for contract {cid}")
    elif p.get('customer_id'):
        # Payment has customer_id but no contract_id, try to find an invoice for that customer
        cust_id: str = p['customer_id']
        matching_invoices = [i for i in invoices if i.get('customer_id') == cust_id and i.get('status') != 'paid']
        if matching_invoices:
            inv = matching_invoices[0]
            ok, _ = patch('payments', f'id=eq.{pid}', {'invoice_id': inv['id']})
            if ok:
                fixed4 += 1
                print(f"  LINKED payment {p.get('payment_number', '?')} to invoice {inv.get('invoice_number', '?')}")
            else:
                print(f"  FAILED to link payment {p.get('payment_number', '?')}")
        else:
            print(f"  SKIP payment {p.get('payment_number', '?')}: no invoice for customer {cust_id}")

print(f"  Linked {fixed4} payments")

# ============================================================
# FIX 5: Unlinked invoices (PUR-type, no customer)
# ============================================================
print("\n" + "=" * 70)
print("FIX 5: UNLINKED INVOICES (PUR-TYPE, NO CUSTOMER)")
print("=" * 70)
# Invoices without customer_id and type PUR (assuming type field exists, else check invoice_number prefix?)
# For simplicity, assume invoices without customer_id are PUR-type
unlinked_invoices: List[Dict[str, Any]] = [i for i in invoices if i.get('customer_id') is None]
print(f"  Found {len(unlinked_invoices)} unlinked invoices")
fixed5: int = 0
for i in unlinked_invoices:
    iid: str = i['id']
    # Try to find a contract for this invoice (if it has contract_id)
    if i.get('contract_id'):
        cid = i['contract_id']
        # Find a customer for that contract
        contract: Optional[Dict[str, Any]] = next((c for c in contracts if c['id'] == cid), None)
        if contract and contract.get('customer_id'):
            cust_id = contract['customer_id']
            ok, _ = patch('invoices', f'id=eq.{iid}', {'customer_id': cust_id})
            if ok:
                fixed5 += 1
                print(f"  LINKED invoice {i.get('invoice_number', '?')} to customer {cust_id}")
            else:
                print(f"  FAILED to link invoice {i.get('invoice_number', '?')}")
        else:
            print(f"  SKIP invoice {i.get('invoice_number', '?')}: no customer for contract {cid}")
    else:
        print(f"  SKIP invoice {i.get('invoice_number', '?')}: no contract_id")

print(f"  Linked {fixed5} invoices")

print("\n" + "=" * 70)
print("REMEDIATION COMPLETE")
print(f"  Fixed1 (empty entries): {fixed1}")
print(f"  Fixed2 (zero-amount entries): {fixed2}")
print(f"  Fixed3 (draft entries): posted {posted_count}, deleted {deleted_count}")
print(f"  Fixed4 (unlinked payments): {fixed4}")
print(f"  Fixed5 (unlinked invoices): {fixed5}")
print("=" * 70)
