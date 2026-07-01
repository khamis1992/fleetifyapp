import json
TMP = 'C:/Users/khamis/AppData/Local/Temp'
jes = json.load(open(f'{TMP}/unbalanced_jes.json'))
jels = json.load(open(f'{TMP}/unbalanced_jel.json'))
print('=== UNBALANCED JEs ===')
for je in jes:
    print(f"{je['entry_number']}: id={je['id']}")
    print(f"  desc={je.get('description')} status={je.get('status')} ref_type={je.get('reference_type')} ref_id={je.get('reference_id')}")
    print(f"  total_debit={je.get('total_debit')} total_credit={je.get('total_credit')}")
    print(f"  company_id={je.get('company_id','?')[:8]}...")
    lines = [l for l in jels if l.get('journal_entry_id') == je['id']]
    for l in lines:
        print(f"  Line {l.get('line_number')}: account={l.get('account_id','?')[:8]}... D={l.get('debit_amount')} C={l.get('credit_amount')} desc={l.get('line_description')}")
    diff = float(je.get('total_debit',0)) - float(je.get('total_credit',0))
    print(f"  HEADER diff={diff:.2f}")
    line_sum_d = sum(float(l.get('debit_amount') or 0) for l in lines)
    line_sum_c = sum(float(l.get('credit_amount') or 0) for l in lines)
    print(f"  LINE sum: D={line_sum_d:.2f} C={line_sum_c:.2f} diff={line_sum_d-line_sum_c:.2f}")
    print()