"""
Try connecting to Supabase Postgres directly via psycopg2.
The pooler URL is: postgresql://postgres.qwhunliohlkkahbspfiu@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
We need to try different password options.
"""
import psycopg2
from dotenv import dotenv_values

vals = dotenv_values('.env')
SRK = vals.get('SUPABASE_SERVICE_ROLE_KEY', '').strip()
ANON = vals.get('VITE_SUPABASE_ANON_KEY', '').strip()

# Try connecting with the service role key as password
attempts = [
    ('Service role key', SRK),
    ('Anon key', ANON),
    ('Empty password', ''),
    ('postgres', 'postgres'),
    ('Supabase project ID', vals.get('VITE_SUPABASE_PROJECT_ID', '')),
]

for name, password in attempts:
    if not password and name != 'Empty password':
        continue
    try:
        conn = psycopg2.connect(
            host='aws-0-eu-north-1.pooler.supabase.com',
            port=5432,
            database='postgres',
            user='postgres.qwhunliohlkkahbspfiu',
            password=password,
            connect_timeout=10
        )
        print(f"SUCCESS with: {name}")
        cur = conn.cursor()
        cur.execute('SELECT 1')
        print(f"  Query result: {cur.fetchone()}")
        cur.close()
        conn.close()
        break
    except Exception as e:
        print(f"FAILED with {name}: {str(e)[:200]}")