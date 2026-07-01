#!/usr/bin/env python3
import json
from collections import defaultdict

TMP = r'C:\Users\khamis\AppData\Local\Temp'
je = json.load(open(f'{TMP}\\je.json'))
jel = json.load(open(f'{TMP}\\jel.json'))
coa = json.load(open(f'{TMP}\\coa.json'))
pay = json.load(open(f'{TMP}\\pay.json'))
inv = json.load(open(f'{TMP}\\inv.json'))

print('='*80)
print('FLEETIFY CFO-LEVEL FINANCIAL SYSTEM AUDIT REPORT')
print('Company: Al-Araf Car Rental')
print('='*80)

# DOMAIN 1: Double-Entry Integrity
print()
print('='*60)
print('DOMAIN 1: DOUBLE-ENTRY INTEGRITY')
print('='*60)

unbalanced_header = [e for e in je if abs(float(e.get('total_debit',0))-float(e.get('total_credit',0)))>0.01]
print(f'1a. Header balance: {len(je)} JEs, {len(unbalanced_header)} unbalanced')
if unbalanced_header:
    for e in unbalanced_header[:5]:
        print(f'    CRITICAL: {e["entry_number"]}: D={e["total_debit"]} C={e["total_credit"]}')
else:
    print('  PASS: All headers balanced.')

je_sums = defaultdict(lambda: {'d':0,'c':0,'n':0})
for l in jel:
    jid = l.get('journal_entry_id')
    if jid:
        je_sums[jid]['d'] += float(l.get('debit_amount') or 0)
        je_sums[jid]['c'] += float(l.get('credit_amount') or 0)
        je_sums[jid]['n'] += 1

unbalanced_lines = [(jid,s) for jid,s in je_sums.items() if abs(s['d']-s['c'])>0.01]
print(f'1b. Line balance: {len(je_sums)} JEs with lines, {len(unbalanced_lines)} unbalanced')
if unbalanced_lines:
    for jid,s in unbalanced_lines[:5]:
        print(f'    CRITICAL: {jid[:8]}... D={s["d"]:.2f} C={s["c"]:.2f} diff={s["d"]-s["c"]:.2f}')
else:
    print('  PASS: All lines balanced.')

je_ids = set(e['id'] for e in je)
no_lines = je_ids - set(je_sums.keys())
print(f'1c. JEs without lines: {len(no_lines)}')

single = [jid for jid,s in je_sums.items() if s['n']<2]
print(f'1d. JEs with <2 lines: {len(single)}')

zeros = [e for e in je if float(e.get('total_debit',0))==0 and float(e.get('total_credit',0))==0]
print(f'1e. Zero-amount JEs: {len(zeros)}')

st = defaultdict(int)
for e in je: st[e.get('status','?')] += 1
print(f'1f. Status: {dict(st)}')

# DOMAIN 2: CoA
print()
print('='*60)
print('DOMAIN 2: CHART OF ACCOUNTS')
print('='*60)
print(f'  Total: {len(coa)}')
types = defaultdict(int)
for a in coa: types[a.get('account_type','MISSING')] += 1
print(f'  Types: {dict(types)}')
invalid = [a for a in coa if a.get('account_type') not in ('assets','liabilities','equity','revenue','expense')]
print(f'  Invalid types: {len(invalid)}')
codes = [a.get('account_code') for a in coa if a.get('account_code')]
dupes = set([c for c in codes if codes.count(c)>1])
print(f'  Duplicate codes: {len(dupes)} {list(dupes)[:5] if dupes else ""}')
headers = [a for a in coa if a.get('is_header')]
print(f'  Headers: {len(headers)}, Postable: {len(coa)-len(headers)}')
inactive = [a for a in coa if a.get('is_active') is False]
print(f'  Inactive: {len(inactive)}')
by_id = {a.get('id'): a for a in coa}
circular = [a for a in coa if a.get('parent_account_id') and a.get('parent_account_id')==a.get('id')]
missing_parent = [a for a in coa if a.get('parent_account_id') and a.get('parent_account_id') not in by_id]
print(f'  Circular refs: {len(circular)}')
print(f'  Missing parents: {len(missing_parent)}')

# DOMAIN 3: GL Linkage
print()
print('='*60)
print('DOMAIN 3: GL LINKAGE')
print('='*60)
pay_je = [p for p in pay if p.get('journal_entry_id')]
pay_no = [p for p in pay if not p.get('journal_entry_id')]
print(f'3a. Payments: {len(pay)} total, {len(pay_je)} linked, {len(pay_no)} NOT linked')
inv_je = [i for i in inv if i.get('journal_entry_id')]
inv_no = [i for i in inv if not i.get('journal_entry_id')]
print(f'3b. Invoices: {len(inv)} total, {len(inv_je)} linked, {len(inv_no)} NOT linked')

# DOMAIN 4: Trial Balance
print()
print('='*60)
print('DOMAIN 4: TRIAL BALANCE')
print('='*60)
tb = defaultdict(float)
for a in coa: tb[a.get('account_type','?')] += float(a.get('current_balance') or 0)
print(f'  Balances: {dict(tb)}')
ta = tb.get('assets',0)
tl = tb.get('liabilities',0)
te = tb.get('equity',0)
diff = abs(ta-(tl+te))
print(f'  A={ta:,.2f} L={tl:,.2f} E={te:,.2f} L+E={tl+te:,.2f} diff={diff:,.2f}')
print(f'  {"PASS" if diff<0.01 else "FAIL"}: A = L + E')

# DOMAIN 5: AP/AR
print()
print('='*60)
print('DOMAIN 5: AP/AR')
print('='*60)
ps = defaultdict(int)
for p in pay: ps[p.get('payment_status','?')] += 1
print(f'5a. Payment status: {dict(ps)}')
ips = defaultdict(int)
for i in inv: ips[i.get('payment_status','?')] += 1
print(f'5b. Invoice status: {dict(ips)}')
pg = defaultdict(list)
for p in pay: pg[(p.get('amount'),p.get('payment_date'))].append(p)
dups = {k:v for k,v in pg.items() if len(v)>1 and k[0]}
print(f'5c. Duplicate payments: {len(dups)}')
issues = []
for i in inv:
    t = float(i.get('total_amount') or 0)
    pa = float(i.get('paid_amount') or 0)
    b = float(i.get('balance_due') or 0)
    if abs(b-(t-pa))>0.01: issues.append(i)
print(f'5d. Invoice balance mismatches: {len(issues)}')

# DOMAIN 6: Revenue Recognition
print()
print('='*60)
print('DOMAIN 6: REVENUE RECOGNITION')
print('='*60)
deferred = [a for a in coa if 'deferred' in (a.get('account_name','') or '').lower() or 'unearned' in (a.get('account_name','') or '').lower()]
print(f'6a. Deferred revenue accounts: {len(deferred)}')
if not deferred:
    print('  WARNING: No deferred revenue accounts — prepayments may be recognized immediately')

# DOMAIN 8: Internal Controls
print()
print('='*60)
print('DOMAIN 8: INTERNAL CONTROLS')
print('='*60)
drafts = [e for e in je if e.get('status')=='draft']
print(f'8a. Draft JEs: {len(drafts)}')
if drafts:
    for d in drafts[:5]:
        print(f'    {d["entry_number"]}: D={d["total_debit"]} C={d["total_credit"]}')

# SUMMARY
print()
print('='*80)
print('AUDIT SUMMARY')
print('='*80)
critical = len(unbalanced_header) + len(unbalanced_lines) + len(single)
high = len(pay_no) + len(inv_no)
medium = len(no_lines) + len(issues) + len(dups) + len(drafts)
low = len(zeros)
print(f'  CRITICAL: {critical}')
print(f'  HIGH: {high}')
print(f'  MEDIUM: {medium}')
print(f'  LOW: {low}')
risk = 'CRITICAL' if critical>0 else 'HIGH' if high>0 else 'MEDIUM' if medium>0 else 'LOW'
print(f'  Overall risk: {risk}')