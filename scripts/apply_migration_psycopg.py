#!/usr/bin/env python3
"""Apply a migration using an explicitly configured PostgreSQL connection."""
import os
import sys

import psycopg2

# Read the migration SQL
migration_path = os.environ.get(
    'MIGRATION_PATH',
    os.path.join(
        os.path.dirname(__file__),
        '..',
        'supabase',
        'migrations',
        '20260701000006_link_payment_journal_bypass.sql',
    ),
)
database_url = os.environ.get('SUPABASE_DB_URL') or os.environ.get('DATABASE_URL')

if not database_url:
    raise SystemExit('SUPABASE_DB_URL or DATABASE_URL must be configured')

with open(migration_path, 'r', encoding='utf-8') as f:
    sql = f.read()

try:
    with psycopg2.connect(database_url, connect_timeout=10) as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql)
    print(f'Migration applied: {os.path.abspath(migration_path)}')
except Exception as error:
    print(f'Migration failed: {error}', file=sys.stderr)
    sys.exit(1)
