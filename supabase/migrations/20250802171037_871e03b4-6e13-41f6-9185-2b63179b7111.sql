-- Phase 1: Enhanced Customer Financial Schema
-- Create customer balances tracking table
CREATE TABLE IF NOT EXISTS public.customer_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    account_id UUID,
    current_balance NUMERIC NOT NULL DEFAULT 0,
    last_payment_date DATE,
    last_payment_amount NUMERIC DEFAULT 0,
    credit_limit NUMERIC DEFAULT 0,
    credit_used NUMERIC DEFAULT 0,
    credit_available NUMERIC DEFAULT 0,
    overdue_amount NUMERIC DEFAULT 0,
    days_overdue INTEGER DEFAULT 0,
    last_statement_date DATE,
    next_statement_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer aging analysis table
CREATE TABLE IF NOT EXISTS public.customer_aging_analysis (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_amount NUMERIC DEFAULT 0,
    days_1_30 NUMERIC DEFAULT 0,
    days_31_60 NUMERIC DEFAULT 0,
    days_61_90 NUMERIC DEFAULT 0,
    days_91_120 NUMERIC DEFAULT 0,
    days_over_120 NUMERIC DEFAULT 0,
    total_outstanding NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer credit history table
CREATE TABLE IF NOT EXISTS public.customer_credit_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    transaction_type TEXT NOT NULL, -- 'credit_limit_change', 'payment', 'charge', 'adjustment'
    amount NUMERIC NOT NULL,
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    description TEXT,
    reference_id UUID, -- Reference to invoice, payment, contract, etc.
    reference_type TEXT, -- 'invoice', 'payment', 'contract', 'manual_adjustment'
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer financial summary view
CREATE TABLE IF NOT EXISTS public.customer_financial_summary (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_invoiced NUMERIC DEFAULT 0,
    total_paid NUMERIC DEFAULT 0,
    total_outstanding NUMERIC DEFAULT 0,
    average_days_to_pay NUMERIC DEFAULT 0,
    payment_frequency INTEGER DEFAULT 0, -- payments per month
    credit_score INTEGER DEFAULT 0, -- 0-100 score
    risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
    last_payment_date DATE,
    largest_outstanding_invoice NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_balances_customer_id ON public.customer_balances(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_balances_company_id ON public.customer_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_aging_customer_id ON public.customer_aging_analysis(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_aging_analysis_date ON public.customer_aging_analysis(analysis_date);
CREATE INDEX IF NOT EXISTS idx_customer_credit_history_customer_id ON public.customer_credit_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_financial_summary_customer_id ON public.customer_financial_summary(customer_id);

-- Add RLS policies
ALTER TABLE public.customer_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_aging_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_financial_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_balances
CREATE POLICY "Users can view customer balances in their company" 
ON public.customer_balances FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage customer balances in their company" 
ON public.customer_balances FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- RLS policies for customer_aging_analysis
CREATE POLICY "Users can view aging analysis in their company" 
ON public.customer_aging_analysis FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage aging analysis in their company" 
ON public.customer_aging_analysis FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- RLS policies for customer_credit_history
CREATE POLICY "Users can view credit history in their company" 
ON public.customer_credit_history FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage credit history in their company" 
ON public.customer_credit_history FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- RLS policies for customer_financial_summary
CREATE POLICY "Users can view financial summary in their company" 
ON public.customer_financial_summary FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage financial summary in their company" 
ON public.customer_financial_summary FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- Add update triggers
CREATE TRIGGER update_customer_balances_updated_at
    BEFORE UPDATE ON public.customer_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_financial_summary_updated_at
    BEFORE UPDATE ON public.customer_financial_summary
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();