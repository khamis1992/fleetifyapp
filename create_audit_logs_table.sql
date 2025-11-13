-- ============================================
-- Audit Logs Table Creation Script
-- ============================================
-- Purpose: Track all sensitive operations in the system
-- Created: 2025-11-13
-- ============================================

-- Drop existing table if needed (for development only)
-- DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Information
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    user_name TEXT,
    
    -- Company Information (for multi-tenancy)
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Action Details
    action_type TEXT NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, REJECT, CANCEL, ARCHIVE, etc.
    entity_type TEXT NOT NULL, -- contract, customer, vehicle, invoice, payment, employee, etc.
    entity_id UUID, -- ID of the affected entity
    entity_name TEXT, -- Name/title of the affected entity for easier reading
    
    -- Change Details
    old_values JSONB, -- Previous values before the change
    new_values JSONB, -- New values after the change
    changes_summary TEXT, -- Human-readable summary of changes
    
    -- Request Information
    ip_address TEXT,
    user_agent TEXT,
    request_method TEXT, -- GET, POST, PUT, DELETE, etc.
    request_path TEXT,
    
    -- Status and Result
    status TEXT NOT NULL DEFAULT 'success', -- success, failed, pending
    error_message TEXT, -- If action failed
    
    -- Additional Context
    metadata JSONB, -- Any additional information
    notes TEXT, -- Optional notes
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for better performance
    CONSTRAINT valid_action_type CHECK (action_type IN (
        'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 
        'CANCEL', 'ARCHIVE', 'RESTORE', 'EXPORT', 'IMPORT',
        'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE', 'ROLE_CHANGE'
    )),
    
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'pending'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON public.audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view audit logs for their company" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;

-- Policy 1: Users can view audit logs for their company
CREATE POLICY "Users can view audit logs for their company"
ON public.audit_logs
FOR SELECT
USING (
    company_id = public.user_company_id()
    OR user_id = auth.uid()
);

-- Policy 2: System can insert audit logs (authenticated users can create logs)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Policy 3: Super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Grant permissions
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO anon;

-- Create a helper function to log actions
CREATE OR REPLACE FUNCTION public.log_audit(
    p_action_type TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_changes_summary TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_audit_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_company_id UUID;
BEGIN
    -- Get user information
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = auth.uid();
    
    -- Get user name from profiles if exists
    SELECT full_name INTO v_user_name
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Get company_id
    v_company_id := public.user_company_id();
    
    -- Insert audit log
    INSERT INTO public.audit_logs (
        user_id,
        user_email,
        user_name,
        company_id,
        action_type,
        entity_type,
        entity_id,
        entity_name,
        old_values,
        new_values,
        changes_summary,
        metadata,
        notes,
        status
    ) VALUES (
        auth.uid(),
        v_user_email,
        v_user_name,
        v_company_id,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_entity_name,
        p_old_values,
        p_new_values,
        p_changes_summary,
        p_metadata,
        p_notes,
        'success'
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.log_audit TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.audit_logs IS 'Audit trail for all sensitive operations in the system';
COMMENT ON COLUMN public.audit_logs.action_type IS 'Type of action performed (CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type of entity affected (contract, customer, vehicle, etc.)';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Previous values before the change (JSON)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'New values after the change (JSON)';
COMMENT ON COLUMN public.audit_logs.status IS 'Status of the action (success, failed, pending)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Audit logs table created successfully!';
    RAISE NOTICE 'Indexes created for optimal performance';
    RAISE NOTICE 'Row Level Security enabled';
    RAISE NOTICE 'Helper function log_audit() created';
END $$;
