-- Add legal account types to default_account_types
INSERT INTO public.default_account_types (type_code, type_name, type_name_ar, account_category, description, is_system) VALUES
('LEGAL_FEES_RECEIVABLE', 'Legal Fees Receivable', 'أتعاب قانونية مستحقة', 'assets', 'Receivables for legal fees from clients', true),
('LEGAL_FEES_REVENUE', 'Legal Fees Revenue', 'إيرادات الأتعاب القانونية', 'revenue', 'Revenue from legal services and fees', true),
('COURT_FEES_EXPENSE', 'Court Fees Expense', 'مصروف رسوم المحاكم', 'expenses', 'Expenses for court fees and legal proceedings', true),
('LEGAL_EXPENSES', 'Legal Department Expenses', 'مصاريف القسم القانوني', 'expenses', 'General legal department operational expenses', true),
('LEGAL_SETTLEMENTS_EXPENSE', 'Legal Settlements Expense', 'مصروف التسويات القانونية', 'expenses', 'Expenses for legal settlements and judgments', true),
('LEGAL_SETTLEMENTS_PAYABLE', 'Legal Settlements Payable', 'التسويات القانونية مستحقة الدفع', 'liabilities', 'Payables for legal settlements', true),
('CLIENT_RETAINER_LIABILITY', 'Client Retainer Liability', 'التزامات العقود المقدمة', 'liabilities', 'Client retainer funds held in trust', true),
('LEGAL_CONSULTATION_REVENUE', 'Legal Consultation Revenue', 'إيرادات الاستشارات القانونية', 'revenue', 'Revenue from legal consultation services', true),
('EXPERT_WITNESS_EXPENSE', 'Expert Witness Expense', 'مصروف شهود الخبرة', 'expenses', 'Expenses for expert witness fees', true),
('LEGAL_RESEARCH_EXPENSE', 'Legal Research Expense', 'مصروف البحث القانوني', 'expenses', 'Expenses for legal research and databases', true);

-- Create legal case account mappings table
CREATE TABLE public.legal_case_account_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    case_type TEXT NOT NULL, -- civil, criminal, commercial, labor, administrative
    
    -- Revenue accounts
    legal_fees_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
    consultation_revenue_account_id UUID REFERENCES public.chart_of_accounts(id),
    
    -- Receivable accounts  
    legal_fees_receivable_account_id UUID REFERENCES public.chart_of_accounts(id),
    
    -- Expense accounts
    court_fees_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
    legal_expenses_account_id UUID REFERENCES public.chart_of_accounts(id),
    expert_witness_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
    legal_research_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
    
    -- Settlement accounts
    settlements_expense_account_id UUID REFERENCES public.chart_of_accounts(id),
    settlements_payable_account_id UUID REFERENCES public.chart_of_accounts(id),
    
    -- Liability accounts
    client_retainer_liability_account_id UUID REFERENCES public.chart_of_accounts(id),
    
    -- Default settings
    is_active BOOLEAN DEFAULT true,
    auto_create_journal_entries BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    
    UNIQUE(company_id, case_type)
);

-- Enable RLS
ALTER TABLE public.legal_case_account_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view legal account mappings in their company" 
ON public.legal_case_account_mappings FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage legal account mappings in their company" 
ON public.legal_case_account_mappings FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role))));

-- Create indexes
CREATE INDEX idx_legal_case_account_mappings_company_id ON public.legal_case_account_mappings(company_id);
CREATE INDEX idx_legal_case_account_mappings_case_type ON public.legal_case_account_mappings(case_type);

-- Create trigger for updated_at
CREATE TRIGGER update_legal_case_account_mappings_updated_at
    BEFORE UPDATE ON public.legal_case_account_mappings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get legal account mapping
CREATE OR REPLACE FUNCTION public.get_legal_account_mapping(
    company_id_param UUID,
    case_type_param TEXT,
    account_type_param TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    account_id UUID;
BEGIN
    SELECT 
        CASE account_type_param
            WHEN 'legal_fees_revenue' THEN legal_fees_revenue_account_id
            WHEN 'consultation_revenue' THEN consultation_revenue_account_id
            WHEN 'legal_fees_receivable' THEN legal_fees_receivable_account_id
            WHEN 'court_fees_expense' THEN court_fees_expense_account_id
            WHEN 'legal_expenses' THEN legal_expenses_account_id
            WHEN 'expert_witness_expense' THEN expert_witness_expense_account_id
            WHEN 'legal_research_expense' THEN legal_research_expense_account_id
            WHEN 'settlements_expense' THEN settlements_expense_account_id
            WHEN 'settlements_payable' THEN settlements_payable_account_id
            WHEN 'client_retainer_liability' THEN client_retainer_liability_account_id
            ELSE NULL
        END
    INTO account_id
    FROM public.legal_case_account_mappings
    WHERE company_id = company_id_param 
    AND case_type = case_type_param
    AND is_active = true;
    
    RETURN account_id;
END;
$$;