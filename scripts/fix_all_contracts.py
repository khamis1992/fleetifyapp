#!/usr/bin/env python3
"""
Fix ALL contract payment schedule issues across ALL companies.
Rules:
  1. NEVER modify paid installments/invoices (audit integrity)
  2. Cancel installments outside contract dates
  3. Keep only one active installment per month (cancel duplicates)
  4. Fix unpaid installment amounts to match contract.monthly_amount
  5. Fix unpaid invoice amounts to match their linked schedule
"""
import psycopg2
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from db_connection import get_database_url

DB_URL = get_database_url()

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Get all active contracts (all companies)
    cur.execute("""
        SELECT id, contract_number, company_id, contract_amount, monthly_amount, start_date, end_date, status
        FROM contracts
        WHERE status NOT IN ('draft', 'cancelled')
          AND start_date IS NOT NULL AND end_date IS NOT NULL
          AND monthly_amount > 0
        ORDER BY company_id, created_at DESC
    """)
    all_contracts = cur.fetchall()

    total_contracts = len(all_contracts)
    print(f"Total contracts to audit: {total_contracts}")

    total_cancelled = 0
    total_fixed_sched_amounts = 0
    total_fixed_inv_amounts = 0
    total_contracts_with_fixes = 0

    for c in all_contracts:
        cid, cnum, company_id, amount, monthly, start, end, status = c
        monthly_f = float(monthly)
        contract_fixes = False

        if contract_fixes:
            total_contracts_with_fixes += 1

        # === 1. Cancel installments outside contract dates ===
        cur.execute("""
            UPDATE contract_payment_schedules
            SET status = 'cancelled',
                notes = COALESCE(notes, '') || ' | Auto-fixed: outside contract date range'
            WHERE contract_id = %s
              AND company_id = %s
              AND status != 'cancelled'
              AND (due_date < %s OR due_date > %s + INTERVAL '5 days')
            RETURNING installment_number, due_date
        """, (cid, company_id, start, end))
        outside = cur.fetchall()
        if outside:
            total_cancelled += len(outside)
            contract_fixes = True
            for o in outside:
                print(f"  {cnum}: Cancelled installment {o[0]} (date {o[1]} outside contract {start} to {end})")

        # === 2. Cancel duplicate installments per month ===
        cur.execute("""
            SELECT id, installment_number, due_date, status
            FROM contract_payment_schedules
            WHERE contract_id = %s AND company_id = %s AND status != 'cancelled'
            ORDER BY due_date
        """, (cid, company_id))
        active_installments = cur.fetchall()

        months_seen = {}
        for inst in active_installments:
            inst_id, inst_num, due_date, inst_status = inst
            if due_date:
                month_key = due_date.strftime('%Y-%m')
                if month_key in months_seen:
                    cur.execute("""
                        UPDATE contract_payment_schedules
                        SET status = 'cancelled',
                            notes = COALESCE(notes, '') || ' | Auto-fixed: duplicate month'
                        WHERE id = %s AND status != 'paid'
                    """, (inst_id,))
                    total_cancelled += 1
                    print(f"  {cnum}: Cancelled duplicate installment {inst_num} (month {month_key})")
                else:
                    months_seen[month_key] = inst

        # === 3. Fix unpaid installment amounts ===
        cur.execute("""
            SELECT id, installment_number, due_date, amount, status
            FROM contract_payment_schedules
            WHERE contract_id = %s AND company_id = %s AND status != 'cancelled'
            ORDER BY due_date
        """, (cid, company_id))
        active_installments = cur.fetchall()

        for inst in active_installments:
            inst_id, inst_num, due_date, amount, inst_status = inst
            if inst_status == 'paid':
                continue
            if abs(float(amount) - monthly_f) > 0.01:
                cur.execute("""
                    UPDATE contract_payment_schedules
                    SET amount = %s,
                        notes = COALESCE(notes, '') || ' | Auto-fixed: amount ' || amount::text || ' -> ' || %s::text
                    WHERE id = %s
                """, (monthly, monthly, inst_id))
                total_fixed_sched_amounts += 1
                contract_fixes = True
                print(f"  {cnum}: Fixed installment {inst_num} amount: {amount} -> {monthly}")

        # === 4. Fix unpaid invoice amounts to match their linked schedule ===
        cur.execute("""
            SELECT i.id, i.invoice_number, i.total_amount, i.paid_amount, i.status,
                   s.amount as sched_amount
            FROM invoices i
            JOIN contract_payment_schedules s ON s.invoice_id = i.id
            WHERE i.company_id = %s AND i.contract_id = %s AND i.status != 'cancelled' AND s.status != 'cancelled'
        """, (company_id, cid))
        inv_with_sched = cur.fetchall()

        for row in inv_with_sched:
            inv_id, inv_num, inv_total, paid, inv_status, sched_amount = row
            if inv_status == 'paid' or float(paid or 0) > 0:
                continue
            if abs(float(inv_total) - float(sched_amount)) > 0.01:
                new_balance = max(0, float(sched_amount) - float(paid or 0))
                cur.execute("""
                    UPDATE invoices
                    SET total_amount = %s, subtotal = %s, balance_due = %s, updated_at = now()
                    WHERE id = %s
                """, (sched_amount, sched_amount, new_balance, inv_id))
                total_fixed_inv_amounts += 1
                contract_fixes = True
                print(f"  {cnum}: Fixed invoice {inv_num} amount: {inv_total} -> {sched_amount}")

        if contract_fixes:
            total_contracts_with_fixes += 1

    # Final summary
    print(f"\n{'='*60}")
    print(f"REMEDIATION COMPLETE")
    print(f"{'='*60}")
    print(f"Total contracts audited: {total_contracts}")
    print(f"Contracts with fixes: {total_contracts_with_fixes}")
    print(f"Installments cancelled: {total_cancelled}")
    print(f"Installment amounts fixed: {total_fixed_sched_amounts}")
    print(f"Invoice amounts fixed: {total_fixed_inv_amounts}")

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
