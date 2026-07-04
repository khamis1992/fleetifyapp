import json
from collections import defaultdict
TMP = r'C:\Users\khamis\AppData\Local\Temp'
with open(f'{TMP}\\jel.json') as f:
    jel = json.load(f)
with open(f'{TMP}\\je.json') as f:
    je = json.load(f)

je_sums = defaultdict(lambda: {'d':0,'c':0,'n':0})
for l in jel:
    jid = l.get('journal_entry_id')
    if jid:
        je_sums[jid]['d'] += float(l.get('debit_amount') or 0)
        je_sums[jid]['c'] += float(l.get('credit_amount') or 0)
        je_sums[jid]['n'] += 1

unbalanced = [(jid,s) for jid,s in je_sums.items() if abs(s['d']-s['c'])>0.01]
je_map = {e['id']: e for e in je}

for jid, s in unbalanced:
    e = je_map.get(jid, {})
    diff = s['d'] - s['c']
    print(f'JE ID: {jid}')
    print(f'  Entry: {e.get("entry_number","?")} status={e.get("status","?")} desc={e.get("description","?")}')
    print(f'  total_debit={e.get("total_debit","?")} total_credit={e.get("total_credit","?")}')
    print(f'  Lines: {s["n"]} lines, sum_debit={s["d"]:.2f} sum_credit={s["c"]:.2f} diff={diff:.2f}')
    for l in jel:
        if l.get('journal_entry_id') == jid:
            print(f'  Line: account={l.get("account_id","?")[:8]}... debit={l.get("debit_amount")} credit={l.get("credit_amount")} desc={l.get("line_description")}')
    print()
