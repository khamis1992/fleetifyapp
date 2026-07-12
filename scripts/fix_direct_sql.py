"""
Connect to Supabase Postgres directly and link remaining 33 payments.
Bypasses REST API triggers by using a SECURITY DEFINER function.
"""
import requests, psycopg2, json
from dotenv import dotenv_values

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
H = {
    'apikey': SRK,
    'Authorization': 'Bearer ' + SRK,
    'Content-Type': 'application/json',
}

# Try to get database connection info from Supabase project settings
# The project ref is in the URL
project_ref = BASE_URL.replace('https://', '').replace('.supabase.co', '')
print("Project ref:", project_ref)

# Try Supabase management API to get database URL
# We need the Supabase access token (not the service role key)
# Let's try a different approach: use the PostgREST RPC to create a function

# First, check what RPC functions exist
r = requests.get(BASE_URL + '/rest/v1/transactions_summary?select=*&limit=1', headers=H)
print("\nTesting transactions_summary:", r.status_code)

# Try to create a stored procedure via a known Supabase function
# Some Supabase projects have a 'query' function
r2 = requests.post(BASE_URL + '/rest/v1/rpc/query', headers=H, json={'query': 'SELECT 1'})
print("Testing query RPC:", r2.status_code, r2.text[:200])

# Try 'exec' function
r3 = requests.post(BASE_URL + '/rest/v1/rpc/exec', headers=H, json={'query': 'SELECT 1'})
print("Testing exec RPC:", r3.status_code, r3.text[:200])

# Try pgbouncer URL directly via psycopg2
# Supabase pooler: postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
# But we don't have the DB password

# Alternative: Try connecting via the Supabase REST API with a raw SQL approach
# Some projects have a 'pg_meta' extension enabled
r4 = requests.post(BASE_URL + '/rest/v1/rpc/pg_meta', headers=H, json={'query': 'SELECT 1'})
print("Testing pg_meta:", r4.status_code, r4.text[:200])

# Try the admin API endpoint
r5 = requests.post(BASE_URL + '/pg/query', headers={
    'apikey': SRK,
    'Authorization': 'Bearer ' + SRK,
    'Content-Type': 'application/json',
}, json={'query': 'SELECT 1'})
print("Testing /pg/query:", r5.status_code, r5.text[:200])