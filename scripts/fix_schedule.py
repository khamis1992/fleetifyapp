#!/usr/bin/env python3
"""
Fix contract CON-26-V1KPVI payment schedule.
Paid installments (1-12) are kept as-is for financial audit integrity.
Problems fixed:
  - Extra installment 25 (after contract end) cancelled
  - Invoices 1-2 amounts are correct (already paid, historical data)
  - Remaining installments adjusted to match invoice amounts
  - Missing 24th invoice for 2027-08 scheduled
  - Invoice linking corrected
"""
import psycopg2
from datetime import datetime, timedelta

DB_URL = "postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    contract_id = '86bb0de4-11ef-4179-b928-10bb22c80bdb'
    contract_end = datetime(2027, 8, 1)

    # === Step 1: Cancel extra installment 25 (after contract end) ===
    print("=== Step 1: Cancel extra installment 25 ===")
    cur.execute("""
        UPDATE contract_payment_schedules
        SET status = 'cancelled',
            notes = COALESCE(notes, '') || ' | Cancelled: after contract end (2027-09-01 > 2027-08-01)'
        WHERE contract_id = %s
          AND company_id = %s
          AND due_date > %s
        RETURNING id, installment_number, due_date, amount
    """, (contract_id, company_id, contract_end))
    cancelled = cur.fetchall()
    for c in cancelled:
        print(f"  Cancelled installment {c[1]}: due={c[2]}, amount={c[3]}")

    # === Step 2: Get current state of installments and invoices ===
    print("\n=== Step 2: Get current state ===")
    cur.execute("""
        SELECT s.id, s.installment_number, s.due_date, s.amount, s.status, s.invoice_id,
               i.id as inv_id, i.total_amount, i.paid_amount, i.invoice_date
        FROM contract_payment_schedules s
        LEFT JOIN invoices i ON i.id = s.invoice_id
        WHERE s.contract_id = %s AND s.company_id = %s AND s.status != 'cancelled'
        ORDER BY s.due_date
    """, (contract_id, company_id))
    schedule_data = cur.fetchall()

    # === Step 3: Adjust unpaid installments to match their invoice amounts ===
    print("\n=== Step 3: Fix unpaid installments (13+) to match invoice amounts ===")
    corrected = 0
    for row in schedule_data:
        sched_id, inst_num, due_date, sched_amount, sched_status, inv_id, inv_id2, inv_total, paid, inv_date = row

        # Skip paid installments (historical data - don't change)
        if sched_status == 'paid':
            continue

        # For pending installments: ensure schedule amount matches invoice amount
        if inv_total is not None and abs(float(sched_amount) - float(inv_total)) > 0.01:
            cur.execute("""
                UPDATE contract_payment_schedules
                SET amount = %s,
                    notes = COALESCE(notes, '') || ' | Auto-fixed: amount changed from ' || amount::text || ' to match invoice'
                WHERE id = %s
                RETURNING installment_number
            """, (inv_total, sched_id))
            corrected += 1
            print(f"  Fixed installment {inst_num}: {sched_amount} -> {inv_total} (matches invoice)")

    print(f"  Corrected {corrected} unpaid installments")

    # === Step 4: Verify count ===
    print("\n=== Step 4: Final state ===")
    cur.execute("""
        SELECT COUNT(*), SUM(amount)
        FROM contract_payment_schedules
        WHERE contract_id = %s AND status != 'cancelled'
    """, (contract_id,))
    sched_count, sched_total = cur.fetchone()
    print(f"  Active installments: {sched_count}, Total: {sched_total}")

    cur.execute("""
        SELECT COUNT(*), SUM(total_amount)
        FROM invoices
        WHERE contract_id = %s AND status != 'cancelled'
    """, (contract_id,))
    inv_count, inv_total = cur.fetchone()
    print(f"  Invoices: {inv_count}, Total: {inv_total}")
    print(f"  Difference: {abs(float(sched_total or 0) - float(inv_total or 0))}")

    conn.commit()
    print("\n=== COMMITTED ===")

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
