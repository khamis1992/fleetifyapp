#!/usr/bin/env python3
"""Full audit with complete data set."""
import json
from collections import defaultdict

TMP = 'C:/Users/khamis/AppData/Local/Temp'
with open(f'{TMP}/je_all.json') as f:
    je = json.load(f)
with open(f'{TMP}/jel_all.json') as f:
    jel = json.load(f)

print('='*80)
print('FLEETIFY CFO AUDIT \u00e2\u20ac\u201d FULL DATA (4,519 JEs, 9,024 JELs)')
print('='*80)

# Domain 1: Double-Entry Integrity
print('\nDOMAIN 1: DOUBLE-ENTRY INTEGRITY')
print('-'*60)

# 1a: Header balance
unbalanced_header = [e for e in je if abs(float(e.get('total_debit',0))-float(e.get('total_credit',0)))>0.01]
print(f'1a. Header balance: {len(je)} JEs, {len(unbalanced_header)} unbalanced')
if unbalanced_header:
    for e in unbalanced_header[:10]:
        print(f'    CRITICAL: {e["entry_number"]}: D={e["total_debit"]} C={e["total_credit"]} diff={float(e["total_debit"])-float(e["total_credit"]):.2f}')
else:
    print('  PASS: All headers balanced.')

# 1b: Line balance
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
    for jid,s in unbalanced_lines[:10]:
        print(f'    CRITICAL: {jid[:8]}... D={s["d"]:.2f} C={s["c"]:.2f} diff={s["d"]-s["c"]:.2f} lines={s["n"]}')
else:
    print('  PASS: All lines balanced.')

# 1c: JEs without lines
je_ids = set(e['id'] for e in je)
no_lines = je_ids - set(je_sums.keys())
print(f'1c. JEs without ANY lines: {len(no_lines)}')

# 1d: Single-line JEs
single = [jid for jid,s in je_sums.items() if s['n']<2]
print(f'1d. JEs with <2 lines: {len(single)}')

# 1e: Zero-amount JEs
zeros = [e for e in je if float(e.get('total_debit',0))==0 and float(e.get('total_credit',0))==0]
print(f'1e. Zero-amount JEs: {len(zeros)}')

# 1f: Status
st = defaultdict(int)
for e in je: st[e.get('status','?')] += 1
print(f'1f. Status: {dict(st)}')

# Summary
critical = len(unbalanced_header) + len(unbalanced_lines) + len(single)
high = len(no_lines)
medium = len(zeros)
print(f'\n  CRITICAL: {critical} (unbalanced headers={len(unbalanced_header)}, unbalanced lines={len(unbalanced_lines)}, single-line={len(single)})')
print(f'  HIGH: {high} (JEs without lines)')
print(f'  MEDIUM: {medium} (zero-amount)')
risk = 'CRITICAL' if critical > 0 else 'HIGH' if high > 0 else 'MEDIUM' if medium > 0 else 'LOW'
print(f'  Overall: {risk}')
