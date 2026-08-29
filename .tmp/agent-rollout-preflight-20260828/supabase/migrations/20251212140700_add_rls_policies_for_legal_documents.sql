-- Enable RLS on legal_documents if not already enabled
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their company legal documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Users can insert legal documents for their company" ON public.legal_documents;
DROP POLICY IF EXISTS "Users can update their company legal documents" ON public.legal_documents;
DROP POLICY IF EXISTS "Users can delete their company legal documents" ON public.legal_documents;

-- Allow users to view their company's legal documents
CREATE POLICY "Users can view their company legal documents"
  ON public.legal_documents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow users to insert legal documents for their company
CREATE POLICY "Users can insert legal documents for their company"
  ON public.legal_documents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow users to update their company's legal documents
CREATE POLICY "Users can update their company legal documents"
  ON public.legal_documents FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.employees WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Allow users to delete their company's legal documents
CREATE POLICY "Users can delete their company legal documents"
  ON public.legal_documents FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM public.employees WHERE user_id = auth.uid() AND is_active = true
    )
  );;
