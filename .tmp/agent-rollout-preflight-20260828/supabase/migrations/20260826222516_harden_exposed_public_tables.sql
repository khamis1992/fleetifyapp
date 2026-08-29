-- Harden legacy/internal tables and add tenant isolation to operational tables.
-- Security objective: no public table in this set remains globally writable by
-- anon/authenticated roles.

BEGIN;

-- Internal audit/backup/review tables are service-only. Enabling RLS also makes
-- accidental future grants fail closed when no user policy exists.
ALTER TABLE public._audit_excel_old_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._audit_nid_fix_20260814_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._audit_nid_fix_20260814_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._backup_contract_amount_20260803 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._review_duplicate_payments_20260803 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public._audit_excel_old_payments FROM anon, authenticated;
REVOKE ALL ON TABLE public._audit_nid_fix_20260814_contracts FROM anon, authenticated;
REVOKE ALL ON TABLE public._audit_nid_fix_20260814_customers FROM anon, authenticated;
REVOKE ALL ON TABLE public._backup_contract_amount_20260803 FROM anon, authenticated;
REVOKE ALL ON TABLE public._review_duplicate_payments_20260803 FROM anon, authenticated;

-- Operational tables remain available to signed-in users, but only inside the
-- company resolved from auth.uid(). anon receives no table access.
ALTER TABLE public.bank_statement_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.late_fee_rule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawsuit_preparations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.bank_statement_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.distribution_history FROM anon, authenticated;
REVOKE ALL ON TABLE public.late_fee_rule_history FROM anon, authenticated;
REVOKE ALL ON TABLE public.lawsuit_preparations FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bank_statement_entries TO authenticated;
GRANT SELECT, INSERT ON TABLE public.distribution_history TO authenticated;
GRANT SELECT ON TABLE public.late_fee_rule_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lawsuit_preparations TO authenticated;

DROP POLICY IF EXISTS bank_statement_entries_company_select ON public.bank_statement_entries;
CREATE POLICY bank_statement_entries_company_select
ON public.bank_statement_entries FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS bank_statement_entries_company_insert ON public.bank_statement_entries;
CREATE POLICY bank_statement_entries_company_insert
ON public.bank_statement_entries FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS bank_statement_entries_company_update ON public.bank_statement_entries;
CREATE POLICY bank_statement_entries_company_update
ON public.bank_statement_entries FOR UPDATE TO authenticated
USING (company_id = public.get_user_company(auth.uid()))
WITH CHECK (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS bank_statement_entries_company_delete ON public.bank_statement_entries;
CREATE POLICY bank_statement_entries_company_delete
ON public.bank_statement_entries FOR DELETE TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS distribution_history_company_select ON public.distribution_history;
CREATE POLICY distribution_history_company_select
ON public.distribution_history FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS distribution_history_company_insert ON public.distribution_history;
CREATE POLICY distribution_history_company_insert
ON public.distribution_history FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS late_fee_rule_history_company_select ON public.late_fee_rule_history;
CREATE POLICY late_fee_rule_history_company_select
ON public.late_fee_rule_history FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS lawsuit_preparations_company_select ON public.lawsuit_preparations;
CREATE POLICY lawsuit_preparations_company_select
ON public.lawsuit_preparations FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS lawsuit_preparations_company_insert ON public.lawsuit_preparations;
CREATE POLICY lawsuit_preparations_company_insert
ON public.lawsuit_preparations FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS lawsuit_preparations_company_update ON public.lawsuit_preparations;
CREATE POLICY lawsuit_preparations_company_update
ON public.lawsuit_preparations FOR UPDATE TO authenticated
USING (company_id = public.get_user_company(auth.uid()))
WITH CHECK (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS lawsuit_preparations_company_delete ON public.lawsuit_preparations;
CREATE POLICY lawsuit_preparations_company_delete
ON public.lawsuit_preparations FOR DELETE TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

COMMIT;


;
