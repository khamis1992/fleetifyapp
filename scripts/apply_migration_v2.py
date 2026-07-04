#!/usr/bin/env python3
"""Apply migration via Supabase Management API (requires access token)."""
import requests, json, os, sys
from dotenv import dotenv_values

vals = dotenv_values('.env')
SUPABASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()

# Extract project ref from URL
import re
match = re.search(r'https?://([a-z0-9]+)\.supabase\.(co|in)', SUPABASE_URL)
if not match:
    print("Could not extract project ref from URL")
    sys.exit(1)
project_ref = match.group(1)
print(f"Project ref: {project_ref}")

# Try using the Supabase SQL endpoint
# The /pg/exec endpoint might work with the service role key
SRK = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()

# Read the migration SQL
migration_path = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'migrations', '20260701000006_link_payment_journal_bypass.sql')
with open(migration_path, 'r') as f:
    sql = f.read()

# Method 1: Try the pg_dump endpoint (management API)
# This needs a personal access token, not the service role key
PAT = vals.get('SUPABASE_ACCESS_TOKEN', '').strip()
if PAT:
    print("Trying Management API...")
    headers = {
        'Authorization': f'Bearer {PAT}',
        'Content-Type': 'application/json'
    }
    r = requests.post(
        f'https://api.supabase.com/v1/projects/{project_ref}/database/query',
        data=json.dumps({'query': sql}).encode('utf-8'),
        headers=headers
    )
    print(f"  Status: {r.status_code}")
    print(f"  Response: {r.text[:300]}")
else:
    print("No SUPABASE_ACCESS_TOKEN found in .env")

# Method 2: Try /rest/v1/rpc with the service role key
# Some Supabase projects have a built-in exec function
# Let's try creating the function via a POST to the REST API
# Actually, we can create a temporary function that executes SQL

# Method 3: Use the PostgREST schema cache refresh
# We can try to create the function using a different approach

# Method 4: Try the Supabase SQL endpoint directly
print("\nTrying /pg endpoint...")
r = requests.post(
    f'{SUPABASE_URL}/pg/exec',
    data=json.dumps({'query': sql}).encode('utf-8'),
    headers={
        'apikey': SRK,
        'Authorization': f'Bearer {SRK}',
        'Content-Type': 'application/json'
    }
)
print(f"  Status: {r.status_code}")
print(f"  Response: {r.text[:300]}")

# Method 5: Try using the database connection directly via psycopg2
print("\nTrying direct Postgres connection...")
try:
    import psycopg2
    # The connection string for Supabase is:
    # postgresql://postgres.[ref]:password@aws-0-[region].pooler.supabase.com:5432/postgres
    # We don't have the password, but let's try the direct URL
    # The project ref is in the URL
    # For the pooler, it's usually:
    # postgresql://postgres.{ref}:{password}@aws-0-{region}.pooler.supabase.com:6543/postgres

    # Try Session Mode (port 5432) or Transaction Mode (port 6543)
    # Without the password, we can't connect directly
    print("  No database password available in .env")
    print("  Please either:")
    print("  1. Add SUPABASE_DB_PASSWORD to .env, or")
    print("  2. Apply the migration via the Supabase Dashboard SQL Editor")
    print(f"  3. The migration file is at: supabase/migrations/20260701000006_link_payment_journal_bypass.sql")
except ImportError:
    print("  psycopg2 not available")

print("\n" + "="*60)
print("SUMMARY: The migration SQL has been written to:")
print(f"  supabase/migrations/20260701000006_link_payment_journal_bypass.sql")
print("Please apply it via the Supabase Dashboard SQL Editor:")
print(f"  https://supabase.com/dashboard/project/{project_ref}/sql/new")
print("Then run the payment linking script.")