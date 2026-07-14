#!/usr/bin/env python3
"""Audit ALL contracts for payment schedule issues."""
import psycopg2
from datetime import datetime, timedelta
from db_connection import get_database_url

DB_URL = get_database_url()

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Find all contracts with potential schedule issues
    cur.execute("""
        SELECT
            c.id,
            c.contract_number,
            c.company_id,
            c.contract_amount,
            c.monthly_amount,
            c.start_date,
            c.end_date,
            c.status,
            COALESCE(inv_counts.inv_count, 0) as inv_count,
            COALESCE(inv_counts.inv_total, 0) as inv_total,
            COALESCE(sched_counts.sched_count, 0) as sched_count,
            COALESCE(sched_counts.sched_total, 0) as sched_total
        FROM contracts c
        LEFT JOIN (
            SELECT contract_id, COUNT(*) as inv_count, SUM(total_amount) as inv_total
            FROM invoices
            WHERE status != 'cancelled'
            GROUP BY contract_id
        ) inv_counts ON inv_counts.contract_id = c.id
        LEFT JOIN (
            SELECT contract_id, COUNT(*) as sched_count, SUM(amount) as sched_total
            FROM contract_payment_schedules
            WHERE status != 'cancelled'
            GROUP BY contract_id
        ) sched_counts ON sched_counts.contract_id = c.id
        WHERE c.status NOT IN ('draft', 'cancelled')
        ORDER BY c.created_at DESC
    """)
    contracts = cur.fetchall()

    problems = []

    for c in contracts:
        cid, cnum, company_id, amount, monthly, start, end, status, inv_count, inv_total, sched_count, sched_total = c

        if not start or not end or not monthly or monthly <= 0:
            continue

        # Calculate expected
        from dateutil.relativedelta import relativedelta
        months = 0
        cursor = datetime(start.year, start.month, 1)
        end_month = datetime(end.year, end.month, 1)
        while cursor <= end_month:
            months += 1
            cursor = cursor + relativedelta(months=1)

        expected_total = float(months * monthly)
        sched_total = float(sched_total or 0)
        inv_total = float(inv_total or 0)

        issues = []

        # Check installment count
        if sched_count != months:
            issues.append(f"Installments: {sched_count} vs expected {months}")

        # Check total amounts (allow some tolerance)
        if abs(sched_total - expected_total) > 100:
            issues.append(f"Schedule total: {sched_total:.0f} vs expected {expected_total:.0f} (diff: {sched_total - expected_total:.0f})")

        if abs(inv_total - expected_total) > 100:
            issues.append(f"Invoice total: {inv_total:.0f} vs expected {expected_total:.0f} (diff: {inv_total - expected_total:.0f})")

        # Check for installments outside contract dates
        cur.execute("""
            SELECT COUNT(*), MIN(due_date), MAX(due_date)
            FROM contract_payment_schedules
            WHERE contract_id = %s AND due_date IS NOT NULL AND status != 'cancelled'
        """, (cid,))
        min_max = cur.fetchone()
        if min_max and min_max[0] > 0:
            min_due = min_max[1]
            max_due = min_max[2]
            if min_due and min_due < start:
                issues.append(f"Installment before contract start: {min_due}")
            if max_due and max_due > end + timedelta(days=31):
                issues.append(f"Installment after contract end: {max_due} (end: {end})")

        if issues:
            problems.append((cnum, cid, issues, inv_count, sched_count, expected_total, inv_total, sched_total))

    # Report
    print(f"\n{'='*80}")
    print(f"CONTRACT AUDIT: {len(problems)} contracts with issues out of {len(contracts)} total")
    print(f"{'='*80}\n")

    for p in problems[:30]:
        cnum, cid, issues, inv_count, sched_count, expected, inv_total, sched_total = p
        print(f"  {cnum}:")
        for issue in issues:
            print(f"    - {issue}")
        print()

    if len(problems) > 30:
        print(f"  ... and {len(problems) - 30} more contracts with issues")

    # Summary stats
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    total_issues = len(problems)
    count_wrong_installments = sum(1 for p in problems if any('Installments:' in i for i in p[2]))
    count_wrong_amounts = sum(1 for p in problems if any('total:' in i for i in p[2]))
    print(f"  Total contracts with issues: {total_issues}")
    print(f"  Wrong installment count: {count_wrong_installments}")
    print(f"  Wrong total amounts: {count_wrong_amounts}")

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
