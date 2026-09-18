-- Add missing columns to legal_documents table
ALTER TABLE public.legal_documents 
ADD COLUMN IF NOT EXISTS document_number varchar(50),
ADD COLUMN IF NOT EXISTS document_title varchar(255),
ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create index for document_number
CREATE INDEX IF NOT EXISTS idx_legal_documents_document_number ON public.legal_documents(document_number);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_legal_documents_status ON public.legal_documents(status);

-- Create index for created_by
CREATE INDEX IF NOT EXISTS idx_legal_documents_created_by ON public.legal_documents(created_by);;
