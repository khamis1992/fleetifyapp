#!/usr/bin/env python3
import psycopg2
from datetime import datetime

conn = psycopg2.connect('postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres')
conn.autocommit = True
cur = conn.cursor()

contract_id = '86bb0de4-11ef-4179-b928-10bb22c80bdb'

# Calculate invoice months using BOTH invoice_date and due_date (our new logic)
cur.execute("""
    SELECT DISTINCT month_key FROM (
        SELECT to_char(invoice_date, 'YYYY-MM') as month_key
        FROM invoices WHERE contract_id = %s AND status != 'cancelled' AND invoice_date IS NOT NULL
        UNION
        SELECT to_char(due_date, 'YYYY-MM') as month_key
        FROM invoices WHERE contract_id = %s AND status != 'cancelled' AND due_date IS NOT NULL
    ) combined ORDER BY month_key
""", (contract_id, contract_id))
months = [r[0] for r in cur.fetchall()]
print(f'Months covered (BOTH dates): {len(months)} months')
print(f'  {months}')

# Expected
cur.execute("SELECT start_date, end_date FROM contracts WHERE id = %s", (contract_id,))
start, end = cur.fetchall()[0]
expected = set()
cursor = datetime(start.year, start.month, 1)
end_m = datetime(end.year, end.month, 1)
while cursor <= end_m:
    expected.add(cursor.strftime('%Y-%m'))
    if cursor.month == 12:
        cursor = cursor.replace(year=cursor.year + 1, month=1)
    else:
        cursor = cursor.replace(month=cursor.month + 1)

missing = sorted(expected - set(months))
print(f'\nExpected: {len(expected)} months')
print(f'Missing: {missing}')

if not missing:
    print('\n✓ FIXED! No missing invoices - health message should disappear!')
else:
    print(f'\n✗ Still showing {len(months)} covered vs {len(expected)} expected')

cur.close()
conn.close()
