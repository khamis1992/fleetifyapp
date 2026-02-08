#!/usr/bin/env python3
"""
Apply Migration Script
Applies a specific migration file to Supabase database using psycopg2
"""

import sys
import os
from pathlib import Path

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("❌ psycopg2 not installed. Installing...")
    os.system("pip install psycopg2-binary")
    import psycopg2
    from psycopg2 import sql

# Supabase connection details
DB_HOST = "db.qwhunliohlkkahbspfiu.supabase.co"
DB_PORT = "5432"
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASSWORD = input("Enter Supabase database password: ")

def apply_migration(migration_path):
    """Apply a migration file to the database"""
    
    print("═══════════════════════════════════════════════════════")
    print("  Supabase Migration Application Tool")
    print("═══════════════════════════════════════════════════════\n")
    
    print(f"🚀 Starting migration application...")
    print(f"📁 Migration file: {migration_path}\n")
    
    # Read migration file
    try:
        with open(migration_path, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        print(f"📝 Migration size: {len(migration_sql)} characters\n")
    except FileNotFoundError:
        print(f"❌ Migration file not found: {migration_path}")
        return False
    
    # Connect to database
    try:
        print("⏳ Connecting to Supabase database...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            sslmode='require'
        )
        conn.autocommit = False
        cursor = conn.cursor()
        print("✅ Connected successfully!\n")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    
    # Execute migration
    try:
        print("⏳ Executing migration...")
        cursor.execute(migration_sql)
        conn.commit()
        print("✅ Migration executed successfully!\n")
        
        # Get any notices or messages
        for notice in conn.notices:
            print(f"📢 {notice.strip()}")
        
        print("\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
        
    finally:
        cursor.close()
        conn.close()
        print("\n🔒 Database connection closed")

if __name__ == "__main__":
    # Get migration file path
    if len(sys.argv) > 1:
        migration_file = sys.argv[1]
    else:
        # Default to the invoice date fix migration
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        migration_file = project_root / "supabase" / "migrations" / "20260208000001_fix_invoice_date_before_contract_start.sql"
    
    # Apply migration
    success = apply_migration(migration_file)
    
    sys.exit(0 if success else 1)
