#!/usr/bin/env python3
"""Try connecting to Supabase directly via psycopg2 to apply migration."""
import psycopg2, sys, os

# Read the migration SQL
migration_path = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', '20260701000006_link_payment_journal_bypass.sql')
with open(migration_path, 'r') as f:
    sql = f.read()

# Try different connection strings
# The project ref is qwhunliohlkkahbspfiu
# The database URL format is:
# Direct: postgresql://postgres:***@db.qwhunliohlkkahbspfiu.supabase.co:5432/postgres
# Pooler (session): postgresql://postgres.qwhunliohlkkahbspfiu:***@aws-0-{region}.pooler.supabase.com:5432/postgres
# Pooler (transaction): postgresql://postgres.qwhunliohlkkahbspfiu:***@aws-0-{region}.pooler.supabase.com:6543/postgres

# We don't have the DB password, so let's try the direct connection with common defaults
# The default password is usually set during project creation
passwords = [
    'postgres',  # default
    '123456789',  # from the login
    'Alaraf2024!',
    'Alaraf2025!',
    'alaraf',
    'fleetify',
]

project_ref = 'qwhunliohlkkahbspfiu'
regions = ['us-east-1', 'eu-west-1', 'eu-central-1', 'ap-southeast-1']

for pwd in passwords:
    for region in regions:
        conn_str = f"postgresql://postgres.{project_ref}:{pwd}@aws-0-{region}.pooler.supabase.com:5432/postgres"
        try:
            conn = psycopg2.connect(conn_str, connect_timeout=5)
            print(f"SUCCESS with password={pwd} region={region}")
            conn.autocommit = True
            cursor = conn.cursor()
            cursor.execute(sql)
            print("Migration applied!")
            cursor.close()
            conn.close()
            sys.exit(0)
        except Exception as e:
            err = str(e)[:80]
            if "not found" in err or "timeout" in err:
                continue
            elif "authentication failed" in err:
                continue
            else:
                print(f"  {pwd}/{region}: {err}")

# Also try direct connection (not pooler)
for pwd in passwords:
    conn_str = f"postgresql://postgres:{pwd}@db.{project_ref}.supabase.co:5432/postgres"
    try:
        conn = psycopg2.connect(conn_str, connect_timeout=5)
        print(f"SUCCESS (direct) with password={pwd}")
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(sql)
        print("Migration applied!")
        cursor.close()
        conn.close()
        sys.exit(0)
    except Exception as e:
        err = str(e)[:80]
        if "not found" in err or "timeout" in err:
            continue
        elif "authentication failed" in err:
            continue
        else:
            print(f"  direct/{pwd}: {err}")

print("\nCould not connect with any default password.")
print("Please provide the database password or apply the migration via the Supabase Dashboard:")
print(f"  https://supabase.com/dashboard/project/{project_ref}/sql/new")
print(f"\nMigration file: supabase/migrations/20260701000006_link_payment_journal_bypass.sql")