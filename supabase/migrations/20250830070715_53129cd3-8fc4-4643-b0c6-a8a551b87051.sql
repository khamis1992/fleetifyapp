-- Fix customer code uniqueness constraint
-- Remove global unique constraint on customer_code and add composite constraint

-- First, drop the existing unique constraint on customer_code
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_code_key;

-- Add a composite unique constraint on (company_id, customer_code)
-- This allows each company to have its own customer codes independently
ALTER TABLE public.customers 
ADD CONSTRAINT customers_company_customer_code_unique 
UNIQUE (company_id, customer_code);

-- Add index for better performance on company_id, customer_code queries
CREATE INDEX IF NOT EXISTS idx_customers_company_customer_code 
ON public.customers(company_id, customer_code) 
WHERE customer_code IS NOT NULL;