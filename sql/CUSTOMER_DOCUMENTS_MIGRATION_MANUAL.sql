-- ============================================================
-- Customer Documents Table Migration
-- Run this in Supabase SQL Editor
-- Date: 2025-11-02
-- ============================================================

-- Step 1: Create customer_documents table
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

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer ON public.customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_company ON public.customer_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_type ON public.customer_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_customer_documents_uploaded_at ON public.customer_documents(uploaded_at DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
-- Policy for SELECT
DROP POLICY IF EXISTS "Users can view customer documents from their company" ON public.customer_documents;
CREATE POLICY "Users can view customer documents from their company"
  ON public.customer_documents
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Policy for INSERT
DROP POLICY IF EXISTS "Users can insert customer documents to their company" ON public.customer_documents;
CREATE POLICY "Users can insert customer documents to their company"
  ON public.customer_documents
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Policy for UPDATE
DROP POLICY IF EXISTS "Users can update customer documents from their company" ON public.customer_documents;
CREATE POLICY "Users can update customer documents from their company"
  ON public.customer_documents
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Policy for DELETE
DROP POLICY IF EXISTS "Users can delete customer documents from their company" ON public.customer_documents;
CREATE POLICY "Users can delete customer documents from their company"
  ON public.customer_documents
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Step 5: Add table comment
COMMENT ON TABLE public.customer_documents IS 'Stores customer-related documents such as IDs, licenses, contracts, etc.';

-- ============================================================
-- STORAGE BUCKET SETUP
-- Note: Storage buckets and policies must be created in the Supabase Dashboard
-- Follow these steps:
-- 
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "Create a new bucket"
-- 3. Bucket name: customer-documents
-- 4. Public: No (unchecked)
-- 5. Click "Create bucket"
-- 
-- Then add these policies in the Storage Policies section:
-- 
-- Policy 1: "Users can upload customer documents"
--   Operation: INSERT
--   Policy definition:
--     bucket_id = 'customer-documents' AND
--     auth.uid() IN (SELECT user_id FROM public.profiles)
-- 
-- Policy 2: "Users can view customer documents"
--   Operation: SELECT
--   Policy definition:
--     bucket_id = 'customer-documents' AND
--     auth.uid() IN (SELECT user_id FROM public.profiles)
-- 
-- Policy 3: "Users can update customer documents"
--   Operation: UPDATE
--   Policy definition:
--     bucket_id = 'customer-documents' AND
--     auth.uid() IN (SELECT user_id FROM public.profiles)
-- 
-- Policy 4: "Users can delete customer documents"
--   Operation: DELETE
--   Policy definition:
--     bucket_id = 'customer-documents' AND
--     auth.uid() IN (SELECT user_id FROM public.profiles)
-- ============================================================

-- Verification Query
SELECT 
  table_name,
  column_name,
  data_type
FROM 
  information_schema.columns
WHERE 
  table_name = 'customer_documents'
ORDER BY 
  ordinal_position;

