-- Fix RLS policies for payments table to prevent 400/406 errors

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view their company payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments for their company" ON public.payments;
DROP POLICY IF EXISTS "Users can update their company payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete their company payments" ON public.payments;
DROP POLICY IF EXISTS "Enable read access for authenticated users with company" ON public.payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users with company" ON public.payments;
DROP POLICY IF EXISTS "Enable update for authenticated users with company" ON public.payments;

-- Create simplified policies for payments using company_id directly
CREATE POLICY "Users can read payments for their company"
ON public.payments
FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
);

CREATE POLICY "Users can create payments for their company"
ON public.payments
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
);

CREATE POLICY "Users can update payments for their company"
ON public.payments
FOR UPDATE
USING (
    auth.uid() IS NOT NULL 
    AND company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
);

CREATE POLICY "Users can delete payments for their company"
ON public.payments
FOR DELETE
USING (
    auth.uid() IS NOT NULL 
    AND company_id IN (
        SELECT company_id 
        FROM public.profiles 
        WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
);

-- Enable RLS on related tables if not already enabled
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Ensure basic read policies exist for related tables
-- Contracts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'contracts' 
        AND policyname = 'Users can read contracts for their company'
    ) THEN
        CREATE POLICY "Users can read contracts for their company"
        ON public.contracts
        FOR SELECT
        USING (
            auth.uid() IS NOT NULL 
            AND company_id IN (
                SELECT company_id 
                FROM public.profiles 
                WHERE user_id = auth.uid()
                AND company_id IS NOT NULL
            )
        );
    END IF;
END $$;

-- Customers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' 
        AND policyname = 'Users can read customers for their company'
    ) THEN
        CREATE POLICY "Users can read customers for their company"
        ON public.customers
        FOR SELECT
        USING (
            auth.uid() IS NOT NULL 
            AND company_id IN (
                SELECT company_id 
                FROM public.profiles 
                WHERE user_id = auth.uid()
                AND company_id IS NOT NULL
            )
        );
    END IF;
END $$;

-- Invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'invoices' 
        AND policyname = 'Users can read invoices for their company'
    ) THEN
        CREATE POLICY "Users can read invoices for their company"
        ON public.invoices
        FOR SELECT
        USING (
            auth.uid() IS NOT NULL 
            AND company_id IN (
                SELECT company_id 
                FROM public.profiles 
                WHERE user_id = auth.uid()
                AND company_id IS NOT NULL
            )
        );
    END IF;
END $$;
