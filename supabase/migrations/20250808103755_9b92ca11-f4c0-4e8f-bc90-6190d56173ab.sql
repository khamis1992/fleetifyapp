-- Create user transfer logs table
CREATE TABLE public.user_transfer_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_company_id UUID NOT NULL,
    to_company_id UUID NOT NULL,
    transferred_by UUID NOT NULL REFERENCES auth.users(id),
    transfer_reason TEXT,
    data_handling_strategy JSONB NOT NULL DEFAULT '{}',
    old_roles TEXT[] DEFAULT '{}',
    new_roles TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
    error_message TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    rollback_data JSONB
);

-- Enable RLS
ALTER TABLE public.user_transfer_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage transfer logs"
ON public.user_transfer_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role));

-- Add indexes for performance
CREATE INDEX idx_user_transfer_logs_user_id ON public.user_transfer_logs(user_id);
CREATE INDEX idx_user_transfer_logs_from_company ON public.user_transfer_logs(from_company_id);
CREATE INDEX idx_user_transfer_logs_to_company ON public.user_transfer_logs(to_company_id);
CREATE INDEX idx_user_transfer_logs_status ON public.user_transfer_logs(status);

-- Helper function to validate transfer eligibility
CREATE OR REPLACE FUNCTION public.validate_user_transfer(
    p_user_id UUID,
    p_from_company_id UUID,
    p_to_company_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_company_id UUID;
    user_exists BOOLEAN;
    company_exists BOOLEAN;
    result JSONB := '{"valid": true, "errors": []}'::jsonb;
BEGIN
    -- Check if user exists and get their current company
    SELECT 
        EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id),
        (SELECT company_id FROM public.profiles WHERE user_id = p_user_id)
    INTO user_exists, user_company_id;
    
    IF NOT user_exists THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["User not found"]'::jsonb);
    END IF;
    
    IF user_company_id != p_from_company_id THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["User is not in the specified source company"]'::jsonb);
    END IF;
    
    -- Check if target company exists
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_to_company_id)
    INTO company_exists;
    
    IF NOT company_exists THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["Target company not found"]'::jsonb);
    END IF;
    
    -- Check if user is super admin (they cannot be transferred)
    IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'super_admin') THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["Super admin users cannot be transferred"]'::jsonb);
    END IF;
    
    RETURN result;
END;
$$;