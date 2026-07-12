#!/usr/bin/env python3
"""Verify the auto-fix flow works end-to-end for a problematic contract."""
import psycopg2
from datetime import datetime, timedelta

DB_URL = "postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
contract_id = '86bb0de4-11ef-4179-b928-10bb22c80bdb'

print("=== Current state of CON-26-V1KPVI ===")

# Count invoices
cur.execute("SELECT COUNT(*) FROM invoices WHERE contract_id = %s AND status != 'cancelled'", (contract_id,))
print(f"Active invoices: {cur.fetchone()[0]}")

# Count schedules
cur.execute("SELECT COUNT(*) FROM contract_payment_schedules WHERE contract_id = %s AND status != 'cancelled'", (contract_id,))
print(f"Active schedules: {cur.fetchone()[0]}")

# Simulate what the auto-fix would do:
# 1. getCurrentActiveInvoiceMonthKeys - which months are covered?
cur.execute("""
    SELECT DISTINCT
        to_char(COALESCE(due_date, invoice_date), 'YYYY-MM') as inv_month
    FROM invoices
    WHERE contract_id = %s AND status != 'cancelled'
    ORDER BY inv_month
""", (contract_id,))
inv_months = [r[0] for r in cur.fetchall()]
print(f"Invoice months (due_date priority): {inv_months}")
print(f"  Count: {len(inv_months)}")

# Contract months
cur.execute("SELECT start_date, end_date FROM contracts WHERE id = %s", (contract_id,))
start, end = cur.fetchall()[0]
cursor = datetime(start.year, start.month, 1)
end_month = datetime(end.year, end.month, 1)
expected_months = set()
while cursor <= end_month:
    expected_months.add(cursor.strftime('%Y-%m'))
    if cursor.month == 12:
        cursor = cursor.replace(year=cursor.year + 1, month=1)
    else:
        cursor = cursor.replace(month=cursor.month + 1)
print(f"Expected months: {sorted(expected_months)}")

missing = sorted(expected_months - set(inv_months))
print(f"Missing months: {missing}")

# Check if trigger would block creation
if missing:
    for m in missing:
        test_date = datetime.strptime(m, '%Y-%m')
        cur.execute("""
            SELECT COUNT(*) FROM invoices
            WHERE contract_id = %s AND status != 'cancelled'
            AND DATE_TRUNC('month', COALESCE(due_date, invoice_date)) = DATE_TRUNC('month', %s::date)
        """, (contract_id, test_date))
        blocking = cur.fetchone()[0]
        print(f"  Trigger blocks creation for {m}: {'YES' if blocking else 'NO'}")

# Summary
print("\n=== What auto-fix will do ===")
print("1. getCurrentActiveInvoiceMonthKeys counts months using due_date")
print(f"   Now sees {len(inv_months)} months covered (was 23, now includes due_date months)")
print(f"2. missingInvoices = max(expected - covered, schedule_missing)")
print(f"   = max({len(expected_months)} - {len(inv_months)}, missing_schedules)")

cur.close()
conn.close()
