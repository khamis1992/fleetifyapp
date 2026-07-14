#!/usr/bin/env python3
"""Apply migration SQL directly to the configured Supabase database."""
import os
import sys

import psycopg2

from db_connection import get_database_url

try:
    conn = psycopg2.connect(get_database_url())
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
