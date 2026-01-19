#!/usr/bin/env python3
"""
Comprehensive fix for help content TSX files.
Fixes quote mismatches, HTML entities, and missing array brackets.
"""

import os
import re
from pathlib import Path

HELP_DIR = Path('src/components/help/content')

def fix_help_file(file_path):
    """Fix all issues in a help content file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix 1: Replace single quote endings with double quote endings
    # Pattern: "text...', → "text...",
    content = re.sub(r'"([^"]+)\.\'\s*,', r'"\1.",', content)

    # Fix 2: Fix HTML entities in attributes
    # Replace attribute=&quot; with attribute="
    content = re.sub(r'(\w+)=&quot;', r'\1="', content)

    # Replace &quot;> with ">
    content = re.sub(r'&quot;>', r'">', content)

    # Fix 3: Add missing array brackets to items prop
    # items={ \n  "..." → items={[\n  "..."
    content = re.sub(r'items=\{\s*\n\s+"', 'items={[\n          "', content)

    # Fix 4: Close array brackets
    # ",\n  }\n  /> → ",\n        ]}\n        />
    content = re.sub(r'(",)\s*\n\s+\}\s*\n\s+(\/?>)', r'\1\n        ]}\n        \2', content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'[OK] Fixed: {file_path.name}')
        return True

    return False

def main():
    """Process all TSX files in the help content directory."""
    print('🔧 Fixing help content files...\n')

    if not HELP_DIR.exists():
        print(f'[ERROR] Directory not found: {HELP_DIR}')
        return

    tsx_files = list(HELP_DIR.glob('*.tsx'))
    fixed_count = 0

    for file_path in tsx_files:
        try:
            if fix_help_file(file_path):
                fixed_count += 1
        except Exception as e:
            print(f'[ERROR] Error fixing {file_path.name}: {e}')

    print(f'\nDone Fixed {fixed_count} of {len(tsx_files)} files')
    print('\nNow run: npm run build')

if __name__ == '__main__':
    main()
