#!/bin/bash
cd /c/Users/khamis/Documents/fleetifyapp
SRK=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d'"' -f2)
BASE="https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"

# Fetch ALL JEs (4519 total) — paginate with range headers
curl -s "$BASE/journal_entries?select=id,entry_number,total_debit,total_credit,status,entry_date,reference_type,company_id&limit=5000" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer *** > /tmp/je_all.json

# Fetch ALL JELs (9024 total) — paginate with range headers
curl -s "$BASE/journal_entry_lines?select=journal_entry_id,debit_amount,credit_amount,line_number&limit=10000" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer *** > /tmp/jel_all.json

echo "JEs: $(python3 -c 'import json; print(len(json.load(open("C:/Users/khamis/AppData/Local/Temp/je_all.json"))))')"
echo "JELs: $(python3 -c 'import json; print(len(json.load(open("C:/Users/khamis/AppData/Local/Temp/jel_all.json"))))')"