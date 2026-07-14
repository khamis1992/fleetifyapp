"""Verify the explicitly configured maintenance database connection."""
import psycopg2

from db_connection import get_database_url


try:
    with psycopg2.connect(get_database_url(), connect_timeout=10) as connection:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            print(f'Database connection succeeded: {cursor.fetchone()[0]}')
except Exception as error:
    raise SystemExit(f'Database connection failed: {error}') from error
