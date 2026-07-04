#!/usr/bin/env python3
import json
from collections import defaultdict

TMP = 'C:/Users/khamis/AppData/Local/Temp'
with open(f'{TMP}/je_all.json') as f:
    je = json.load(f)
with open(f'{TMP}/jel_all.json') as f:
    jel = json.load(f)

je_sums = defaultdict(lambda: {'d':0,'c':0,'n':0})
for l in jel:
    jid = l.get('journal_entry_id')
    if jid:
        je_sums[jid]['d'] += float(l.get('debit_amount') or 0)
        je_sums[jid]['c'] += float(l.get('credit_amount') or 0)
        je_sums[jid]['n'] += 1

je_ids = set(e['id'] for e in je)
no_lines = je_ids - set(je_sums.keys())
je_map = {e['id']: e for e in je}

print("7 JEs without any lines:")
for jid in no_lines:
    e = je_map.get(jid, {})
    print(f"  {e.get('entry_number','?')}: status={e.get('status','?')} D={e.get('total_debit','?')} C={e.get('total_credit','?')} desc={e.get('description','?')[:60]}")

print("\n38 Zero-amount JEs (first 10):")
zeros = [e for e in je if float(e.get('total_debit',0))==0 and float(e.get('total_credit',0))==0]
for e in zeros[:10]:
    print(f"  {e.get('entry_number','?')}: status={e.get('status','?')} ref_type={e.get('reference_type','?')} desc={e.get('description','?')[:60]}")

print(f"\n352 Draft JEs (first 5):")
drafts = [e for e in je if e.get('status')=='draft']
for e in drafts[:5]:
    print(f"  {e.get('entry_number','?')}: D={e.get('total_debit','?')} C={e.get('total_credit','?')} desc={e.get('description','?')[:60]}")

print(f"\n34 Reversed JEs (first 5):")
reversed_ = [e for e in je if e.get('status')=='reversed']
for e in reversed_[:5]:
    print(f"  {e.get('entry_number','?')}: D={e.get('total_debit','?')} C={e.get('total_credit','?')} desc={e.get('description','?')[:60]}")
