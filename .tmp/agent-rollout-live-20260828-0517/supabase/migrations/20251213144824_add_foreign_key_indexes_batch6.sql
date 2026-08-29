-- Add indexes to foreign keys for performance optimization - Batch 6
-- Journal and Legal related tables

-- journal_entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_by ON public.journal_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reversal_entry_id ON public.journal_entries(reversal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_updated_by ON public.journal_entries(updated_by);

-- journal_entry_status_history
CREATE INDEX IF NOT EXISTS idx_journal_entry_status_history_changed_by ON public.journal_entry_status_history(changed_by);

-- landing_ab_tests
CREATE INDEX IF NOT EXISTS idx_landing_ab_tests_company_id ON public.landing_ab_tests(company_id);

-- landing_themes
CREATE INDEX IF NOT EXISTS idx_landing_themes_company_id ON public.landing_themes(company_id);

-- late_fee_history
CREATE INDEX IF NOT EXISTS idx_late_fee_history_late_fee_id ON public.late_fee_history(late_fee_id);
CREATE INDEX IF NOT EXISTS idx_late_fee_history_user_id ON public.late_fee_history(user_id);

-- late_fees
CREATE INDEX IF NOT EXISTS idx_late_fees_late_fee_rule_id ON public.late_fees(late_fee_rule_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_waive_requested_by ON public.late_fees(waive_requested_by);
CREATE INDEX IF NOT EXISTS idx_late_fees_waived_by ON public.late_fees(waived_by);

-- legal_case_account_mappings (10 foreign keys)
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_client_retainer_liability ON public.legal_case_account_mappings(client_retainer_liability_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_consultation_revenue ON public.legal_case_account_mappings(consultation_revenue_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_court_fees_expense ON public.legal_case_account_mappings(court_fees_expense_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_expert_witness_expense ON public.legal_case_account_mappings(expert_witness_expense_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_legal_expenses ON public.legal_case_account_mappings(legal_expenses_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_legal_fees_receivable ON public.legal_case_account_mappings(legal_fees_receivable_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_legal_fees_revenue ON public.legal_case_account_mappings(legal_fees_revenue_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_legal_research_expense ON public.legal_case_account_mappings(legal_research_expense_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_settlements_expense ON public.legal_case_account_mappings(settlements_expense_account_id);
CREATE INDEX IF NOT EXISTS idx_legal_case_account_mappings_settlements_payable ON public.legal_case_account_mappings(settlements_payable_account_id);;
