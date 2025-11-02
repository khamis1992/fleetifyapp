-- Create customer_documents table
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_customer_documents_customer ON public.customer_documents(customer_id);
CREATE INDEX idx_customer_documents_company ON public.customer_documents(company_id);
CREATE INDEX idx_customer_documents_type ON public.customer_documents(document_type);
CREATE INDEX idx_customer_documents_uploaded_at ON public.customer_documents(uploaded_at DESC);

-- Enable RLS
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view customer documents from their company"
  ON public.customer_documents
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert customer documents to their company"
  ON public.customer_documents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update customer documents from their company"
  ON public.customer_documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete customer documents from their company"
  ON public.customer_documents
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Create storage bucket for customer documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer-documents bucket
CREATE POLICY "Users can upload customer documents for their company"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-documents' AND
    auth.uid() IN (
      SELECT user_id FROM public.profiles
    )
  );

CREATE POLICY "Users can view customer documents from their company"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'customer-documents' AND
    auth.uid() IN (
      SELECT user_id FROM public.profiles
    )
  );

CREATE POLICY "Users can update customer documents from their company"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'customer-documents' AND
    auth.uid() IN (
      SELECT user_id FROM public.profiles
    )
  );

CREATE POLICY "Users can delete customer documents from their company"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'customer-documents' AND
    auth.uid() IN (
      SELECT user_id FROM public.profiles
    )
  );

-- Add comment
COMMENT ON TABLE public.customer_documents IS 'Stores customer-related documents such as IDs, licenses, contracts, etc.';

