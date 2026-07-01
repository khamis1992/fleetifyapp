import json
from collections import defaultdict
TMP = r'C:\Users\khamis\AppData\Local\Temp'
pay = json.load(open(f'{TMP}\\pay.json'))

pg = defaultdict(list)
for p in pay:
    key = (str(p.get('amount')), str(p.get('payment_date')))
    pg[key].append(p)
dups = {k:v for k,v in pg.items() if len(v)>1 and k[0] != 'None'}
print(f'Duplicate payments ({len(dups)}):')
for key, ps in list(dups.items())[:5]:
    print(f'  Amount={key[0]} Date={key[1]}: {len(ps)} payments')
    for p in ps:
        print(f'    ID={p.get("id","")[:8]} num={p.get("payment_number","?")} status={p.get("payment_status")} customer={p.get("customer_id","")[:8]}')

print()
print('Payments without journal_entry_id:')
pay_no = [p for p in pay if not p.get('journal_entry_id')]
print(f'Count: {len(pay_no)}')
for p in pay_no[:5]:
    print(f'  {p.get("payment_number","?")}: amount={p.get("amount")} status={p.get("payment_status")} date={p.get("payment_date")}')

print()
inv = json.load(open(f'{TMP}\\inv.json'))
inv_no = [i for i in inv if not i.get('journal_entry_id')]
print(f'Invoices without journal_entry_id ({len(inv_no)}):')
for i in inv_no[:5]:
    print(f'  {i.get("invoice_number","?")}: total={i.get("total_amount")} status={i.get("payment_status")} type={i.get("invoice_type")}')

# Check the 6 unbalanced JEL
print()
jel = json.load(open(f'{TMP}\\jel.json'))
je_sums = defaultdict(lambda: {'d':0,'c':0,'n':0})
for l in jel:
    jid = l.get('journal_entry_id')
    if jid:
        je_sums[jid]['d'] += float(l.get('debit_amount') or 0)
        je_sums[jid]['c'] += float(l.get('credit_amount') or 0)
        je_sums[jid]['n'] += 1

unbalanced = [(jid,s) for jid,s in je_sums.items() if abs(s['d']-s['c'])>0.01]
print(f'Unbalanced JEL ({len(unbalanced)}):')
for jid,s in unbalanced:
    print(f'  JE {jid[:8]}...: D={s["d"]:.2f} C={s["c"]:.2f} diff={s["d"]-s["c"]:.2f} lines={s["n"]}')

# The 6 single-line JEs
single = [(jid,s) for jid,s in je_sums.items() if s['n']<2]
print(f'\nSingle-line JEs ({len(single)}):')
for jid,s in single:
    print(f'  JE {jid[:8]}...: D={s["d"]:.2f} C={s["c"]:.2f} lines={s["n"]}')