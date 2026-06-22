#!/usr/bin/env python3
"""
Schema Audit Script v2 — Properly tracks which .from() each filter belongs to.
Fixes false positives from v1 by parsing query chains instead of window matching.
"""
import re, json, os
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).resolve().parent.parent
TYPES_PATH = BASE / "src" / "integrations" / "supabase" / "types.ts"
SRC_PATH = BASE / "src"
OUTPUT_PATH = BASE / "scripts" / "schema-audit-results-v2.json"

# ── 1. Parse types.ts ──
with open(TYPES_PATH, "r", encoding="utf-8") as f:
    types_content = f.read()

table_pattern = re.compile(r'^\s{6}(\w+):\s*\{\s*\n\s{8}Row:\s*\{([^}]+)\}', re.MULTILINE)
tables = {}
for m in table_pattern.finditer(types_content):
    table_name = m.group(1)
    row_block = m.group(2)
    col_pattern = re.compile(r'^\s{10,}(\w+):\s+', re.MULTILINE)
    cols = [cm.group(1) for cm in col_pattern.finditer(row_block)]
    if cols:
        tables[table_name] = set(cols)

print(f"Extracted {len(tables)} tables from types.ts")

# ── 2. Known corrections (only for tables where we KNOW the mismatch) ──
known_corrections = {
    "payments": {
        "status": "payment_status",
        "recorded_by": "created_by",
        "reconciled": "reconciliation_status",
        "reconciled_at": None,
        "reconciled_by": None,
        "idempotency_key": None,
    },
    "journal_entry_lines": {
        "description": "line_description",
        "debit": "debit_amount",
        "credit": "credit_amount",
        "company_id": None,
        "entry_id": "journal_entry_id",
        "account_code": "account_id",
    },
    "chart_of_accounts": {
        "level": "account_level",
        "parent_code": "parent_account_code",
        "account_name_en": "account_name",
    },
}

# ── 3. Parse query chains ──
# Strategy: for each file, find all .from('table') calls.
# Then track the query chain: after .from('table'), all subsequent
# .select/.eq/.neq/.in/.gte/.lte/.gt/.lt/.like/.ilike/.insert/.update/.upsert
# belong to that table UNTIL:
#   - A new .from() appears (new query)
#   - A semicolon at end of statement
#   - An await without .from (end of chain)
# We approximate by finding .from() and then scanning forward until the chain ends.

from_pattern = re.compile(r"\.from\(['\"](\w+)['\"]\)")
select_pattern = re.compile(r"\.select\(['\"]([^'\"]+)['\"]\)")
eq_pattern = re.compile(r"\.(?:eq|neq|in|gte|lte|gt|lt|like|ilike|cs|cd)\(['\"](\w+)['\"]")

# Chain-end markers: semicolon (end of statement), or a new .from(), or `await supabase` without chain
chain_end_markers = [';', 'await supabase', 'const {', 'const ', 'return supabase']

violations = []
file_count = 0

SKIP_DIRS = {'node_modules', 'dist', '__tests__', 'test', 'tests', '.git'}
SKIP_SUFFIXES = ('.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx')

for root, dirs, files in os.walk(SRC_PATH):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fname in files:
        if not (fname.endswith('.ts') or fname.endswith('.tsx')):
            continue
        if any(fname.endswith(s) for s in SKIP_SUFFIXES):
            continue
        if 'test' in fname.lower():
            continue

        fpath = os.path.join(root, fname)
        rel_path = os.path.relpath(fpath, SRC_PATH).replace('\\', '/')
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except:
            continue

        file_count += 1
        lines = content.split('\n')

        # Find all .from() calls with line numbers
        from_matches = list(from_pattern.finditer(content))
        
        for i, from_match in enumerate(from_matches):
            table_name = from_match.group(1)
            if table_name not in tables:
                continue
            
            corrections = known_corrections.get(table_name, {})
            if not corrections:
                continue

            # Determine the end of this query chain
            # Start from after .from() and scan forward
            chain_start = from_match.end()
            
            # Find the end: next .from() or end of statement (semicolon)
            chain_end = len(content)
            if i + 1 < len(from_matches):
                next_from_start = from_matches[i + 1].start()
                # Chain ends at the earlier of: next .from() or the semicolon after this chain
                # Find the first semicolon after chain_start
                semi_pos = content.find(';', chain_start)
                if semi_pos != -1 and semi_pos < next_from_start:
                    chain_end = semi_pos
                else:
                    chain_end = min(next_from_start, semi_pos if semi_pos != -1 else len(content))
            else:
                semi_pos = content.find(';', chain_start)
                if semi_pos != -1:
                    chain_end = semi_pos
            
            chain_text = content[chain_start:chain_end]
            chain_line_start = content[:chain_start].count('\n') + 1
            
            def find_line_number(pos_in_chain):
                return chain_line_start + chain_text[:pos_in_chain].count('\n')

            # ── Check .select() columns ──
            for sel_match in select_pattern.finditer(chain_text):
                select_str = sel_match.group(1)
                ln = find_line_number(sel_match.start())
                for part in select_str.split(','):
                    part = part.strip()
                    if '(' in part:
                        continue
                    col = part.split(':')[0].strip().split('::')[0].strip()
                    if col and col != '*' and not col.startswith('(') and not col.endswith(')'):
                        if col in corrections:
                            correct = corrections[col]
                            if correct is None:
                                violations.append({
                                    'file': rel_path, 'line': ln, 'table': table_name,
                                    'column': col, 'issue': 'COLUMN_DOES_NOT_EXIST',
                                    'suggestion': 'Remove this column',
                                })
                            elif col != correct:
                                violations.append({
                                    'file': rel_path, 'line': ln, 'table': table_name,
                                    'column': col, 'issue': 'WRONG_COLUMN_NAME',
                                    'suggestion': correct,
                                })

            # ── Check .eq/.neq/.in etc ──
            for op_match in eq_pattern.finditer(chain_text):
                col = op_match.group(1)
                ln = find_line_number(op_match.start())
                if col in corrections:
                    correct = corrections[col]
                    if correct is None:
                        violations.append({
                            'file': rel_path, 'line': ln, 'table': table_name,
                            'column': col, 'issue': 'FILTER_NONEXISTENT_COLUMN',
                            'suggestion': 'Remove this filter',
                        })
                    elif col != correct:
                        violations.append({
                            'file': rel_path, 'line': ln, 'table': table_name,
                            'column': col, 'issue': 'FILTER_WRONG_COLUMN_NAME',
                            'suggestion': correct,
                        })

            # ── Check .insert/.update/.upsert object keys ──
            for op_name in ['insert', 'update', 'upsert']:
                op_pattern = re.compile(r'\.' + op_name + r'\(\s*(\{)')
                for op_match in op_pattern.finditer(chain_text):
                    brace_start = op_match.end() - 1
                    depth = 0
                    obj_end = -1
                    for j in range(brace_start, len(chain_text)):
                        if chain_text[j] == '{':
                            depth += 1
                        elif chain_text[j] == '}':
                            depth -= 1
                            if depth == 0:
                                obj_end = j
                                break
                    if obj_end == -1:
                        continue
                    obj_str = chain_text[brace_start+1:obj_end]
                    obj_line = find_line_number(op_match.start())

                    key_pattern = re.compile(r'^\s*(\w+)\s*:', re.MULTILINE)
                    for key_match in key_pattern.finditer(obj_str):
                        key = key_match.group(1)
                        if key in corrections:
                            correct = corrections[key]
                            if correct is None:
                                violations.append({
                                    'file': rel_path, 'line': obj_line, 'table': table_name,
                                    'column': key, 'issue': f'{op_name.upper()}_NONEXISTENT_COLUMN',
                                    'suggestion': 'Remove this column',
                                })
                            elif key != correct:
                                violations.append({
                                    'file': rel_path, 'line': obj_line, 'table': table_name,
                                    'column': key, 'issue': f'{op_name.upper()}_WRONG_COLUMN_NAME',
                                    'suggestion': correct,
                                })

# ── 4. Deduplicate & summarize ──
seen = set()
unique = []
for v in violations:
    key = (v['file'], v['line'], v['column'], v['issue'])
    if key not in seen:
        seen.add(key)
        unique.append(v)

by_table = defaultdict(list)
for v in unique:
    by_table[v['table']].append(v)

by_issue = defaultdict(list)
for v in unique:
    by_issue[v['issue']].append(v)

by_file = defaultdict(list)
for v in unique:
    by_file[v['file']].append(v)

print(f"\n{'='*70}")
print(f"  SCHEMA AUDIT v2 COMPLETE")
print(f"{'='*70}")
print(f"  Files scanned:        {file_count}")
print(f"  Tables in schema:     {len(tables)}")
print(f"  Total violations:     {len(unique)}")

print(f"\n  By table:")
for table, vs in sorted(by_table.items(), key=lambda x: -len(x[1])):
    print(f"    {table:30s} {len(vs):4d} violations")

print(f"\n  By issue type:")
for issue, vs in sorted(by_issue.items(), key=lambda x: -len(x[1])):
    print(f"    {issue:35s} {len(vs):4d}")

print(f"\n  By file:")
for fname, vs in sorted(by_file.items(), key=lambda x: -len(x[1])):
    print(f"    {fname:55s} {len(vs):4d}")

print(f"\n{'='*70}")
print(f"  DETAILED VIOLATIONS")
print(f"{'='*70}")
for v in unique:
    print(f"  📁 {v['file']}:{v['line']} | {v['table']} | ❌'{v['column']}' → ✅'{v['suggestion']}' | {v['issue']}")

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump({
        'summary': {
            'files_scanned': file_count,
            'tables_in_schema': len(tables),
            'total_violations': len(unique),
        },
        'violations': unique,
    }, f, indent=2, ensure_ascii=False)

print(f"\n✅ Results saved to: {OUTPUT_PATH}")