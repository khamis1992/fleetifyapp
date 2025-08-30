-- Add performance indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_customer_type ON public.customers(company_id, customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_company_blacklisted ON public.customers(company_id, is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON public.customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON public.contracts(customer_id);

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_customers_name_search ON public.customers USING gin(
  (first_name || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(company_name, '')) gin_trgm_ops
);

-- Enable trigram extension for better text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;