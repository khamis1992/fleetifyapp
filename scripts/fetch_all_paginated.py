#!/usr/bin/env python3
"""Fetch all JEs and JELs from Supabase using Range header pagination."""
import json, os, urllib.request

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_SERVICE_ROLE_KEY='):
            SRK = line.split('"')[1]
            break

BASE = "https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"
TMP = 'C:/Users/khamis/AppData/Local/Temp'

def fetch_range(url, start, end):
    req = urllib.request.Request(url, headers={
        'apikey': SRK,
        'Authorization': f'Bearer {SRK}',
        'Range': f'{start}-{end}',
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        cr = resp.headers.get('Content-Range', '')
        return data, cr

def fetch_all(table_query):
    all_data = []
    batch = 1000
    start = 0
    while True:
        end = start + batch - 1
        data, cr = fetch_range(f"{BASE}/{table_query}", start, end)
        all_data.extend(data)
        print(f"  Fetched {len(data)} (total so far: {len(all_data)}) range={start}-{end} cr={cr}")
        if len(data) < batch:
            break
        start += batch
    return all_data

print("Fetching ALL journal_entries...")
jes = fetch_all("journal_entries?select=id,entry_number,total_debit,total_credit,status,entry_date,reference_type,company_id")
print(f"  Total JEs: {len(jes)}")
with open(f'{TMP}/je_all.json', 'w') as f:
    json.dump(jes, f)

print("Fetching ALL journal_entry_lines...")
jels = fetch_all("journal_entry_lines?select=journal_entry_id,debit_amount,credit_amount,line_number")
print(f"  Total JELs: {len(jels)}")
with open(f'{TMP}/jel_all.json', 'w') as f:
    json.dump(jels, f)

print("Done.")