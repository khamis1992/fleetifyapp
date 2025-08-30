-- Fix security definer view and create missing tables for financial obligations

-- 1. Drop and recreate v_linkable_accounts without SECURITY DEFINER
DROP VIEW IF EXISTS v_linkable_accounts;

CREATE VIEW v_linkable_accounts AS
SELECT 
    c.id,
    c.account_code,
    c.account_name,
    c.account_name_ar,
    c.account_type,
    c.account_subtype,
    c.company_id,
    c.is_active,
    c.can_link_customers,
    c.can_link_vendors,
    c.can_link_employees,
    c.current_balance,
    c.is_header,
    c.account_level
FROM chart_of_accounts c
WHERE c.is_active = true 
  AND c.is_header = false;

-- Enable RLS on the view  
ALTER VIEW v_linkable_accounts OWNER TO postgres;

-- 2. Create financial_obligations table
CREATE TABLE IF NOT EXISTS public.financial_obligations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    contract_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    obligation_type TEXT NOT NULL CHECK (obligation_type IN ('installment', 'deposit', 'fee', 'penalty', 'insurance')),
    amount NUMERIC NOT NULL DEFAULT 0,
    original_amount NUMERIC NOT NULL DEFAULT 0,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partially_paid', 'cancelled')),
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    days_overdue INTEGER NOT NULL DEFAULT 0,
    obligation_number TEXT,
    description TEXT,
    reference_number TEXT,
    invoice_id UUID,
    journal_entry_id UUID,
    payment_method TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on financial_obligations
ALTER TABLE public.financial_obligations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for financial_obligations
CREATE POLICY "Users can view financial obligations in their company" 
ON public.financial_obligations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage financial obligations in their company" 
ON public.financial_obligations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- 3. Create payment_allocations table
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    payment_id UUID NOT NULL,
    obligation_id UUID NOT NULL REFERENCES public.financial_obligations(id),
    allocated_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    allocation_type TEXT NOT NULL CHECK (allocation_type IN ('automatic', 'manual')),
    allocation_strategy TEXT CHECK (allocation_strategy IN ('fifo', 'highest_interest', 'nearest_due', 'manual')),
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    allocation_notes TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on payment_allocations
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_allocations
CREATE POLICY "Users can view payment allocations in their company" 
ON public.payment_allocations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage payment allocations in their company" 
ON public.payment_allocations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- 4. Create customer_financial_balances table
CREATE TABLE IF NOT EXISTS public.customer_financial_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    contract_id UUID,
    company_id UUID NOT NULL,
    remaining_balance NUMERIC NOT NULL DEFAULT 0,
    overdue_amount NUMERIC NOT NULL DEFAULT 0,
    current_amount NUMERIC NOT NULL DEFAULT 0,
    aging_30_days NUMERIC NOT NULL DEFAULT 0,
    aging_60_days NUMERIC NOT NULL DEFAULT 0,
    aging_90_days NUMERIC NOT NULL DEFAULT 0,
    aging_over_90_days NUMERIC NOT NULL DEFAULT 0,
    days_overdue INTEGER NOT NULL DEFAULT 0,
    last_payment_date DATE,
    last_payment_amount NUMERIC NOT NULL DEFAULT 0,
    total_paid NUMERIC NOT NULL DEFAULT 0,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    available_credit NUMERIC NOT NULL DEFAULT 0,
    total_obligations INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(customer_id, contract_id, company_id)
);

-- Enable RLS on customer_financial_balances
ALTER TABLE public.customer_financial_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_financial_balances
CREATE POLICY "Users can view customer financial balances in their company" 
ON public.customer_financial_balances 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage customer financial balances in their company" 
ON public.customer_financial_balances 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- 5. Create customer_aging_analysis table
CREATE TABLE IF NOT EXISTS public.customer_aging_analysis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    company_id UUID NOT NULL,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_amount NUMERIC NOT NULL DEFAULT 0,
    days_30 NUMERIC NOT NULL DEFAULT 0,
    days_60 NUMERIC NOT NULL DEFAULT 0,
    days_90 NUMERIC NOT NULL DEFAULT 0,
    over_90_days NUMERIC NOT NULL DEFAULT 0,
    total_outstanding NUMERIC NOT NULL DEFAULT 0,
    overdue_percentage NUMERIC NOT NULL DEFAULT 0,
    payment_trend TEXT,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    available_credit NUMERIC NOT NULL DEFAULT 0,
    last_payment_date DATE,
    average_days_to_pay INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(customer_id, company_id, analysis_date)
);

-- Enable RLS on customer_aging_analysis
ALTER TABLE public.customer_aging_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_aging_analysis
CREATE POLICY "Users can view customer aging analysis in their company" 
ON public.customer_aging_analysis 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage customer aging analysis in their company" 
ON public.customer_aging_analysis 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- 6. Create function for customer financial obligations view
CREATE OR REPLACE FUNCTION get_customer_financial_obligations(
    customer_id_param UUID DEFAULT NULL,
    company_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    contract_id UUID,
    customer_id UUID,
    obligation_type TEXT,
    amount NUMERIC,
    original_amount NUMERIC,
    due_date DATE,
    status TEXT,
    paid_amount NUMERIC,
    remaining_amount NUMERIC,
    days_overdue INTEGER,
    obligation_number TEXT,
    description TEXT,
    reference_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fo.id,
        fo.company_id,
        fo.contract_id,
        fo.customer_id,
        fo.obligation_type,
        fo.amount,
        fo.original_amount,
        fo.due_date,
        fo.status,
        fo.paid_amount,
        fo.remaining_amount,
        fo.days_overdue,
        fo.obligation_number,
        fo.description,
        fo.reference_number,
        fo.created_at,
        fo.updated_at
    FROM public.financial_obligations fo
    WHERE 
        (customer_id_param IS NULL OR fo.customer_id = customer_id_param)
        AND (company_id_param IS NULL OR fo.company_id = company_id_param)
        AND fo.company_id = get_user_company(auth.uid());
END;
$$;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_obligations_customer_company ON public.financial_obligations(customer_id, company_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_contract ON public.financial_obligations(contract_id);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_due_date ON public.financial_obligations(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_obligations_status ON public.financial_obligations(status);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_obligation ON public.payment_allocations(obligation_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_company ON public.payment_allocations(company_id);

CREATE INDEX IF NOT EXISTS idx_customer_financial_balances_customer ON public.customer_financial_balances(customer_id, company_id);
CREATE INDEX IF NOT EXISTS idx_customer_financial_balances_contract ON public.customer_financial_balances(contract_id);

CREATE INDEX IF NOT EXISTS idx_customer_aging_analysis_customer ON public.customer_aging_analysis(customer_id, company_id);
CREATE INDEX IF NOT EXISTS idx_customer_aging_analysis_date ON public.customer_aging_analysis(analysis_date);