-- Phase 1B: Create Performance Indexes (using regular CREATE INDEX)

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

-- Partial indexes for frequently filtered data
CREATE INDEX IF NOT EXISTS idx_system_logs_recent ON system_logs(company_id, created_at DESC) WHERE created_at >= NOW() - INTERVAL '90 days';

-- Create function to refresh materialized view stats cache
CREATE OR REPLACE FUNCTION public.refresh_company_stats_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- For now, just a placeholder until we can create the materialized view
    -- This will be used by the refresh edge function
    NULL;
END;
$$;