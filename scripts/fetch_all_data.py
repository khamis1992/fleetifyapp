#!/usr/bin/env python3
"""Fetch all JEs and JELs from Supabase, paginating properly."""
import json, os, urllib.request, urllib.error

# Read service role key
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break
    else:
        print("ERROR: Could not find service role key")
        exit(1)

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"

def fetch(url):
    req = urllib.request.Request(url, headers={
        'apikey': SRK,
        'Authorization': f'Bearer {SRK}',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

TMP = 'C:/Users/khamis/AppData/Local/Temp'

# Fetch all JEs (limit 5000 — should cover 4519)
print("Fetching journal_entries...")
jes = fetch(f"{BASE}/journal_entries?select=id,entry_number,total_debit,total_credit,status,entry_date,reference_type,company_id&limit=5000")
print(f"  Got {len(jes)} JEs")
with open(f'{TMP}/je_all.json', 'w') as f:
    json.dump(jes, f)

# Fetch all JELs (limit 10000 — should cover 9024)
print("Fetching journal_entry_lines...")
jels = fetch(f"{BASE}/journal_entry_lines?select=journal_entry_id,debit_amount,credit_amount,line_number&limit=10000")
print(f"  Got {len(jels)} JELs")
with open(f'{TMP}/jel_all.json', 'w') as f:
    json.dump(jels, f)

print("Done.")