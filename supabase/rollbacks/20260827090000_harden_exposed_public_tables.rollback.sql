-- Emergency rollback for 20260827090000_harden_exposed_public_tables.sql.
-- WARNING: this restores the previous broad access and should only be used to
-- recover service while a corrected RLS migration is prepared.

BEGIN;

DROP POLICY IF EXISTS bank_statement_entries_company_select ON public.bank_statement_entries;
DROP POLICY IF EXISTS bank_statement_entries_company_insert ON public.bank_statement_entries;
DROP POLICY IF EXISTS bank_statement_entries_company_update ON public.bank_statement_entries;
DROP POLICY IF EXISTS bank_statement_entries_company_delete ON public.bank_statement_entries;
DROP POLICY IF EXISTS distribution_history_company_select ON public.distribution_history;
DROP POLICY IF EXISTS distribution_history_company_insert ON public.distribution_history;
DROP POLICY IF EXISTS late_fee_rule_history_company_select ON public.late_fee_rule_history;
DROP POLICY IF EXISTS lawsuit_preparations_company_select ON public.lawsuit_preparations;
DROP POLICY IF EXISTS lawsuit_preparations_company_insert ON public.lawsuit_preparations;
DROP POLICY IF EXISTS lawsuit_preparations_company_update ON public.lawsuit_preparations;
DROP POLICY IF EXISTS lawsuit_preparations_company_delete ON public.lawsuit_preparations;

ALTER TABLE public._audit_excel_old_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public._audit_nid_fix_20260814_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public._audit_nid_fix_20260814_customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_contract_amount_20260803 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public._review_duplicate_payments_20260803 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.late_fee_rule_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawsuit_preparations DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public._audit_excel_old_payments TO anon, authenticated;
GRANT ALL ON TABLE public._audit_nid_fix_20260814_contracts TO anon, authenticated;
GRANT ALL ON TABLE public._audit_nid_fix_20260814_customers TO anon, authenticated;
GRANT ALL ON TABLE public._backup_contract_amount_20260803 TO anon, authenticated;
GRANT ALL ON TABLE public._review_duplicate_payments_20260803 TO anon, authenticated;
GRANT ALL ON TABLE public.bank_statement_entries TO anon, authenticated;
GRANT ALL ON TABLE public.distribution_history TO anon, authenticated;
GRANT ALL ON TABLE public.late_fee_rule_history TO anon, authenticated;
GRANT ALL ON TABLE public.lawsuit_preparations TO anon, authenticated;

COMMIT;

