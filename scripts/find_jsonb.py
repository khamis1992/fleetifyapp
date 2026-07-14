#!/usr/bin/env python3
import psycopg2
from db_connection import get_database_url

conn = psycopg2.connect(get_database_url())
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE data_type = 'jsonb'
    AND table_schema = 'public'
    ORDER BY table_name, column_name
""")
print("=== JSONB COLUMNS ===")
for r in cur.fetchall():
    print(f"  {r[0]}.{r[1]}")

cur.execute("""
    SELECT DISTINCT p.proname, pg_get_functiondef(p.oid)
    FROM pg_proc p
    JOIN pg_trigger t ON t.tgfoid = p.oid
    WHERE tgrelid = 'payments'::regclass
    ORDER BY p.proname
""")
print("\n=== PAYMENT TRIGGER FUNCTIONS ===")
for r in cur.fetchall():
    body = r[1]
    if 'jsonb' in body.lower() or '->>' in body:
        print(f"\n--- {r[0]} ---")
        for line in body.split('\n'):
            if 'jsonb' in line.lower() or '->>' in line or 'INSERT' in line.upper():
                print(f"  {line.strip()[:200]}")
    else:
        print(f"  {r[0]} (no jsonb)")

cur.close()
conn.close()
