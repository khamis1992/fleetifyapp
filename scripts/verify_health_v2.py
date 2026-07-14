#!/usr/bin/env python3
"""
Check ALL contracts: how many would still show 'missing invoices'
using the same logic as the fixed health analysis.
"""
import psycopg2
from datetime import datetime
from db_connection import get_database_url

conn = psycopg2.connect(get_database_url())
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    SELECT
        c.id,
        c.contract_number,
        c.contract_amount,
        c.monthly_amount,
        c.start_date,
        c.end_date,
        (
            SELECT COUNT(DISTINCT m) FROM (
                SELECT to_char(invoice_date, 'YYYY-MM') AS m FROM invoices i2
                WHERE i2.contract_id = c.id AND i2.status <> 'cancelled'
                  AND invoice_date IS NOT NULL
                UNION
                SELECT to_char(due_date, 'YYYY-MM') FROM invoices i3
                WHERE i3.contract_id = c.id AND i3.status <> 'cancelled'
                  AND due_date IS NOT NULL
            ) AS months
        ) AS covered_months,
        (
            SELECT COUNT(*) FROM generate_series(
                0,
                (EXTRACT(YEAR FROM AGE(c.end_date, c.start_date)) * 12
                 + EXTRACT(MONTH FROM AGE(c.end_date, c.start_date)))::int
            ) AS n
        ) AS expected_months
    FROM contracts c
    WHERE c.status NOT IN ('draft', 'cancelled')
      AND c.start_date IS NOT NULL
      AND c.end_date IS NOT NULL
      AND c.monthly_amount > 0
    ORDER BY c.created_at DESC
""")

rows = cur.fetchall()

problems = []
for r in rows:
    cid, cnum, camt, monthly, s, e, covered, expected = r
    # Align how the frontend counts expected months (inclusive monthSpanInclusive)
    # expected from generate_series is off by the exclusive upper bound, so recompute
    months = 0
    cur2 = datetime(s.year, s.month, 1)
    end_m = datetime(e.year, e.month, 1)
    while cur2 <= end_m:
        months += 1
        if cur2.month == 12:
            cur2 = cur2.replace(year=cur2.year + 1, month=1)
        else:
            cur2 = cur2.replace(month=cur2.month + 1)
    expected_fixed = months

    if covered != expected_fixed:
        problems.append((cnum, cid, s, e, covered, expected_fixed, expected_fixed - covered))

cur.close()
conn.close()

print(f'\nTotal contracts with invoice gap after the new logic: {len(problems)}\n')
if not problems:
    print('  None. All contracts are aligned.')
else:
    for p in problems[:60]:
        cnum, cid, s, e, covered, expected, diff = p
        print(f"  {cnum}: covered={covered}, expected={expected}, gap={diff}  (start={s}, end={e})")
    if len(problems) > 60:
        print(f'  ...and {len(problems) - 60} more')
