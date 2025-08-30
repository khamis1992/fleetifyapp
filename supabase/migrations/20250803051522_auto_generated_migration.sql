-- Step 1: Fix storage policies and create unified permission system

-- First, drop existing storage policies that may be causing conflicts
DROP POLICY IF EXISTS "Users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update contract documents" ON storage.objects;

-- Create a unified permission function that works for both database and storage
CREATE OR REPLACE FUNCTION public.can_access_contract_documents(
  _user_id uuid, 
  _company_id uuid DEFAULT NULL,
  _action text DEFAULT 'SELECT'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
  user_roles text[];
BEGIN
  -- Get user's company and roles
  SELECT company_id INTO user_company_id
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  -- Get user roles
  SELECT array_agg(role::text) INTO user_roles
  FROM public.user_roles 
  WHERE user_id = _user_id;
  
  -- Super admin can do everything
  IF 'super_admin' = ANY(user_roles) THEN
    RETURN true;
  END IF;
  
  -- Company admins and managers can manage documents in their company
  IF ('company_admin' = ANY(user_roles) OR 'manager' = ANY(user_roles)) 
     AND user_company_id = COALESCE(_company_id, user_company_id) THEN
    RETURN true;
  END IF;
  
  -- Sales agents can view and create documents in their company
  IF 'sales_agent' = ANY(user_roles) 
     AND user_company_id = COALESCE(_company_id, user_company_id)
     AND _action IN ('SELECT', 'INSERT') THEN
    RETURN true;
  END IF;
  
  -- Default deny
  RETURN false;
END;
$$;

-- Create new unified storage policies using the permission function
CREATE POLICY "Unified contract documents upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'contract-documents' 
  AND public.can_access_contract_documents(auth.uid(), NULL, 'INSERT')
);

CREATE POLICY "Unified contract documents select" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'contract-documents' 
  AND public.can_access_contract_documents(auth.uid(), NULL, 'SELECT')
);

CREATE POLICY "Unified contract documents update" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'contract-documents' 
  AND public.can_access_contract_documents(auth.uid(), NULL, 'UPDATE')
);

CREATE POLICY "Unified contract documents delete" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'contract-documents' 
  AND public.can_access_contract_documents(auth.uid(), NULL, 'DELETE')
);

-- Create enhanced logging table for document operations
CREATE TABLE IF NOT EXISTS public.contract_document_operation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  contract_id uuid,
  document_id uuid,
  operation_type text NOT NULL,
  operation_status text NOT NULL DEFAULT 'pending',
  file_path text,
  error_message text,
  error_code text,
  retry_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  performed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.contract_document_operation_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for the log table
CREATE POLICY "Users can view document operation logs in their company"
ON public.contract_document_operation_log FOR SELECT
USING (public.can_access_contract_documents(auth.uid(), company_id, 'SELECT'));

CREATE POLICY "System can manage document operation logs"
ON public.contract_document_operation_log FOR ALL
USING (true);

-- Create function to safely create contract documents with rollback
CREATE OR REPLACE FUNCTION public.create_contract_document_with_rollback(
  p_contract_id uuid,
  p_document_type text,
  p_document_name text,
  p_file_path text DEFAULT NULL,
  p_file_size bigint DEFAULT NULL,
  p_mime_type text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_required boolean DEFAULT false,
  p_condition_report_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id uuid;
  v_company_id uuid;
  v_user_id uuid := auth.uid();
  v_log_id uuid;
BEGIN
  -- Get company_id if not provided
  IF p_company_id IS NULL THEN
    SELECT company_id INTO v_company_id
    FROM public.profiles 
    WHERE user_id = v_user_id;
  ELSE
    v_company_id := p_company_id;
  END IF;
  
  -- Check permissions
  IF NOT public.can_access_contract_documents(v_user_id, v_company_id, 'INSERT') THEN
    RAISE EXCEPTION 'Insufficient permissions to create contract document';
  END IF;
  
  -- Create operation log entry
  INSERT INTO public.contract_document_operation_log (
    company_id, contract_id, operation_type, operation_status, 
    file_path, performed_by, metadata
  ) VALUES (
    v_company_id, p_contract_id, 'create_document', 'started',
    p_file_path, v_user_id, jsonb_build_object(
      'document_type', p_document_type,
      'document_name', p_document_name,
      'file_size', p_file_size
    )
  ) RETURNING id INTO v_log_id;
  
  -- Create the document record
  INSERT INTO public.contract_documents (
    company_id,
    contract_id,
    document_type,
    document_name,
    file_path,
    file_size,
    mime_type,
    uploaded_by,
    notes,
    is_required,
    condition_report_id
  ) VALUES (
    v_company_id,
    p_contract_id,
    p_document_type,
    p_document_name,
    p_file_path,
    p_file_size,
    p_mime_type,
    v_user_id,
    p_notes,
    p_is_required,
    p_condition_report_id
  ) RETURNING id INTO v_document_id;
  
  -- Update log with success
  UPDATE public.contract_document_operation_log 
  SET 
    operation_status = 'completed',
    document_id = v_document_id,
    completed_at = now()
  WHERE id = v_log_id;
  
  RETURN v_document_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Update log with error
  UPDATE public.contract_document_operation_log 
  SET 
    operation_status = 'failed',
    error_message = SQLERRM,
    error_code = SQLSTATE,
    completed_at = now()
  WHERE id = v_log_id;
  
  RAISE;
END;
$$;

-- Create function to cleanup orphaned files
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_contract_files()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleanup_count integer := 0;
  file_record record;
BEGIN
  -- Find files in storage that don't have corresponding database records
  -- This would need to be implemented with actual storage listing in the application
  -- For now, this is a placeholder that can be called by an edge function
  
  -- Log cleanup operation
  INSERT INTO public.contract_document_operation_log (
    company_id, operation_type, operation_status, metadata, performed_by
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', 'cleanup_orphaned_files', 'completed',
    jsonb_build_object('files_cleaned', cleanup_count), auth.uid()
  );
  
  RETURN cleanup_count;
END;
$$;