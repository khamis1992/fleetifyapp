#!/usr/bin/env python3
"""
Schema Audit Script — Cross-references every .from('table') call against types.ts
Finds: wrong column names, non-existent columns, known pattern violations
"""
import re, json, os, sys
from pathlib import Path
from collections import defaultdict

# ── Paths ──
BASE = Path(__file__).resolve().parent.parent
TYPES_PATH = BASE / "src" / "integrations" / "supabase" / "types.ts"
SRC_PATH = BASE / "src"
OUTPUT_PATH = BASE / "scripts" / "schema-audit-results.json"

# ── 1. Parse types.ts → table → columns ──
with open(TYPES_PATH, "r", encoding="utf-8") as f:
    types_content = f.read()

# Extract table definitions with Row blocks
# Pattern: "      tableName: {\n        Row: {\n          col: type\n          ... }}"
table_pattern = re.compile(
    r'^\s{6}(\w+):\s*\{\s*\n\s{8}Row:\s*\{([^}]+)\}',
    re.MULTILINE
)

tables = {}
for m in table_pattern.finditer(types_content):
    table_name = m.group(1)
    row_block = m.group(2)
    col_pattern = re.compile(r'^\s{10,}(\w+):\s+', re.MULTILINE)
    cols = [cm.group(1) for cm in col_pattern.finditer(row_block)]
    if cols:
        tables[table_name] = set(cols)

print(f"Extracted {len(tables)} tables from types.ts")

# ── 2. Known column-name corrections ──
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

print(f"Known correction patterns: {sum(len(v) for v in known_corrections.values())} checks across {len(known_corrections)} tables")

# ── 3. Scan all source files ──
from_pattern = re.compile(r"\.from\(['\"](\w+)['\"]\)")
select_pattern = re.compile(r"\.select\(['\"]([^'\"]+)['\"]\)")
eq_pattern = re.compile(r"\.(?:eq|neq|in|gte|lte|gt|lt|like|ilike|cs|cd)\(['\"](\w+)['\"]")
# For insert/update/upsert, we need to look at object keys over multiple lines
# We'll use a broader approach: find .insert( .update( .upsert( and capture until matching )

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
        for line_idx, line in enumerate(lines):
            from_match = from_pattern.search(line)
            if not from_match:
                continue

            table_name = from_match.group(1)
            if table_name not in tables:
                continue

            corrections = known_corrections.get(table_name, {})
            if not corrections:
                continue

            # Grab a generous block around this line for multi-line queries
            block_start = max(0, line_idx - 2)
            block_end = min(len(lines), line_idx + 40)
            query_block = '\n'.join(lines[block_start:block_end])
            block_line_offset = block_start

            def find_line_number(pos_in_block):
                return block_line_offset + 1 + query_block[:pos_in_block].count('\n')

            # ── Check .select() columns ──
            for sel_match in select_pattern.finditer(query_block):
                select_str = sel_match.group(1)
                ln = find_line_number(sel_match.start())
                for part in select_str.split(','):
                    part = part.strip()
                    # Skip nested joins: table(col1, col2)
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
                                    'code': lines[ln-1].strip()[:120] if ln <= len(lines) else ''
                                })
                            elif col != correct:
                                violations.append({
                                    'file': rel_path, 'line': ln, 'table': table_name,
                                    'column': col, 'issue': 'WRONG_COLUMN_NAME',
                                    'suggestion': correct,
                                    'code': lines[ln-1].strip()[:120] if ln <= len(lines) else ''
                                })

            # ── Check .eq/.neq/.in/etc column names ──
            for op_match in eq_pattern.finditer(query_block):
                col = op_match.group(1)
                ln = find_line_number(op_match.start())
                if col in corrections:
                    correct = corrections[col]
                    if correct is None:
                        violations.append({
                            'file': rel_path, 'line': ln, 'table': table_name,
                            'column': col, 'issue': 'FILTER_NONEXISTENT_COLUMN',
                            'suggestion': 'Remove this filter',
                            'code': lines[ln-1].strip()[:120] if ln <= len(lines) else ''
                        })
                    elif col != correct:
                        violations.append({
                            'file': rel_path, 'line': ln, 'table': table_name,
                            'column': col, 'issue': 'FILTER_WRONG_COLUMN_NAME',
                            'suggestion': correct,
                            'code': lines[ln-1].strip()[:120] if ln <= len(lines) else ''
                        })

            # ── Check .insert/.update/.upsert object keys ──
            # Find operation start and extract object keys
            for op_name in ['insert', 'update', 'upsert']:
                op_pattern = re.compile(r'\.' + op_name + r'\(\s*(\{)')
                for op_match in op_pattern.finditer(query_block):
                    brace_start = op_match.end() - 1  # position of opening {
                    # Find matching closing brace
                    depth = 0
                    obj_end = -1
                    for i in range(brace_start, len(query_block)):
                        if query_block[i] == '{':
                            depth += 1
                        elif query_block[i] == '}':
                            depth -= 1
                            if depth == 0:
                                obj_end = i
                                break
                    if obj_end == -1:
                        continue
                    obj_str = query_block[brace_start+1:obj_end]
                    obj_line = find_line_number(op_match.start())

                    # Extract key names (handle spread, nested objects)
                    # Simple pattern: word: value
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
                                    'code': lines[obj_line-1].strip()[:120] if obj_line <= len(lines) else ''
                                })
                            elif key != correct:
                                violations.append({
                                    'file': rel_path, 'line': obj_line, 'table': table_name,
                                    'column': key, 'issue': f'{op_name.upper()}_WRONG_COLUMN_NAME',
                                    'suggestion': correct,
                                    'code': lines[obj_line-1].strip()[:120] if obj_line <= len(lines) else ''
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
print(f"  SCHEMA AUDIT COMPLETE")
print(f"{'='*70}")
print(f"  Files scanned:        {file_count}")
print(f"  Tables in schema:     {len(tables)}")
print(f"  Correction patterns:  {sum(len(v) for v in known_corrections.values())}")
print(f"  Total violations:     {len(unique)}")
print(f"\n  By table:")
for table, vs in sorted(by_table.items(), key=lambda x: -len(x[1])):
    print(f"    {table:30s} {len(vs):4d} violations")
print(f"\n  By issue type:")
for issue, vs in sorted(by_issue.items(), key=lambda x: -len(x[1])):
    print(f"    {issue:35s} {len(vs):4d}")
print(f"\n  By file (top 20):")
for fname, vs in sorted(by_file.items(), key=lambda x: -len(x[1]))[:20]:
    print(f"    {fname:55s} {len(vs):4d}")

print(f"\n{'='*70}")
print(f"  DETAILED VIOLATIONS")
print(f"{'='*70}")
for v in unique:
    print(f"\n  📁 {v['file']}:{v['line']}")
    print(f"     Table: {v['table']} | Column: ❌'{v['column']}' → ✅'{v['suggestion']}'")
    print(f"     Issue: {v['issue']}")
    print(f"     Code:  {v['code'][:100]}")

# ── 5. Save JSON ──
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump({
        'summary': {
            'files_scanned': file_count,
            'tables_in_schema': len(tables),
            'total_violations': len(unique),
        },
        'violations': unique,
        'by_table': {k: len(v) for k, v in by_table.items()},
        'by_issue': {k: len(v) for k, v in by_issue.items()},
    }, f, indent=2, ensure_ascii=False)

print(f"\n✅ Results saved to: {OUTPUT_PATH}")