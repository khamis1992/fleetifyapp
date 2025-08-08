-- Fix the validate_user_transfer function to handle empty/null values properly
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
    -- Check if required parameters are provided
    IF p_user_id IS NULL THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["User ID is required"]'::jsonb);
        RETURN result;
    END IF;
    
    IF p_from_company_id IS NULL THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["Source company ID is required"]'::jsonb);
        RETURN result;
    END IF;
    
    IF p_to_company_id IS NULL THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["Target company ID is required"]'::jsonb);
        RETURN result;
    END IF;
    
    -- Check if user exists and get their current company
    SELECT 
        EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id),
        (SELECT company_id FROM public.profiles WHERE user_id = p_user_id)
    INTO user_exists, user_company_id;
    
    IF NOT user_exists THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["User not found"]'::jsonb);
        RETURN result;
    END IF;
    
    IF user_company_id IS NULL THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["User has no company association"]'::jsonb);
        RETURN result;
    END IF;
    
    IF user_company_id != p_from_company_id THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["User is not in the specified source company"]'::jsonb);
        RETURN result;
    END IF;
    
    -- Check if target company exists
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_to_company_id)
    INTO company_exists;
    
    IF NOT company_exists THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["Target company not found"]'::jsonb);
        RETURN result;
    END IF;
    
    -- Check if user is super admin (they cannot be transferred)
    IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'super_admin') THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["Super admin users cannot be transferred"]'::jsonb);
        RETURN result;
    END IF;
    
    -- Check if source and target companies are different
    IF p_from_company_id = p_to_company_id THEN
        result := jsonb_set(result, '{valid}', 'false'::jsonb);
        result := jsonb_set(result, '{errors}', result->'errors' || '["Source and target companies must be different"]'::jsonb);
        RETURN result;
    END IF;
    
    RETURN result;
END;
$$;