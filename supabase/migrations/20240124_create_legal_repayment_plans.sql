
-- Create legal_repayment_plans table
CREATE TABLE IF NOT EXISTS public.legal_repayment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_legal_repayment_plans_case_id ON public.legal_repayment_plans(case_id);
CREATE INDEX IF NOT EXISTS idx_legal_repayment_plans_company_id ON public.legal_repayment_plans(company_id);

-- Add RLS policies
ALTER TABLE public.legal_repayment_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "Users can view repayment plans for their company" ON public.legal_repayment_plans;
DROP POLICY IF EXISTS "Users can insert repayment plans for their company" ON public.legal_repayment_plans;
DROP POLICY IF EXISTS "Users can update repayment plans for their company" ON public.legal_repayment_plans;
DROP POLICY IF EXISTS "Users can delete repayment plans for their company" ON public.legal_repayment_plans;

CREATE POLICY "Users can view repayment plans for their company" ON public.legal_repayment_plans
    FOR SELECT USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert repayment plans for their company" ON public.legal_repayment_plans
    FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update repayment plans for their company" ON public.legal_repayment_plans
    FOR UPDATE USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete repayment plans for their company" ON public.legal_repayment_plans
    FOR DELETE USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
