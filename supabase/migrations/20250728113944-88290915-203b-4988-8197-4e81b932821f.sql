-- Create legal cases table
CREATE TABLE public.legal_cases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    case_number VARCHAR(50) NOT NULL,
    case_title TEXT NOT NULL,
    case_title_ar TEXT,
    case_type TEXT NOT NULL DEFAULT 'civil', -- civil, criminal, commercial, labor, administrative
    case_status TEXT NOT NULL DEFAULT 'active', -- active, closed, suspended, on_hold
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    
    -- Client information
    client_id UUID, -- Reference to customers table
    client_name TEXT,
    client_phone TEXT,
    client_email TEXT,
    
    -- Case details
    description TEXT,
    case_value NUMERIC DEFAULT 0,
    court_name TEXT,
    court_name_ar TEXT,
    case_reference TEXT,
    filing_date DATE,
    hearing_date TIMESTAMP WITH TIME ZONE,
    statute_limitations DATE,
    
    -- Legal team
    primary_lawyer_id UUID, -- Reference to employees table
    legal_team JSONB DEFAULT '[]'::jsonb,
    
    -- Financial
    legal_fees NUMERIC DEFAULT 0,
    court_fees NUMERIC DEFAULT 0,
    other_expenses NUMERIC DEFAULT 0,
    total_costs NUMERIC DEFAULT 0,
    billing_status TEXT DEFAULT 'pending', -- pending, billed, paid, overdue
    
    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    is_confidential BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal case documents table
CREATE TABLE public.legal_case_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    
    document_type TEXT NOT NULL, -- contract, evidence, correspondence, court_filing, judgment, settlement
    document_title TEXT NOT NULL,
    document_title_ar TEXT,
    description TEXT,
    
    -- File information
    file_name TEXT,
    file_path TEXT,
    file_size BIGINT,
    file_type TEXT,
    
    -- Document metadata
    document_date DATE,
    is_confidential BOOLEAN DEFAULT false,
    is_original BOOLEAN DEFAULT true,
    version_number INTEGER DEFAULT 1,
    parent_document_id UUID,
    
    -- Access control
    access_level TEXT DEFAULT 'internal', -- public, internal, confidential, restricted
    
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal case correspondence table
CREATE TABLE public.legal_case_correspondence (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    
    correspondence_type TEXT NOT NULL, -- email, letter, phone_call, meeting, court_hearing
    subject TEXT NOT NULL,
    content TEXT,
    
    -- Parties involved
    sender_name TEXT,
    sender_email TEXT,
    sender_phone TEXT,
    recipient_name TEXT,
    recipient_email TEXT,
    recipient_phone TEXT,
    
    -- Communication details
    communication_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    direction TEXT NOT NULL, -- incoming, outgoing
    status TEXT DEFAULT 'sent', -- draft, sent, received, replied
    
    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Follow-up
    requires_response BOOLEAN DEFAULT false,
    response_deadline DATE,
    is_confidential BOOLEAN DEFAULT false,
    
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal case payments table
CREATE TABLE public.legal_case_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    
    payment_type TEXT NOT NULL, -- legal_fees, court_fees, expenses, settlement, damages
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    
    -- Payment details
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_method TEXT, -- cash, bank_transfer, check, credit_card
    payment_status TEXT DEFAULT 'pending', -- pending, paid, overdue, cancelled
    due_date DATE,
    
    -- References
    invoice_id UUID, -- Reference to invoices table
    journal_entry_id UUID, -- Reference to journal_entries table
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create legal case activities table (for timeline/audit trail)
CREATE TABLE public.legal_case_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    
    activity_type TEXT NOT NULL, -- case_created, document_added, hearing_scheduled, payment_received, status_changed
    activity_title TEXT NOT NULL,
    activity_description TEXT,
    
    -- Activity metadata
    activity_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    old_values JSONB,
    new_values JSONB,
    
    -- References
    related_document_id UUID,
    related_correspondence_id UUID,
    related_payment_id UUID,
    
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_legal_cases_company_id ON public.legal_cases(company_id);
CREATE INDEX idx_legal_cases_status ON public.legal_cases(case_status);
CREATE INDEX idx_legal_cases_client_id ON public.legal_cases(client_id);
CREATE INDEX idx_legal_cases_lawyer_id ON public.legal_cases(primary_lawyer_id);
CREATE INDEX idx_legal_cases_hearing_date ON public.legal_cases(hearing_date);

CREATE INDEX idx_legal_case_documents_case_id ON public.legal_case_documents(case_id);
CREATE INDEX idx_legal_case_documents_company_id ON public.legal_case_documents(company_id);
CREATE INDEX idx_legal_case_documents_type ON public.legal_case_documents(document_type);

CREATE INDEX idx_legal_case_correspondence_case_id ON public.legal_case_correspondence(case_id);
CREATE INDEX idx_legal_case_correspondence_company_id ON public.legal_case_correspondence(company_id);
CREATE INDEX idx_legal_case_correspondence_date ON public.legal_case_correspondence(communication_date);

CREATE INDEX idx_legal_case_payments_case_id ON public.legal_case_payments(case_id);
CREATE INDEX idx_legal_case_payments_company_id ON public.legal_case_payments(company_id);
CREATE INDEX idx_legal_case_payments_status ON public.legal_case_payments(payment_status);

CREATE INDEX idx_legal_case_activities_case_id ON public.legal_case_activities(case_id);
CREATE INDEX idx_legal_case_activities_company_id ON public.legal_case_activities(company_id);
CREATE INDEX idx_legal_case_activities_date ON public.legal_case_activities(activity_date);

-- Enable Row Level Security
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_correspondence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_case_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for legal_cases
CREATE POLICY "Users can view legal cases in their company" 
ON public.legal_cases FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage legal cases in their company" 
ON public.legal_cases FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))));

-- Create RLS policies for legal_case_documents
CREATE POLICY "Users can view case documents in their company" 
ON public.legal_case_documents FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage case documents in their company" 
ON public.legal_case_documents FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))));

-- Create RLS policies for legal_case_correspondence
CREATE POLICY "Users can view case correspondence in their company" 
ON public.legal_case_correspondence FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage case correspondence in their company" 
ON public.legal_case_correspondence FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))));

-- Create RLS policies for legal_case_payments
CREATE POLICY "Users can view case payments in their company" 
ON public.legal_case_payments FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage case payments in their company" 
ON public.legal_case_payments FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))));

-- Create RLS policies for legal_case_activities
CREATE POLICY "Users can view case activities in their company" 
ON public.legal_case_activities FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage case activities in their company" 
ON public.legal_case_activities FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR 
       (company_id = get_user_company(auth.uid()) AND 
        (has_role(auth.uid(), 'company_admin'::user_role) OR 
         has_role(auth.uid(), 'manager'::user_role) OR 
         has_role(auth.uid(), 'sales_agent'::user_role))));

-- Create triggers for updated_at columns
CREATE TRIGGER update_legal_cases_updated_at
    BEFORE UPDATE ON public.legal_cases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_case_documents_updated_at
    BEFORE UPDATE ON public.legal_case_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_case_correspondence_updated_at
    BEFORE UPDATE ON public.legal_case_correspondence
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_case_payments_updated_at
    BEFORE UPDATE ON public.legal_case_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate case numbers
CREATE OR REPLACE FUNCTION public.generate_legal_case_number(company_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    case_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- Get current year
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Count existing cases for this company in current year
    SELECT COUNT(*) + 1 INTO case_count
    FROM public.legal_cases 
    WHERE company_id = company_id_param 
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Return formatted case number
    RETURN 'CASE-' || year_suffix || '-' || LPAD(case_count::TEXT, 4, '0');
END;
$$;