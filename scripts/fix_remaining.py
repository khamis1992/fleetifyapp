#!/usr/bin/env python3
"""Fix remaining migration issues."""
import psycopg2

DB_URL = "postgresql://postgres.qwhunliohlkkahbspfiu:Khamees1992#@aws-0-eu-north-1.pooler.supabase.com:6543/postgres"

def main():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Fix 1: Drop existing function with wrong signature
    cur.execute("DROP FUNCTION IF EXISTS create_contract_journal_entry(uuid)")
    print("Dropped old create_contract_journal_entry")

    # Fix 2: Drop old payment journal trigger
    cur.execute("DROP TRIGGER IF EXISTS trg_payment_journal_entry ON payments")
    cur.execute("DROP FUNCTION IF EXISTS trg_payment_journal_entry_fn CASCADE")
    print("Dropped old payment journal trigger")

    # Fix 3: Recreate function with correct signature
    cur.execute("""
        CREATE OR REPLACE FUNCTION public.create_contract_journal_entry(p_contract_id uuid)
        RETURNS uuid
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          v_contract record;
          v_entry_number text;
          v_journal_id uuid;
          v_receivable_account_id uuid;
          v_revenue_account_id uuid;
        BEGIN
          SELECT * INTO v_contract FROM public.contracts WHERE id = p_contract_id;
          IF NOT FOUND THEN RETURN NULL; END IF;
          IF v_contract.journal_entry_id IS NOT NULL THEN RETURN v_contract.journal_entry_id; END IF;
          SELECT id INTO v_journal_id FROM public.journal_entries WHERE company_id = v_contract.company_id AND reference_type = 'contract' AND reference_id = p_contract_id LIMIT 1;
          IF v_journal_id IS NOT NULL THEN
            UPDATE public.contracts SET journal_entry_id = v_journal_id WHERE id = p_contract_id;
            RETURN v_journal_id;
          END IF;
          SELECT am.chart_of_accounts_id INTO v_receivable_account_id FROM public.account_mappings am JOIN public.default_account_types dat ON am.default_account_type_id = dat.id WHERE am.company_id = v_contract.company_id AND dat.type_code = 'RECEIVABLES' AND am.is_active = true LIMIT 1;
          SELECT am.chart_of_accounts_id INTO v_revenue_account_id FROM public.account_mappings am JOIN public.default_account_types dat ON am.default_account_type_id = dat.id WHERE am.company_id = v_contract.company_id AND dat.type_code IN ('RENTAL_REVENUE', 'SALES_REVENUE', 'REVENUE') AND am.is_active = true ORDER BY CASE dat.type_code WHEN 'RENTAL_REVENUE' THEN 1 WHEN 'SALES_REVENUE' THEN 2 WHEN 'REVENUE' THEN 3 ELSE 4 END LIMIT 1;
          IF v_receivable_account_id IS NULL OR v_revenue_account_id IS NULL THEN RETURN NULL; END IF;
          v_entry_number := 'CNT-' || to_char(CURRENT_DATE, 'YYYYMM') || '-' || substring(p_contract_id::text, 1, 8);
          INSERT INTO public.journal_entries (company_id, entry_number, entry_date, description, total_debit, total_credit, status, reference_type, reference_id, created_by)
          VALUES (v_contract.company_id, v_entry_number, CURRENT_DATE, 'Contract Revenue - ' || v_contract.contract_number, v_contract.contract_amount, v_contract.contract_amount, 'posted', 'contract', p_contract_id, v_contract.created_by)
          RETURNING id INTO v_journal_id;
          INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount)
          VALUES (v_journal_id, v_receivable_account_id, 1, 'Accounts Receivable - ' || v_contract.contract_number, v_contract.contract_amount, 0),
                 (v_journal_id, v_revenue_account_id, 2, 'Contract Revenue - ' || v_contract.contract_number, 0, v_contract.contract_amount);
          UPDATE public.contracts SET journal_entry_id = v_journal_id, updated_at = now() WHERE id = p_contract_id;
          RETURN v_journal_id;
        END;
        $$;
    """)
    print("Recreated create_contract_journal_entry")

    # Fix 4: Grant permissions
    cur.execute("GRANT EXECUTE ON FUNCTION public.create_contract_journal_entry(uuid) TO authenticated")
    print("Granted permissions")

    cur.close()
    conn.close()
    print("DONE")

if __name__ == '__main__':
    main()
