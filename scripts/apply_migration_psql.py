#!/usr/bin/env python3
"""Apply migration SQL directly to the remote Supabase Postgres database."""
import os, psycopg2, sys
from dotenv import dotenv_values

vals = dotenv_values('.env')
DB_URL = vals.get('VITE_SUPABASE_DB_URL', '').strip()
DB_PASSWORD = vals.get('VITE_SUPABASE_DB_PASSWORD', '').strip()
SUPABASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()

# Construct connection string from Supabase project ref
# The direct connection URL is usually:
# postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
# Or we can use the connection pooler URL

if not DB_URL and not DB_PASSWORD:
    print("ERROR: No VITE_SUPABASE_DB_URL or VITE_SUPABASE_DB_PASSWORD found in .env")
    print("Trying to construct from VITE_SUPABASE_URL...")
    # Extract project ref from URL: https://[project-ref].supabase.co
    import re
    match = re.search(r'https?://([a-z0-9]+)\.supabase\.(co|in)', SUPABASE_URL)
    if match:
        project_ref = match.group(1)
        print(f"  Project ref: {project_ref}")
        # Try direct connection
        # You need to set SUPABASE_DB_PASSWORD in .env
        print(f"  Please set VITE_SUPABASE_DB_PASSWORD or SUPABASE_DB_PASSWORD in .env")
        print(f"  Connection URL would be: postgresql://postgres.{project_ref}:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres")
        sys.exit(1)

if DB_URL:
    conn_str = DB_URL
else:
    # Try to build from parts
    project_ref = ''
    import re
    match = re.search(r'https?://([a-z0-9]+)\.supabase\.(co|in)', SUPABASE_URL)
    if match:
        project_ref = match.group(1)
    conn_str = f"postgresql://postgres.{project_ref}:{DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

print(f"Connecting to: {conn_str.split('@')[0]}@***")

try:
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cursor = conn.cursor()
    print("Connected!")

    # Read and execute the migration SQL
    migration_path = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', '20260701000006_link_payment_journal_bypass.sql')
    with open(migration_path, 'r') as f:
        sql = f.read()

    print(f"\nExecuting migration ({len(sql)} chars)...")
    cursor.execute(sql)
    print("Migration applied successfully!")

    # Verify the function exists
    cursor.execute("SELECT proname FROM pg_proc WHERE proname = 'link_payment_journal_entry_bypass'")
    result = cursor.fetchone()
    if result:
        print(f"  Function link_payment_journal_entry_bypass: EXISTS")
    else:
        print(f"  Function link_payment_journal_entry_bypass: NOT FOUND")

    cursor.execute("SELECT proname FROM pg_proc WHERE proname = 'batch_link_payment_journal_entries'")
    result = cursor.fetchone()
    if result:
        print(f"  Function batch_link_payment_journal_entries: EXISTS")
    else:
        print(f"  Function batch_link_payment_journal_entries: NOT FOUND")

    cursor.close()
    conn.close()
    print("\nDone!")

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)