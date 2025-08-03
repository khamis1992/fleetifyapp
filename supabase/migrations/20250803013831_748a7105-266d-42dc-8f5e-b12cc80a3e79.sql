-- Add contract_id to vehicle_condition_reports table
ALTER TABLE public.vehicle_condition_reports 
ADD COLUMN contract_id UUID REFERENCES public.contracts(id);

-- Create contract_documents table
CREATE TABLE public.contract_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL DEFAULT 'general',
    document_name TEXT NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    is_required BOOLEAN DEFAULT false,
    condition_report_id UUID REFERENCES public.vehicle_condition_reports(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for contract_documents
CREATE POLICY "Users can view contract documents in their company"
ON public.contract_documents
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage contract documents in their company"
ON public.contract_documents
FOR ALL
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role) OR 
      has_role(auth.uid(), 'sales_agent'::user_role)))
);

-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contract-documents', 'contract-documents', false);

-- Create storage policies
CREATE POLICY "Users can view contract documents in their company"
ON storage.objects
FOR SELECT
USING (bucket_id = 'contract-documents' AND 
       EXISTS (
           SELECT 1 FROM public.contract_documents cd
           WHERE cd.file_path = storage.objects.name 
           AND cd.company_id = get_user_company(auth.uid())
       ));

CREATE POLICY "Staff can upload contract documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'contract-documents' AND 
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid() 
                AND (has_role(auth.uid(), 'company_admin'::user_role) OR 
                     has_role(auth.uid(), 'manager'::user_role) OR 
                     has_role(auth.uid(), 'sales_agent'::user_role))
            ));

CREATE POLICY "Staff can update contract documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'contract-documents' AND 
       EXISTS (
           SELECT 1 FROM public.contract_documents cd
           WHERE cd.file_path = storage.objects.name 
           AND cd.company_id = get_user_company(auth.uid())
           AND (has_role(auth.uid(), 'company_admin'::user_role) OR 
                has_role(auth.uid(), 'manager'::user_role) OR 
                has_role(auth.uid(), 'sales_agent'::user_role))
       ));

CREATE POLICY "Staff can delete contract documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'contract-documents' AND 
       EXISTS (
           SELECT 1 FROM public.contract_documents cd
           WHERE cd.file_path = storage.objects.name 
           AND cd.company_id = get_user_company(auth.uid())
           AND (has_role(auth.uid(), 'company_admin'::user_role) OR 
                has_role(auth.uid(), 'manager'::user_role) OR 
                has_role(auth.uid(), 'sales_agent'::user_role))
       ));