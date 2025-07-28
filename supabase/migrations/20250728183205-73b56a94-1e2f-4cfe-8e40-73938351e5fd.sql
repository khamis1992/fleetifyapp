-- Phase 1B: Create Performance Indexes (fixed)

-- Basic indexes for core tables
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON contracts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_company ON contracts(customer_id, company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_employees_company_active ON employees(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account ON journal_entry_lines(account_id, journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_date ON bank_transactions(company_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_company_date ON payments(company_id, payment_date DESC);

-- HR and attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, attendance_date DESC);

-- System logs optimization
CREATE INDEX IF NOT EXISTS idx_system_logs_company_created ON system_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);

-- RLS optimization indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_company ON profiles(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- Approval workflow indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_company_status ON approval_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_request_order ON approval_steps(request_id, step_order);

-- Complex query indexes
CREATE INDEX IF NOT EXISTS idx_contracts_active_filter ON contracts(company_id, status, start_date, end_date);

-- Create function to refresh stats (placeholder for edge function)
CREATE OR REPLACE FUNCTION public.refresh_company_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Placeholder function for stats refresh
    -- Will be called by edge function for periodic cache refresh
    NULL;
END;
$$;