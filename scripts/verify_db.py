#!/usr/bin/env python3
"""Verify production-readiness database state."""
import psycopg2
from db_connection import get_database_url

DB_URL = get_database_url()

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    expected_functions = [
        'create_payment_atomic',
        'update_account_balance',
        'create_contract_journal_entry',
        'reverse_journal_entry',
        'recompute_invoice_days_overdue',
        'recompute_contract_days_overdue',
        'post_annual_financial_close',
        'encrypt_pii',
        'decrypt_pii',
        'enforce_payment_approval',
        'enforce_payment_approval_insert_fn',
        'trg_payment_journal_entry_fn',
        'trg_invoice_journal_entry_fn',
        'financial_audit_trigger_fn',
        'recalc_account_balance_trigger_fn',
        'check_payment_approval_requirement',
    ]

    expected_triggers = [
        'trg_payment_journal_entry',
        'trg_invoice_journal_entry',
        'trg_audit_invoices',
        'trg_audit_payments',
        'trg_audit_journal_entries',
        'trg_recalc_account_balance',
        'trg_enforce_payment_approval',
        'trg_enforce_payment_approval_insert',
    ]

    print("=== FUNCTIONS ===")
    cur.execute("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'")
    existing_funcs = {r[0] for r in cur.fetchall()}
    for fn in expected_functions:
        status = "OK" if fn in existing_funcs else "MISSING"
        print(f"  [{status}] {fn}")

    print("\n=== TRIGGERS ===")
    cur.execute("SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public'")
    existing_triggers = {r[0] for r in cur.fetchall()}
    for trg in expected_triggers:
        status = "OK" if trg in existing_triggers else "MISSING"
        print(f"  [{status}] {trg}")

    print("\n=== RLS STATUS ===")
    cur.execute("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('invoices','payments','journal_entries','journal_entry_lines','contracts','customers','chart_of_accounts','audit_logs','financial_approval_policies','financial_approval_requests')")
    for row in cur.fetchall():
        print(f"  {row[0]}: RLS={'ON' if row[1] else 'OFF'}")

    cur.close()
    conn.close()

if __name__ == '__main__':
    main()
