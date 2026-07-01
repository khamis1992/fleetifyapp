#!/bin/bash
cd /c/Users/khamis/Documents/fleetifyapp
SRK=$(grep VITE_SUPABASE_SERVICE_ROLE_KEY .env | cut -d'"' -f2)
BASE="https://qwhunliohlkkahbspfiu.supabase.co/rest/v1"

# Fetch the 6 unbalanced JEs by ID
JE_IDS="b7744eaa-d50c-4b18-9473-819322e10eb3,0103211b-4392-4635-a6c9-cf6d4d0ffefb,7e356950-aa35-4843-b2eb-5936094ae600,2daa5a6b-f1f6-4a95-9e06-7ac2a165e428,4be61de7-e8dc-4257-b3c7-3af995aa4ec4,8c315386-58d5-4ab6-a22e-dad353b3f6c3"

# Get JE headers
curl -s "$BASE/journal_entries?select=id,entry_number,entry_date,description,status,total_debit,total_credit,reference_type,reference_id,company_id&id=in.($JE_IDS)" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" > /tmp/unbalanced_jes.json

# Get JE lines for these entries
curl -s "$BASE/journal_entry_lines?select=id,journal_entry_id,account_id,debit_amount,credit_amount,line_number,line_description&journal_entry_id=in.($JE_IDS)" \
  -H "apikey: $SRK" \
  -H "Authorization: Bearer $SRK" > /tmp/unbalanced_jel.json

# Get the accounts used in these lines
python3 -c "
import json
TMP = r'C:\Users\khamis\AppData\Local\Temp'
jes = json.load(open(f'{TMP}\\unbalanced_jes.json'))
jels = json.load(open(f'{TMP}\\unbalanced_jel.json'))
print('=== UNBALANCED JEs ===')
for je in jes:
    print(f\"{je['entry_number']}: id={je['id']}\")
    print(f\"  desc={je.get('description')} status={je.get('status')} ref_type={je.get('reference_type')} ref_id={je.get('reference_id')}\")
    print(f\"  total_debit={je.get('total_debit')} total_credit={je.get('total_credit')}\")
    print(f\"  company_id={je.get('company_id','?')[:8]}...\")
    # Find lines for this JE
    lines = [l for l in jels if l.get('journal_entry_id') == je['id']]
    for l in lines:
        print(f\"  Line {l.get('line_number')}: account={l.get('account_id','?')[:8]}... D={l.get('debit_amount')} C={l.get('credit_amount')} desc={l.get('line_description')}\")
    diff = float(je.get('total_debit',0)) - float(je.get('total_credit',0))
    print(f\"  HEADER diff={diff:.2f}\")
    line_sum_d = sum(float(l.get('debit_amount') or 0) for l in lines)
    line_sum_c = sum(float(l.get('credit_amount') or 0) for l in lines)
    print(f\"  LINE sum: D={line_sum_d:.2f} C={line_sum_c:.2f} diff={line_sum_d-line_sum_c:.2f}\")
    print()
"