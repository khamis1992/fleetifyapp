#!/bin/bash
cd /c/Users/khamis/Documents/fleetifyapp
SRK=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d'"' -f2)
BASE="https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"

# Get total count of journal_entry_lines
curl -s "$BASE/journal_entry_lines?select=id&limit=1" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" \
  -H "Prefer: count=exact" \
  -D /tmp/jel_headers.txt > /dev/null

grep -i content-range /tmp/jel_headers.txt

# Get total count of journal_entries
curl -s "$BASE/journal_entries?select=id&limit=1" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" \
  -H "Prefer: count=exact" \
  -D /tmp/je_headers.txt > /dev/null

grep -i content-range /tmp/je_headers.txt

# Fetch ALL journal_entry_lines (paginate if needed)
curl -s "$BASE/journal_entry_lines?select=journal_entry_id,debit_amount,credit_amount&limit=10000" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" > /tmp/jel_all.json

echo "Fetched $(python3 -c 'import json; print(len(json.load(open("C:/Users/khamis/AppData/Local/Temp/jel_all.json"))))') JEL records"