#!/usr/bin/env python3
"""
SECURE VERSION: Apply cancelled contracts migration for العراف company
Processes 392 contracts from insert_customers.sql
Uses parameterized queries to prevent SQL injection
"""

import re
import os
import subprocess
import json
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
from decimal import Decimal

# Database connection configuration
# IMPORTANT: Use environment variables or secure config in production
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'fleetifyapp'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port': os.getenv('DB_PORT', '5432')
}

COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4'

def get_db_connection():
    """Get a database connection with proper error handling"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        raise

def process_batch_safely(conn, batch_data, batch_num):
    """Process a batch of contracts using parameterized queries"""
    try:
        with conn.cursor() as cursor:
            print(f"Processing batch {batch_num} with {len(batch_data)} contracts...")

            for item in batch_data:
                contract_num = item['contract_num']
                plate = item['plate']
                name = item['name']
                phone = item['phone']

                # Find vehicle by plate number (parameterized query)
                cursor.execute(
                    sql.SQL("""
                        SELECT id FROM vehicles
                        WHERE plate_number = %s AND company_id = %s
                        LIMIT 1
                    """),
                    [plate, COMPANY_ID]
                )
                vehicle_result = cursor.fetchone()

                if vehicle_result:
                    vehicle_id = vehicle_result[0]

                    # Find or create customer (parameterized queries)
                    cursor.execute(
                        sql.SQL("""
                            SELECT id FROM customers
                            WHERE phone = %s AND company_id = %s
                            LIMIT 1
                        """),
                        [phone, COMPANY_ID]
                    )
                    customer_result = cursor.fetchone()

                    if not customer_result:
                        # Generate customer code safely
                        cursor.execute(
                            sql.SQL("""
                                WITH next_code AS (
                                    SELECT COALESCE(
                                        MAX(CAST(SUBSTRING(customer_code FROM 'IND-25-([0-9]+)') AS INTEGER)),
                                        0
                                    ) + 1 as code
                                    FROM customers
                                    WHERE company_id = %s AND customer_code LIKE 'IND-25-%'
                                )
                                INSERT INTO customers (company_id, customer_type, first_name, phone, customer_code, created_at, updated_at)
                                SELECT %s, 'individual', %s, %s, 'IND-25-' || LPAD(code::TEXT, 4, '0'), NOW(), NOW()
                                FROM next_code
                                RETURNING id
                            """),
                            [COMPANY_ID, name, phone]
                        )
                        customer_result = cursor.fetchone()
                    else:
                        # Update existing customer
                        cursor.execute(
                            sql.SQL("""
                                UPDATE customers SET first_name = %s, updated_at = NOW()
                                WHERE id = %s
                            """),
                            [name, customer_result[0]]
                        )

                    customer_id = customer_result[0]

                    # Update contract if found (parameterized query)
                    cursor.execute(
                        sql.SQL("""
                            UPDATE contracts
                            SET vehicle_id = %s, customer_id = %s, license_plate = %s, updated_at = NOW()
                            WHERE contract_number = %s AND company_id = %s AND status = 'cancelled'
                        """),
                        [vehicle_id, customer_id, plate, contract_num, COMPANY_ID]
                    )

                    # Update vehicle status (parameterized query)
                    cursor.execute(
                        sql.SQL("""
                            UPDATE vehicles
                            SET status = 'available', updated_at = NOW()
                            WHERE id = %s AND status != 'rented'
                        """),
                        [vehicle_id]
                    )

            conn.commit()
            print(f"✓ Batch {batch_num} processed successfully")

    except psycopg2.Error as e:
        conn.rollback()
        print(f"❌ Error in batch {batch_num}: {e}")
        raise

def main():
    """Main execution function"""
    # Read and parse the data file
    try:
        with open('c:/Users/khamis/Desktop/fleetifyapp-3/.qoder/insert_customers.sql', 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print("❌ Error: insert_customers.sql file not found")
        return
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return

    # Extract all data using regex
    pattern = r"\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)"
    matches = re.findall(pattern, content)

    # Filter test data and clean
    processed_data = []
    for contract_num, plate, name, phone in matches:
        if (not contract_num.startswith('LT0RO') and
            not contract_num.startswith('test') and
            plate != 'TEST-123'):
            phone_clean = phone.replace('.0', '')
            # SQL injection prevention: already handled by parameterized queries
            processed_data.append({
                'contract_num': contract_num,
                'plate': plate,
                'name': name,
                'phone': phone_clean
            })

    print(f"Processing {len(processed_data)} cancelled contracts...")

    # Get database connection
    try:
        conn = get_db_connection()
    except Exception:
        print("❌ Failed to connect to database. Please check your configuration.")
        return

    # Process in batches of 50
    batch_size = 50
    total_batches = (len(processed_data) + batch_size - 1) // batch_size
    successful_batches = 0

    try:
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, len(processed_data))
            batch = processed_data[start_idx:end_idx]

            try:
                process_batch_safely(conn, batch, batch_num + 1)
                successful_batches += 1
            except Exception as e:
                print(f"Failed to process batch {batch_num + 1}. Stopping execution.")
                break

    finally:
        conn.close()

    print(f"\n{'='*60}")
    print("Migration complete!")
    print(f"Successfully processed {successful_batches}/{total_batches} batches")
    print(f"Total contracts attempted: {successful_batches * batch_size}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()