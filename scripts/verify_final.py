#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect('postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres')
conn.autocommit = True
cur = conn.cursor()

print('=== FUNCTIONS ===')
cur.execute("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name")
for r in cur.fetchall():
    print(f'  {r[0]}')

print('\n=== TRIGGERS ===')
cur.execute("SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table, trigger_name")
for r in cur.fetchall():
    print(f'  {r[0]} on {r[1]}')

print('\n=== RLS STATUS ===')
tables = ['invoices','payments','contracts','customers','journal_entries','chart_of_accounts','annual_financial_close_runs','audit_logs','financial_approval_policies','journal_entry_lines']
for t in tables:
    cur.execute(f"SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='{t}'")
    row = cur.fetchone()
    if row:
        print(f'  {row[0]}: RLS={"ON" if row[1] else "OFF"}')
    else:
        print(f'  {t}: TABLE NOT FOUND')

print('\n=== KEY CONSTRAINTS ===')
cur.execute("SELECT table_name, constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_schema='public' AND table_name IN ('invoices','payments','journal_entries','customers','contracts') ORDER BY table_name, constraint_type, constraint_name")
for r in cur.fetchall():
    print(f'  {r[0]}.{r[1]} ({r[2]})')

print('\n=== EXTENSIONS ===')
cur.execute("SELECT extname FROM pg_extension ORDER BY extname")
for r in cur.fetchall():
    print(f'  {r[0]}')

print('\n=== ANNUAL CLOSE LINES COLUMNS ===')
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='annual_financial_close_lines' ORDER BY ordinal_position")
for r in cur.fetchall():
    print(f'  {r[0]}: {r[1]}')

print('\n=== PII COLUMNS ===')
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='customers' AND column_name LIKE '%encrypted%' ORDER BY ordinal_position")
for r in cur.fetchall():
    print(f'  {r[0]}: {r[1]}')

cur.close()
conn.close()
