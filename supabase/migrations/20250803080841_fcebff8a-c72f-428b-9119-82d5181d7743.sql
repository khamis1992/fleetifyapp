-- Fix quotation approval system: Add missing foreign key relationships and update RLS policies

-- First, let's ensure the quotations table has proper foreign key relationships
-- Add foreign key constraints if they don't exist (using IF NOT EXISTS equivalent)
DO $$
BEGIN
    -- Add foreign key to customers if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotations_customer_id_fkey' 
        AND table_name = 'quotations'
    ) THEN
        ALTER TABLE public.quotations 
        ADD CONSTRAINT quotations_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id);
    END IF;

    -- Add foreign key to vehicles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotations_vehicle_id_fkey' 
        AND table_name = 'quotations'
    ) THEN
        ALTER TABLE public.quotations 
        ADD CONSTRAINT quotations_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);
    END IF;

    -- Add foreign key to companies if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotations_company_id_fkey' 
        AND table_name = 'quotations'
    ) THEN
        ALTER TABLE public.quotations 
        ADD CONSTRAINT quotations_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id);
    END IF;
END $$;

-- Create RLS policy for public access to quotations via approval token
DROP POLICY IF EXISTS "Public access for quotation approval" ON public.quotations;
CREATE POLICY "Public access for quotation approval" 
ON public.quotations 
FOR SELECT 
USING (approval_token IS NOT NULL);

-- Create RLS policy for public access to related data via quotation approval
DROP POLICY IF EXISTS "Public access to customers via quotation approval" ON public.customers;
CREATE POLICY "Public access to customers via quotation approval" 
ON public.customers 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE quotations.customer_id = customers.id 
        AND quotations.approval_token IS NOT NULL
    )
);

DROP POLICY IF EXISTS "Public access to vehicles via quotation approval" ON public.vehicles;
CREATE POLICY "Public access to vehicles via quotation approval" 
ON public.vehicles 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE quotations.vehicle_id = vehicles.id 
        AND quotations.approval_token IS NOT NULL
    )
);

DROP POLICY IF EXISTS "Public access to companies via quotation approval" ON public.companies;
CREATE POLICY "Public access to companies via quotation approval" 
ON public.companies 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.quotations 
        WHERE quotations.company_id = companies.id 
        AND quotations.approval_token IS NOT NULL
    )
);

-- Add index on approval_token for better performance
CREATE INDEX IF NOT EXISTS idx_quotations_approval_token 
ON public.quotations(approval_token) 
WHERE approval_token IS NOT NULL;