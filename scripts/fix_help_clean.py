#!/usr/bin/env python3
import os
import re
from pathlib import Path

HELP_DIR = Path('src/components/help/content')

def fix_help_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix quote mismatches: .' to ."
    content = re.sub(r'"([^"]+)\.\'\s*,', r'"\1.",', content)

    # Fix HTML entities in attributes
    content = re.sub(r'(\w+)=&quot;', r'\1="', content)
    content = re.sub(r'&quot;>', r'">', content)

    # Add missing array brackets
    content = re.sub(r'items=\{\s*\n\s+"', 'items={[\n          "', content)

    # Close array brackets
    content = re.sub(r'(",)\s*\n\s+\}\s*\n\s+(\/?>)', r'\1\n        ]}\n        \2', content)

    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed: {file_path.name}')
        return True

    return False

def main():
    print('Fixing help content files...\n')

    if not HELP_DIR.exists():
        print(f'ERROR: Directory not found: {HELP_DIR}')
        return

    tsx_files = list(HELP_DIR.glob('*.tsx'))
    fixed_count = 0

    for file_path in tsx_files:
        try:
            if fix_help_file(file_path):
                fixed_count += 1
        except Exception as e:
            print(f'ERROR fixing {file_path.name}: {e}')

    print(f'\nFixed {fixed_count} of {len(tsx_files)} files')
    print('Now run: npm run build')

if __name__ == '__main__':
    main()
