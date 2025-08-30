-- Add performance indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_customer_type ON public.customers(company_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_company_blacklisted ON public.customers(company_id, is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON public.customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON public.contracts(customer_id);

-- Add basic text search index on customer names
CREATE INDEX IF NOT EXISTS idx_customers_first_name ON public.customers(first_name);
CREATE INDEX IF NOT EXISTS idx_customers_last_name ON public.customers(last_name);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON public.customers(company_name);