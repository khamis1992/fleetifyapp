#!/usr/bin/env python3
"""Check contract dates and health analysis expectations."""
import psycopg2

conn = psycopg2.connect('postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres')
conn.autocommit = True
cur = conn.cursor()

# Get contract details
cur.execute("SELECT id, contract_number, start_date, end_date, contract_amount, monthly_amount FROM contracts WHERE contract_number LIKE '%V1KPVI%'")
contract = cur.fetchone()
print(f"=== CONTRACT ===")
print(f"  Number: {contract[1]}")
print(f"  Start: {contract[2]}")
print(f"  End: {contract[3]}")
print(f"  Total: {contract[4]}")
print(f"  Monthly: {contract[5]}")

# Expected months
from datetime import datetime
import calendar
start = datetime.strptime(str(contract[2]), '%Y-%m-%d')
end = datetime.strptime(str(contract[3]), '%Y-%m-%d')
months = 0
cursor = start
while cursor <= end:
    months += 1
    # Move to next month
    if cursor.month == 12:
        cursor = cursor.replace(year=cursor.year + 1, month=1)
    else:
        cursor = cursor.replace(month=cursor.month + 1)
print(f"\nExpected months (inclusive): {months}")
print(f"Expected by amount: {int(contract[4]) // int(contract[5])}")

# Get all invoices for this contract
cur.execute("""
    SELECT invoice_number, invoice_date, due_date, status, payment_status
    FROM invoices
    WHERE contract_id = %s
    ORDER BY invoice_date
""", (contract[0],))
invoices = cur.fetchall()
print(f"\nActual invoices: {len(invoices)}")
print(f"Missing: {months - len(invoices)}")

# Check what triggers exist on invoices
cur.execute("""
    SELECT tgname, tgtype::regtype::text
    FROM pg_trigger
    WHERE tgrelid = 'invoices'::regclass
    ORDER BY tgname
""")
print(f"\n=== TRIGGERS ON INVOICES ===")
for t in cur.fetchall():
    print(f"  {t[0]} ({t[1]})")

cur.close()
conn.close()
