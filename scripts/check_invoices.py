#!/usr/bin/env python3
"""Check actual invoices for the problematic contract."""
import psycopg2

conn = psycopg2.connect('postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres')
conn.autocommit = True
cur = conn.cursor()

# Find the contract by contract number pattern
cur.execute("SELECT id, contract_number, contract_amount, monthly_amount FROM contracts WHERE contract_number LIKE '%V1KPVI%'")
contracts = cur.fetchall()
print("=== CONTRACTS MATCHING V1KPVI ===")
for c in contracts:
    print(f"  ID: {c[0]}, Number: {c[1]}, Amount: {c[2]}, Monthly: {c[3]}")

# Find all invoices for this contract
if contracts:
    contract_id = contracts[0][0]
    cur.execute("""
        SELECT id, invoice_number, invoice_date, due_date, status, payment_status, total_amount
        FROM invoices 
        WHERE contract_id = %s
        ORDER BY invoice_date
    """, (contract_id,))
    invoices = cur.fetchall()
    print(f"\n=== ALL INVOICES FOR CONTRACT {contract_id} ===")
    for inv in invoices:
        print(f"  {inv[1]} | Date: {inv[2]} | Status: {inv[3]} | Payment: {inv[4]} | Amount: {inv[5]}")

    # Check what unique constraints exist on invoices
    cur.execute("""
        SELECT conname, contype, conrelid::regclass
        FROM pg_constraint
        WHERE conrelid = 'invoices'::regclass
        ORDER BY contype, conname
    """)
    constraints = cur.fetchall()
    print(f"\n=== INVOICE CONSTRAINTS ===")
    for c in constraints:
        print(f"  {c[0]} ({c[1]}) on {c[2]}")

cur.close()
conn.close()
