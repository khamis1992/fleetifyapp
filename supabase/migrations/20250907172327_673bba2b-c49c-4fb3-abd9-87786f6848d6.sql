-- Create csv_file_archives table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.csv_file_archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_content TEXT,
  storage_path TEXT,
  upload_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processing_status TEXT NOT NULL DEFAULT 'pending',
  processing_results JSONB DEFAULT '{}',
  total_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  created_contracts_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_archived BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.csv_file_archives ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Policy for viewing archives
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'csv_file_archives' 
    AND policyname = 'Users can view archives in their company'
  ) THEN
    CREATE POLICY "Users can view archives in their company"
    ON public.csv_file_archives
    FOR SELECT
    USING (company_id = get_user_company(auth.uid()));
  END IF;

  -- Policy for creating archives
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'csv_file_archives' 
    AND policyname = 'Users can create archives in their company'
  ) THEN
    CREATE POLICY "Users can create archives in their company"
    ON public.csv_file_archives
    FOR INSERT
    WITH CHECK (company_id = get_user_company(auth.uid()) AND uploaded_by = auth.uid());
  END IF;

  -- Policy for admins to manage all archives
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'csv_file_archives' 
    AND policyname = 'Admins can manage archives in their company'
  ) THEN
    CREATE POLICY "Admins can manage archives in their company"
    ON public.csv_file_archives
    FOR ALL
    USING (has_role(auth.uid(), 'super_admin'::user_role) OR (company_id = get_user_company(auth.uid()) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))));
  END IF;
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_csv_file_archives_updated_at'
  ) THEN
    CREATE TRIGGER update_csv_file_archives_updated_at
      BEFORE UPDATE ON public.csv_file_archives
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;