#!/usr/bin/env python3
"""Verify gap=1 contract would be fixed by auto-fix."""
import psycopg2
from datetime import datetime

conn = psycopg2.connect('postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres')
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    SELECT c.id, c.contract_number, c.start_date, c.end_date
    FROM contracts c
    WHERE c.status NOT IN ('draft', 'cancelled') AND c.start_date IS NOT NULL AND c.end_date IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT 50
""")

for r in cur.fetchall():
    cid, cnum, start, end = r
    end_m = datetime(end.year, end.month, 1)

    cur2 = conn.cursor()
    cur2.execute("""SELECT DISTINCT m FROM (
        SELECT to_char(invoice_date, 'YYYY-MM') AS m FROM invoices WHERE contract_id = %s AND status != 'cancelled' AND invoice_date IS NOT NULL
        UNION SELECT to_char(due_date, 'YYYY-MM') FROM invoices WHERE contract_id = %s AND status != 'cancelled' AND due_date IS NOT NULL
    ) x""", (cid, cid))
    covered = {row2[0] for row2 in cur2.fetchall()}

    expected = set()
    cursor = datetime(start.year, start.month, 1)
    while cursor <= end_m:
        expected.add(cursor.strftime('%Y-%m'))
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    missing = sorted(expected - covered)
    if len(missing) == 1:
        print(f"{cnum}: gap=1, missing={missing[0]}")
        print(f"  start={start}, end={end}")
        print(f"  missing month vs start month: {'SAME' if missing[0] == start[:7] else 'AFTER' if missing[0] > start[:7] else 'BEFORE'}")
        break

cur.close()
conn.close()
