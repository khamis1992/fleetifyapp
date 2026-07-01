import json
TMP = r'C:\Users\khamis\AppData\Local\Temp'
coa = json.load(open(f'{TMP}\\coa.json'))
invalid = [a for a in coa if a.get('account_type') not in ('assets','liabilities','equity','revenue','expense')]
print(f'Invalid account types ({len(invalid)}):')
types = set(a.get('account_type') for a in invalid)
print(f'Unique invalid types: {types}')
for a in invalid[:10]:
    print(f'  {a.get("account_code")}: name={a.get("account_name")} type={a.get("account_type")} balance_type={a.get("balance_type")}')

# Also check revenue balance sign
print()
print('Revenue accounts with negative balance (credit balance = normal):')
rev_neg = [a for a in coa if a.get('account_type')=='revenue' and float(a.get('current_balance') or 0) < 0]
print(f'  Count: {len(rev_neg)}')
for a in rev_neg[:5]:
    print(f'  {a.get("account_code")} {a.get("account_name")}: {a.get("current_balance")}')

print()
print('Asset accounts with positive balance (debit balance = normal):')
ast_pos = [a for a in coa if a.get('account_type')=='assets' and float(a.get('current_balance') or 0) > 0]
print(f'  Count: {len(ast_pos)}')
for a in ast_pos[:5]:
    print(f'  {a.get("account_code")} {a.get("account_name")}: {a.get("current_balance")}')

# Check the 11 duplicate payments
print()
pay = json.load(open(f'{TMP}\\pay.json'))
from collections import defaultdict
pg = defaultdict(list)
for p in pay: pg[(p.get('amount'),p.get('payment_date'))].append(p)
dups = {k:v for k,v in pg.items() if len(v)>1 and k[0]}
print(f'Duplicate payments ({len(dups)}):')
for (amt,date),ps in list(dups)[:5]:
    print(f'  Amount={amt} Date={date}: {len(ps)} payments, IDs: {[p.get("id","")[:8] for p in ps]}')

# Check the 16 unlinked payments
print()
print('Payments without journal_entry_id:')
pay_no = [p for p in pay if not p.get('journal_entry_id')]
for p in pay_no[:5]:
    print(f'  {p.get("payment_number","?")}: amount={p.get("amount")} status={p.get("payment_status")} date={p.get("payment_date")}')

# Check the 66 unlinked invoices
print()
inv = json.load(open(f'{TMP}\\inv.json'))
inv_no = [i for i in inv if not i.get('journal_entry_id')]
print(f'Invoices without journal_entry_id ({len(inv_no)}):')
for i in inv_no[:5]:
    print(f'  {i.get("invoice_number","?")}: total={i.get("total_amount")} status={i.get("payment_status")}')