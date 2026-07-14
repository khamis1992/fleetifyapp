#!/usr/bin/env python3
"""Check RLS policies and triggers on payments table."""
import psycopg2
from db_connection import get_database_url

conn = psycopg2.connect(get_database_url())
conn.autocommit = True
cur = cur = conn.cursor()

# Check RLS policies on payments
cur.execute("""
    SELECT polname, polcmd, polqual, polwithcheck
    FROM pg_policy
    WHERE polrelid = 'payments'::regclass
    ORDER BY polname
""")
policies = cur.fetchall()
print("=== RLS POLICIES ON PAYMENTS ===")
for p in policies:
    print(f"  {p[0]} ({p[1]})")
    if p[2]:
        print(f"    USING: {p[2][:200]}")
    if p[3]:
        print(f"    CHECK: {p[3][:200]}")

# Check triggers on payments
cur.execute("""
    SELECT tgname, tgfoid::regproc
    FROM pg_trigger
    WHERE tgrelid = 'payments'::regclass
    ORDER BY tgname
""")
print("\n=== TRIGGERS ON PAYMENTS ===")
for t in cur.fetchall():
    print(f"  {t[0]} ({t[1]})")

# Check the column types
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'payments'
    ORDER BY ordinal_position
""")
print("\n=== PAYMENTS COLUMNS ===")
for c in cur.fetchall():
    print(f"  {c[0]}: {c[1]}")

cur.close()
conn.close()
