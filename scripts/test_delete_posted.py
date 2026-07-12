"""
Test: Can we change posted entries to draft, then delete?
"""
import requests, time
from dotenv import dotenv_values

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL','').strip()
API_KEY = vals.get("SUPABASE_SERVICE_ROLE_KEY","").strip()
HEADERS = {
    'apikey': API_KEY,
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Get a RETRO entry
r = requests.get(f'{BASE_URL}/rest/v1/journal_entries?select=id,entry_number,status&entry_number=like.RETRO%25&limit=1', headers=HEADERS)
entry = r.json()[0]
entry_id = entry['id']
print(f"Test entry: {entry['entry_number']} (status={entry['status']}, id={entry_id})")

# Try to change status to draft
print("\n1. Try PATCH status -> draft...")
r1 = requests.patch(f'{BASE_URL}/rest/v1/journal_entries?id=eq.{entry_id}', headers=HEADERS, json={'status': 'draft'})
print(f"   Status: {r1.status_code}")
print(f"   Response: {r1.text[:300]}")

# If that worked, try deleting lines
if r1.status_code == 200:
    print("\n2. Try DELETE lines (after status=draft)...")
    r2 = requests.delete(f'{BASE_URL}/rest/v1/journal_entry_lines?journal_entry_id=eq.{entry_id}', headers=HEADERS)
    print(f"   Status: {r2.status_code}")
    print(f"   Response: {r2.text[:300]}")
    
    if r2.status_code in (200, 204):
        print("\n3. Try DELETE entry...")
        r3 = requests.delete(f'{BASE_URL}/rest/v1/journal_entries?id=eq.{entry_id}', headers=HEADERS)
        print(f"   Status: {r3.status_code}")
        print(f"   Response: {r3.text[:300]}")

# If patch failed, try using RPC to delete
if r1.status_code != 200:
    print("\n4. Try RPC call to delete zero-amount entry...")
    # Try calling an RPC function if one exists
    r4 = requests.post(f'{BASE_URL}/rest/v1/rpc/delete_journal_entry', headers=HEADERS, json={'entry_id': entry_id})
    print(f"   Status: {r4.status_code}")
    print(f"   Response: {r4.text[:300]}")