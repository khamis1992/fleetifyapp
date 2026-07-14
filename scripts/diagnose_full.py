#!/usr/bin/env python3
"""Complete diagnosis of the contract invoice auto-fix issue."""
import psycopg2
from db_connection import get_database_url

conn = psycopg2.connect(get_database_url())
conn.autocommit = True
cur = conn.cursor()

contract_id = '86bb0de4-11ef-4179-b928-10bb22c80bdb'

print("=" * 60)
print("CONTRACT INVOICE AUDIT DIAGNOSIS")
print("=" * 60)

# 1. Get all invoices for this contract
cur.execute("""
    SELECT id, invoice_number, invoice_date, due_date, status, payment_status, total_amount
    FROM invoices
    WHERE contract_id = %s
    ORDER BY invoice_date
""", (contract_id,))
invoices = cur.fetchall()

print(f"\n1. ALL INVOICES FOR CONTRACT (count: {len(invoices)})")
existing_months_invoice_date = set()
existing_months_due_date = set()
for inv in invoices:
    inv_id, inv_num, inv_date, due_date, status, pay_status, amount = inv
    from datetime import datetime
    if inv_date:
        month_key = inv_date.strftime('%Y-%m')
        existing_months_invoice_date.add(month_key)
    else:
        month_key = 'NO_DATE'
    if due_date:
        due_month_key = due_date.strftime('%Y-%m')
        existing_months_due_date.add(due_month_key)
    else:
        due_month_key = 'NO_DUE_DATE'
    print(f"  {inv_num} | {inv_date} (inv) | {due_date} (due) | status={status} | pay={pay_status}")

print(f"\n  Months covered by invoice_date: {sorted(existing_months_invoice_date)}")
print(f"  Months covered by due_date:     {sorted(existing_months_due_date)}")

# 2. Expected months
print("\n2. EXPECTED MONTHS")
cur.execute("SELECT start_date, end_date FROM contracts WHERE id = %s", (contract_id,))
start_date, end_date = cur.fetchone()
print(f"  Contract: {start_date} to {end_date}")
from datetime import datetime
import calendar
cursor = datetime(start_date.year, start_date.month, 1)
end = datetime(end_date.year, end_date.month, 1)
expected_months = set()
while cursor <= end:
    expected_months.add(cursor.strftime('%Y-%m'))
    if cursor.month == 12:
        cursor = cursor.replace(year=cursor.year + 1, month=1)
    else:
        cursor = cursor.replace(month=cursor.month + 1)
print(f"  Expected months: {sorted(expected_months)}")
print(f"  Expected count: {len(expected_months)}")
print(f"  Missing by invoice_date: {sorted(expected_months - existing_months_invoice_date)}")
print(f"  Missing by due_date:     {sorted(expected_months - existing_months_due_date)}")

# 3. Payment schedules
print("\n3. PAYMENT SCHEDULES")
cur.execute("""
    SELECT id, installment_number, due_date, amount, status, invoice_id
    FROM contract_payment_schedules
    WHERE contract_id = %s
    ORDER BY installment_number
""", (contract_id,))
schedules = cur.fetchall()
print(f"  Schedule count: {len(schedules)}")
for s in schedules[:30]:
    print(f"    Installment {s[1]} | due: {s[2]} | amount: {s[3]} | status: {s[4]} | invoice: {s[5]}")
if len(schedules) > 30:
    print(f"    ... and {len(schedules) - 30} more")

# 4. Try the exact insert that the trigger would reject
print("\n4. TEST TRIGGER BEHAVIOR")
test_invoice_month = datetime(2027, 8, 1)
cur.execute("""
    SELECT id, invoice_number
    FROM invoices
    WHERE contract_id = %s
      AND DATE_TRUNC('month', COALESCE(due_date, invoice_date)) = DATE_TRUNC('month', %s::date)
      AND status != 'cancelled'
    LIMIT 1
""", (contract_id, test_invoice_month))
result = cur.fetchone()
if result:
    print(f"  TRIGGER WOULD REJECT: invoice for 2027-08 because existing invoice {result[1]} covers this month")
    print(f"  (trigger uses DATE_TRUNC('month', COALESCE(due_date, invoice_date)) to check)")
else:
    print(f"  No existing invoice blocks 2027-08")

# 5. Check what the auto-fix would try to do
print("\n5. WHAT THE AUTO-FAX DOES")
print("  getCurrentActiveInvoiceMonthKeys uses: invoice_date || due_date")
print("  Trigger uses: COALESCE(due_date, invoice_date)")
print("  These are DIFFERENT when invoice_date is NOT NULL!")
print("  invoice_date || due_date = invoice_date (when invoice_date is not null)")
print("  COALESCE(due_date, invoice_date) = due_date (when due_date is not null)")

# 6. Show the mismatch
print("\n6. THE MISMATCH")
print("  Invoice 023: invoice_date=2027-07-01, due_date=2027-08-01")
print("  Health check sees month: 2027-07 (from invoice_date)")
print("  Trigger sees month: 2027-08 (from due_date)")
print("  So health check thinks 2027-08 is missing, but trigger blocks it!")

# 7. Check if there's a cancelled invoice for 2027-08
print("\n7. CHECK FOR CANCELLED INVOICES")
cur.execute("""
    SELECT id, invoice_number, invoice_date, due_date, status, payment_status
    FROM invoices
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
      AND DATE_TRUNC('month', COALESCE(due_date, invoice_date)) = DATE_TRUNC('month', '2027-08-01'::date)
    ORDER BY invoice_date
""")
cancelled = cur.fetchall()
if cancelled:
    for c in cancelled:
        print(f"  Found: {c[1]} | {c[2]} | {c[3]} | status={c[4]} | pay={c[5]}")
else:
    print("  No invoices found for month 2027-08 at all")

cur.close()
conn.close()
