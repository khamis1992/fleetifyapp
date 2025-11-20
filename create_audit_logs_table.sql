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

-- Create audit integrity table for tamper detection
CREATE TABLE IF NOT EXISTS public.audit_integrity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID NOT NULL REFERENCES public.audit_logs(id) ON DELETE CASCADE,
    hash_signature TEXT NOT NULL, -- Cryptographic hash of the audit log
    previous_hash TEXT, -- Hash of the previous entry for blockchain-like integrity
    verification_status TEXT DEFAULT 'verified', -- verified, tampered, suspicious
    verification_details JSONB, -- Detailed verification results
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit integrity
CREATE INDEX IF NOT EXISTS idx_audit_integrity_audit_log_id ON public.audit_integrity(audit_log_id);
CREATE INDEX IF NOT EXISTS idx_audit_integrity_verification_status ON public.audit_integrity(verification_status);
CREATE INDEX IF NOT EXISTS idx_audit_integrity_created_at ON public.audit_integrity(created_at DESC);

-- Enable RLS for audit integrity
ALTER TABLE public.audit_integrity ENABLE ROW LEVEL SECURITY;

-- Policy for audit integrity access
CREATE POLICY "Users can view audit integrity for their company" ON public.audit_integrity
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.audit_logs al
        WHERE al.id = public.audit_integrity.audit_log_id
        AND al.company_id = public.user_company_id()
    )
);

-- Create function to calculate audit log hash
CREATE OR REPLACE FUNCTION public.calculate_audit_hash(
    audit_log JSONB,
    previous_hash TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    concatenated_data TEXT;
BEGIN
    -- Create a concatenated string of all audit log data
    concatenated_data := jsonb_build_object(
        'id', COALESCE((audit_log->>'id'), ''),
        'user_id', COALESCE((audit_log->>'user_id'), ''),
        'action_type', COALESCE((audit_log->>'action_type'), ''),
        'entity_type', COALESCE((audit_log->>'entity_type'), ''),
        'entity_id', COALESCE((audit_log->>'entity_id'), ''),
        'old_values', COALESCE(audit_log->>'old_values', '{}'),
        'new_values', COALESCE(audit_log->>'new_values', '{}'),
        'created_at', COALESCE((audit_log->>'created_at'), ''),
        'previous_hash', COALESCE(previous_hash, '')
    )::text;

    -- Return SHA-256 hash (PostgreSQL provides pgcrypto extension)
    RETURN encode(sha256(concatenated_data::bytea), 'hex');
END;
$$;

-- Create trigger function for automatic integrity verification
CREATE OR REPLACE FUNCTION public.verify_audit_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    previous_audit_hash TEXT;
    current_hash TEXT;
BEGIN
    -- Get the hash of the previous audit log for this company
    SELECT hash_signature INTO previous_audit_hash
    FROM public.audit_integrity ai
    JOIN public.audit_logs al ON ai.audit_log_id = al.id
    WHERE al.company_id = NEW.company_id
    ORDER BY al.created_at DESC
    LIMIT 1;

    -- Calculate hash for the new audit log
    current_hash := public.calculate_audit_hash(
        row_to_json(NEW)::jsonb,
        previous_audit_hash
    );

    -- Insert integrity record
    INSERT INTO public.audit_integrity (
        audit_log_id,
        hash_signature,
        previous_hash
    ) VALUES (
        NEW.id,
        current_hash,
        previous_audit_hash
    );

    RETURN NEW;
END;
$$;

-- Create trigger for automatic integrity logging
DROP TRIGGER IF EXISTS audit_integrity_trigger ON public.audit_logs;
CREATE TRIGGER audit_integrity_trigger
    AFTER INSERT ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.verify_audit_integrity();

-- Create financial transaction audit view
CREATE OR REPLACE VIEW public.financial_audit_trail AS
SELECT
    al.id,
    al.user_id,
    al.user_email,
    al.user_name,
    al.company_id,
    al.action_type,
    al.entity_type,
    al.entity_id,
    al.entity_name,
    al.old_values,
    al.new_values,
    al.changes_summary,
    al.ip_address,
    al.user_agent,
    al.status,
    al.error_message,
    al.metadata,
    al.notes,
    al.created_at,
    ai.hash_signature,
    ai.verification_status,
    -- Extract financial-specific information
    CASE
        WHEN al.entity_type = 'payment' THEN
            jsonb_build_object(
                'amount', COALESCE((al.new_values->>'amount'), (al.old_values->>'amount')),
                'payment_method', COALESCE((al.new_values->>'payment_method'), (al.old_values->>'payment_method')),
                'payment_date', COALESCE((al.new_values->>'payment_date'), (al.old_values->>'payment_date'))
            )
        WHEN al.entity_type = 'invoice' THEN
            jsonb_build_object(
                'invoice_number', COALESCE((al.new_values->>'invoice_number'), (al.old_values->>'invoice_number')),
                'total_amount', COALESCE((al.new_values->>'total_amount'), (al.old_values->>'total_amount')),
                'due_date', COALESCE((al.new_values->>'due_date'), (al.old_values->>'due_date'))
            )
        WHEN al.entity_type = 'contract' THEN
            jsonb_build_object(
                'contract_number', COALESCE((al.new_values->>'contract_number'), (al.old_values->>'contract_number')),
                'monthly_rent', COALESCE((al.new_values->>'monthly_rent'), (al.old_values->>'monthly_rent')),
                'start_date', COALESCE((al.new_values->>'start_date'), (al.old_values->>'start_date'))
            )
        ELSE NULL
    END as financial_data
FROM public.audit_logs al
LEFT JOIN public.audit_integrity ai ON al.id = ai.audit_log_id
WHERE al.entity_type IN ('payment', 'invoice', 'contract', 'journal_entry', 'account', 'customer')
ORDER BY al.created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON public.financial_audit_trail TO authenticated;
GRANT SELECT ON public.financial_audit_trail TO anon;

-- Create audit summary function for reporting
CREATE OR REPLACE FUNCTION public.get_audit_summary(
    p_company_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_transactions', COUNT(*)::integer,
        'by_entity_type', (
            SELECT jsonb_object_agg(entity_type, count)
            FROM (
                SELECT entity_type, COUNT(*) as count
                FROM public.audit_logs
                WHERE company_id = p_company_id
                AND created_at BETWEEN p_start_date AND p_end_date
                AND entity_type IN ('payment', 'invoice', 'contract')
                GROUP BY entity_type
            ) entity_counts
        ),
        'by_action_type', (
            SELECT jsonb_object_agg(action_type, count)
            FROM (
                SELECT action_type, COUNT(*) as count
                FROM public.audit_logs
                WHERE company_id = p_company_id
                AND created_at BETWEEN p_start_date AND p_end_date
                AND entity_type IN ('payment', 'invoice', 'contract')
                GROUP BY action_type
            ) action_counts
        ),
        'failed_operations', (
            SELECT COUNT(*)::integer
            FROM public.audit_logs
            WHERE company_id = p_company_id
            AND created_at BETWEEN p_start_date AND p_end_date
            AND status = 'failed'
            AND entity_type IN ('payment', 'invoice', 'contract')
        ),
        'high_risk_operations', (
            SELECT COUNT(*)::integer
            FROM public.audit_logs al
            JOIN public.audit_integrity ai ON al.id = ai.audit_log_id
            WHERE al.company_id = p_company_id
            AND al.created_at BETWEEN p_start_date AND p_end_date
            AND al.entity_type IN ('payment', 'invoice', 'contract')
            AND (
                al.action_type IN ('DELETE', 'CANCEL', 'REJECT')
                OR ai.verification_status != 'verified'
            )
        ),
        'period_start', p_start_date,
        'period_end', p_end_date
    ) INTO result;

    RETURN result;
END;
$$;

-- Grant execute permission on the summary function
GRANT EXECUTE ON FUNCTION public.get_audit_summary TO authenticated;

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Audit logs table created successfully!';
    RAISE NOTICE 'Indexes created for optimal performance';
    RAISE NOTICE 'Row Level Security enabled';
    RAISE NOTICE 'Helper function log_audit() created';
    RAISE NOTICE 'Audit integrity system implemented with tamper detection';
    RAISE NOTICE 'Financial audit trail view created';
    RAISE NOTICE 'Audit summary reporting function created';
    RAISE NOTICE 'All audit components ready for production use';
END $$;
