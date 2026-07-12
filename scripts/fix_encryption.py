#!/usr/bin/env python3
"""Verify PII encryption functions."""
import psycopg2

DB_URL = "postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Drop old version with 2 parameters if exists
    cur.execute("DROP FUNCTION IF EXISTS public.encrypt_pii(text, text)")
    cur.execute("DROP FUNCTION IF EXISTS public.decrypt_pii(bytea, text)")
    print("Cleaned up old function versions")

    # Recreate with 1 parameter
    cur.execute("""
        CREATE OR REPLACE FUNCTION public.encrypt_pii(p_plaintext TEXT)
        RETURNS BYTEA
        LANGUAGE sql
        IMMUTABLE
        AS $$
          SELECT pgp_sym_encrypt(p_plaintext, 'fleetify-prod-2026-encryption-key');
        $$;
    """)
    cur.execute("""
        CREATE OR REPLACE FUNCTION public.decrypt_pii(p_encrypted BYTEA)
        RETURNS TEXT
        LANGUAGE sql
        IMMUTABLE
        AS $$
          SELECT pgp_sym_decrypt(p_encrypted, 'fleetify-prod-2026-encryption-key');
        $$;
    """)
    print("Recreated functions with hardcoded key")

    # Test
    cur.execute("SELECT public.encrypt_pii('test-national-id-12345')")
    encrypted = cur.fetchone()[0]
    print(f"Encrypted type: {type(encrypted)}")

    cur.execute("SELECT public.decrypt_pii(%s::bytea)", (encrypted,))
    decrypted = cur.fetchone()[0]
    print(f"Decrypted: {decrypted}")

    assert decrypted == 'test-national-id-12345', f"Mismatch: {decrypted}"
    print("VERIFIED: encrypt/decrypt roundtrip successful")

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
