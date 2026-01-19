-- Create CSV file archives table
CREATE TABLE public.csv_file_archives (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_content TEXT, -- Store CSV content as text
    storage_path TEXT, -- Path in Supabase Storage if we store as file
    upload_type TEXT NOT NULL DEFAULT 'contracts', -- contracts, customers, vehicles, etc.
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processing_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    processing_results JSONB DEFAULT '{}',
    total_rows INTEGER DEFAULT 0,
    successful_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    created_contracts_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Array of created contract IDs
    is_archived BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.csv_file_archives ENABLE ROW LEVEL SECURITY;

-- Create policies for CSV file archives
CREATE POLICY "Users can view archives in their company" 
ON public.csv_file_archives 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create archives in their company" 
ON public.csv_file_archives 
FOR INSERT 
WITH CHECK (company_id = get_user_company(auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Admins can manage archives in their company" 
ON public.csv_file_archives 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- Create storage bucket for CSV files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('csv-archives', 'csv-archives', false);

-- Create storage policies for CSV archives
CREATE POLICY "Users can upload CSV files to their company folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'csv-archives' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.foldername(name))[2] = get_user_company(auth.uid())::text
);

CREATE POLICY "Users can view CSV files in their company folder" 
ON storage.objects 
FOR SELECT 
USING (
    bucket_id = 'csv-archives' AND 
    (storage.foldername(name))[2] = get_user_company(auth.uid())::text
);

CREATE POLICY "Admins can manage CSV files in their company folder" 
ON storage.objects 
FOR ALL 
USING (
    bucket_id = 'csv-archives' AND 
    (storage.foldername(name))[2] = get_user_company(auth.uid())::text AND
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'super_admin'::user_role))
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_csv_file_archives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_csv_file_archives_updated_at
  BEFORE UPDATE ON public.csv_file_archives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_csv_file_archives_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_csv_file_archives_company_id ON public.csv_file_archives(company_id);
CREATE INDEX idx_csv_file_archives_uploaded_by ON public.csv_file_archives(uploaded_by);
CREATE INDEX idx_csv_file_archives_upload_type ON public.csv_file_archives(upload_type);
CREATE INDEX idx_csv_file_archives_processing_status ON public.csv_file_archives(processing_status);
CREATE INDEX idx_csv_file_archives_uploaded_at ON public.csv_file_archives(uploaded_at DESC);