-- Fix Traffic Violations Database Schema
-- This script creates the missing penalties table and establishes proper relationships
-- Run this in your Supabase project: https://qwhunliohlkkahbspfiu.supabase.co

-- First, let's check if the required tables exist
-- If companies, customers, contracts tables don't exist, they need to be created first

-- Create penalties table for traffic violations
CREATE TABLE IF NOT EXISTS public.penalties (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL, -- References companies(id)
    customer_id UUID NOT NULL, -- References customers(id)
    contract_id UUID, -- References contracts(id), nullable
    penalty_number TEXT NOT NULL,
    penalty_type TEXT NOT NULL DEFAULT 'traffic_violation',
    violation_type TEXT,
    penalty_date DATE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    balance_due NUMERIC GENERATED ALWAYS AS (amount - COALESCE(paid_amount, 0)) STORED,
    location TEXT,
    vehicle_plate TEXT,
    reason TEXT NOT NULL,
    reason_ar TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid')),
    due_date DATE,
    journal_entry_id UUID, -- References journal_entries(id), nullable
    created_by UUID, -- References auth.users(id), nullable
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_penalty_number_per_company UNIQUE (company_id, penalty_number),
    CONSTRAINT positive_amounts CHECK (amount >= 0 AND (paid_amount IS NULL OR paid_amount >= 0))
);

-- Add foreign key constraints only if the referenced tables exist
-- You'll need to uncomment these lines once the referenced tables are available:

-- ALTER TABLE public.penalties 
-- ADD CONSTRAINT fk_penalties_company_id 
-- FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- ALTER TABLE public.penalties 
-- ADD CONSTRAINT fk_penalties_customer_id 
-- FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;

-- ALTER TABLE public.penalties 
-- ADD CONSTRAINT fk_penalties_contract_id 
-- FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- ALTER TABLE public.penalties 
-- ADD CONSTRAINT fk_penalties_journal_entry_id 
-- FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;

-- ALTER TABLE public.penalties 
-- ADD CONSTRAINT fk_penalties_created_by 
-- FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_penalties_company_id ON public.penalties(company_id);
CREATE INDEX IF NOT EXISTS idx_penalties_customer_id ON public.penalties(customer_id);
CREATE INDEX IF NOT EXISTS idx_penalties_contract_id ON public.penalties(contract_id);
CREATE INDEX IF NOT EXISTS idx_penalties_penalty_date ON public.penalties(penalty_date);
CREATE INDEX IF NOT EXISTS idx_penalties_status ON public.penalties(status);
CREATE INDEX IF NOT EXISTS idx_penalties_payment_status ON public.penalties(payment_status);
CREATE INDEX IF NOT EXISTS idx_penalties_penalty_number ON public.penalties(penalty_number);

-- Enable RLS
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy (adjust based on your auth system)
-- This assumes you have a function get_user_company(auth.uid()) 
-- If not, replace with appropriate company isolation logic
DO $$
BEGIN
    -- Try to create policy, ignore if function doesn't exist
    BEGIN
        EXECUTE 'CREATE POLICY "Company isolation for penalties" ON public.penalties
                 FOR ALL 
                 TO authenticated 
                 USING (company_id = get_user_company(auth.uid()))';
    EXCEPTION 
        WHEN undefined_function THEN
            -- If get_user_company doesn't exist, create a simple policy
            -- You'll need to adjust this based on your auth setup
            EXECUTE 'CREATE POLICY "Basic penalties policy" ON public.penalties
                     FOR ALL 
                     TO authenticated 
                     USING (true)'; -- TEMPORARY - should be replaced with proper company isolation
    END;
END $$;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_penalties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_penalties_updated_at
    BEFORE UPDATE ON public.penalties
    FOR EACH ROW
    EXECUTE FUNCTION update_penalties_updated_at();

-- Add function to generate penalty numbers
CREATE OR REPLACE FUNCTION generate_penalty_number(p_company_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    penalty_number TEXT;
BEGIN
    -- Get the next penalty number for the company (or globally if no company_id)
    IF p_company_id IS NOT NULL THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(penalty_number FROM 'PEN-(\d+)') AS INTEGER)), 0) + 1
        INTO next_number
        FROM penalties
        WHERE company_id = p_company_id
          AND penalty_number ~ '^PEN-\d+$';
    ELSE
        SELECT COALESCE(MAX(CAST(SUBSTRING(penalty_number FROM 'PEN-(\d+)') AS INTEGER)), 0) + 1
        INTO next_number
        FROM penalties
        WHERE penalty_number ~ '^PEN-\d+$';
    END IF;
    
    -- Format as PEN-000001
    penalty_number := 'PEN-' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN penalty_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON public.penalties TO authenticated;
GRANT EXECUTE ON FUNCTION generate_penalty_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_penalties_updated_at() TO authenticated;

-- Create traffic_violation_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.traffic_violation_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL, -- References companies(id)
    traffic_violation_id UUID NOT NULL, -- References penalties(id)
    payment_number TEXT NOT NULL,
    payment_date DATE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference_number TEXT,
    bank_account TEXT,
    check_number TEXT,
    notes TEXT,
    journal_entry_id UUID, -- References journal_entries(id)
    created_by UUID, -- References auth.users(id)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_payment_number_per_company UNIQUE (company_id, payment_number),
    CONSTRAINT positive_payment_amount CHECK (amount > 0)
);

-- Add foreign key for traffic_violation_payments to penalties
ALTER TABLE public.traffic_violation_payments 
ADD CONSTRAINT fk_traffic_violation_payments_violation_id 
FOREIGN KEY (traffic_violation_id) REFERENCES public.penalties(id) ON DELETE CASCADE;

-- Create indexes for traffic_violation_payments
CREATE INDEX IF NOT EXISTS idx_traffic_violation_payments_company_id ON public.traffic_violation_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_traffic_violation_payments_violation_id ON public.traffic_violation_payments(traffic_violation_id);
CREATE INDEX IF NOT EXISTS idx_traffic_violation_payments_date ON public.traffic_violation_payments(payment_date);

-- Enable RLS for traffic_violation_payments
ALTER TABLE public.traffic_violation_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for traffic_violation_payments
DO $$
BEGIN
    BEGIN
        EXECUTE 'CREATE POLICY "Company isolation for traffic violation payments" ON public.traffic_violation_payments
                 FOR ALL 
                 TO authenticated 
                 USING (company_id = get_user_company(auth.uid()))';
    EXCEPTION 
        WHEN undefined_function THEN
            EXECUTE 'CREATE POLICY "Basic traffic violation payments policy" ON public.traffic_violation_payments
                     FOR ALL 
                     TO authenticated 
                     USING (true)'; -- TEMPORARY - should be replaced with proper company isolation
    END;
END $$;

-- Add updated_at trigger for traffic_violation_payments
CREATE TRIGGER trigger_update_traffic_violation_payments_updated_at
    BEFORE UPDATE ON public.traffic_violation_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_penalties_updated_at();

-- Grant permissions for traffic_violation_payments
GRANT ALL ON public.traffic_violation_payments TO authenticated;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE '✅ Traffic violations database schema has been created successfully!';
    RAISE NOTICE 'ℹ️  Note: You may need to add foreign key constraints to companies, customers, contracts tables when they are available.';
    RAISE NOTICE 'ℹ️  Note: Update the RLS policies with proper company isolation logic based on your auth system.';
END $$;