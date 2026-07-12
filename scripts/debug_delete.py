"""Debug delete failure - get a real zero-amount entry."""
import requests, time
from dotenv import dotenv_values
from collections import defaultdict

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL','').strip()
API_KEY = vals.get('SUPABASE_SERVICE_ROLE_KEY','').strip()
HEADERS = {
    'apikey': API_KEY,
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Fetch entries with RETRO in name
r = requests.get(f'{BASE_URL}/rest/v1/journal_entries?select=id,entry_number,status&entry_number=like.RETRO%25&limit=2', headers=HEADERS)
print(f'GET status: {r.status_code}')
print(f'GET response: {r.text[:500]}')

if r.status_code == 200 and r.json():
    entry = r.json()[0]
    entry_id = entry['id']
    entry_number = entry['entry_number']
    print(f'\nTrying to delete: {entry_number} (id={entry_id})')
    
    # First delete its lines
    r_lines = requests.delete(f'{BASE_URL}/rest/v1/journal_entry_lines?journal_entry_id=eq.{entry_id}', headers=HEADERS)
    print(f'DELETE lines status: {r_lines.status_code}')
    print(f'DELETE lines response: {r_lines.text[:500]}')
    
    # Then delete the entry
    r2 = requests.delete(f'{BASE_URL}/rest/v1/journal_entries?id=eq.{entry_id}', headers=HEADERS)
    print(f'DELETE entry status: {r2.status_code}')
    print(f'DELETE entry response: {r2.text[:500]}')
else:
    # Try fetching all entries and find RETRO ones
    print('\nFetching all entries to find RETRO ones...')
    all_entries = []
    offset = 0
    while True:
        url = f'{BASE_URL}/rest/v1/journal_entries?select=id,entry_number,status&limit=1000&offset={offset}'
        r = requests.get(url, headers=HEADERS)
        if r.status_code != 200:
            break
        rows = r.json()
        all_entries.extend(rows)
        if len(rows) < 1000:
            break
        offset += 1000
        time.sleep(0.05)
    retro_entries = [e for e in all_entries if 'RETRO' in (e.get('entry_number') or '')]
    print(f'Found {len(retro_entries)} RETRO entries out of {len(all_entries)} total')
    if retro_entries:
        entry = retro_entries[0]
        entry_id = entry['id']
        print(f'\nTrying to delete: {entry["entry_number"]} (id={entry_id})')
        
        # Delete lines first
        r_lines = requests.delete(f'{BASE_URL}/rest/v1/journal_entry_lines?journal_entry_id=eq.{entry_id}', headers=HEADERS)
        print(f'DELETE lines status: {r_lines.status_code}')
        print(f'DELETE lines response: {r_lines.text[:500]}')
        
        # Then delete entry
        r2 = requests.delete(f'{BASE_URL}/rest/v1/journal_entries?id=eq.{entry_id}', headers=HEADERS)
        print(f'DELETE entry status: {r2.status_code}')
        print(f'DELETE entry response: {r2.text[:500]}')