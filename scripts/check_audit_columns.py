#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect('postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres')
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ORDER BY ordinal_position
""")
print("=== AUDIT_LOGS COLUMNS ===")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]} (nullable={r[2]}, default={r[3]})")

cur.close()
conn.close()
