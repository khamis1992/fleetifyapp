-- Create storage bucket for saved CSV files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'saved-csv-files', 
  'saved-csv-files', 
  false,
  10485760, -- 10MB limit
  ARRAY['text/csv', 'application/csv', 'text/plain']::text[]
);

-- Create storage policies for saved CSV files
CREATE POLICY "Users can upload CSV files to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'saved-csv-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their company CSV files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'saved-csv-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their company CSV files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'saved-csv-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table for saved CSV files metadata
CREATE TABLE public.saved_csv_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  file_name text NOT NULL,
  original_file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL DEFAULT 'contracts', -- contracts, customers, vehicles, etc.
  row_count integer,
  status text NOT NULL DEFAULT 'saved', -- saved, processing, imported, error
  last_import_at timestamp with time zone,
  last_import_status text, -- success, partial, failed
  last_import_summary jsonb,
  upload_method text DEFAULT 'manual', -- manual, api, bulk
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_csv_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage saved CSV files in their company"
ON public.saved_csv_files
FOR ALL
USING (company_id = get_user_company(auth.uid()));

-- Create indexes
CREATE INDEX idx_saved_csv_files_company_id ON public.saved_csv_files(company_id);
CREATE INDEX idx_saved_csv_files_file_type ON public.saved_csv_files(file_type);
CREATE INDEX idx_saved_csv_files_status ON public.saved_csv_files(status);
CREATE INDEX idx_saved_csv_files_created_at ON public.saved_csv_files(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_saved_csv_files_updated_at
  BEFORE UPDATE ON public.saved_csv_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();