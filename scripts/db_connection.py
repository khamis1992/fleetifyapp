"""Shared database connection configuration for maintenance scripts."""
import os


def get_database_url() -> str:
    database_url = os.environ.get('SUPABASE_DB_URL') or os.environ.get('DATABASE_URL')
    if not database_url:
        raise RuntimeError('SUPABASE_DB_URL or DATABASE_URL must be configured')
    return database_url
