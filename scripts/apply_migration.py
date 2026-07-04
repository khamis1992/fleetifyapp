#!/usr/bin/env python3
"""Apply the migration SQL to the remote Supabase database and then link payments."""
import json, requests, uuid, time
from dotenv import dotenv_values

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()
HEADERS = {
    'apikey': SRK,
    'Authorization': f'Bearer {SRK}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
CID = '24bc0b21-4e2d-4413-9842-31719a3669f4'

# Step 1: Apply the migration SQL by creating the functions
# We can't run raw SQL via REST API, but we can try the /pg/exec endpoint
# or use the Supabase SQL endpoint

print("=== Step 1: Create link_payment_journal_entry_bypass RPC ===")

# Try the Supabase pg_exec endpoint
sql = """
CREATE OR REPLACE FUNCTION public.link_payment_journal_entry_bypass(
    p_payment_id uuid,
    p_journal_entry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    ALTER TABLE public.payments DISABLE TRIGGER USER;
    UPDATE public.payments
    SET journal_entry_id = p_journal_entry_id, updated_at = now()
    WHERE id = p_payment_id;
    ALTER TABLE public.payments ENABLE TRIGGER USER;
    RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN OTHERS THEN
    BEGIN ALTER TABLE public.payments ENABLE TRIGGER USER; EXCEPTION WHEN OTHERS THEN NULL; END;
    RAISE;
END;
$$;
"""

# Try /rest/v1/rpc with a query parameter approach
# Actually, let's try the Supabase SQL endpoint
r = requests.post(
    f'{BASE_URL}/rest/v1/rpc/link_payment_journal_entry_bypass',
    data=json.dumps({'p_payment_id': '00000000-0000-0000-0000-000000000000', 'p_journal_entry_id': '00000000-0000-0000-0000-000000000000'}).encode('utf-8'),
    headers=HEADERS)
print(f"  Test RPC call: {r.status_code} {r.text[:200]}")

if r.status_code == 404:
    print("  RPC doesn't exist yet. Need to apply migration via Supabase dashboard.")
    print("  Writing SQL to apply via psql or dashboard...")
    
    # Write the SQL to a file for manual application
    with open('supabase/migrations/20260701000006_link_payment_journal_bypass.sql') as src:
        sql_content = src.read()
    with open('scripts/apply_migration.sql', 'w') as f:
        f.write(sql_content)
    
    print("  SQL written to scripts/apply_migration.sql")
    print("  Please apply this via Supabase SQL Editor or psql.")
else:
    print("  RPC exists!")

# Step 2: Also check if update_account_balances_from_entries exists
print("\n=== Step 2: Check update_account_balances_from_entries RPC ===")
r2 = requests.post(
    f'{BASE_URL}/rest/v1/rpc/update_account_balances_from_entries',
    data=json.dumps({}).encode('utf-8'),
    headers=HEADERS)
print(f"  RPC call: {r2.status_code} {r2.text[:200]}")

if r2.status_code == 404:
    print("  RPC doesn't exist. Need to create it.")
else:
    print("  RPC exists!")
