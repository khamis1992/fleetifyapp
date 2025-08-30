-- Allow service role edge functions to bypass role escalation checks while preserving existing protections for normal users
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    current_user_role text;
    highest_role_hierarchy integer;
    new_role_hierarchy integer;
    is_super_admin boolean := false;
    jwt_role text := NULL;
    is_service_role boolean := false;
BEGIN
    -- Bypass checks for service role tokens (used by edge functions)
    BEGIN
        SELECT (current_setting('request.jwt.claims', true)::json->>'role') INTO jwt_role;
        is_service_role := (jwt_role = 'service_role');
    EXCEPTION WHEN OTHERS THEN
        is_service_role := false;
    END;

    IF is_service_role THEN
        RETURN NEW;
    END IF;

    -- Check if current user is a super_admin first
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) INTO is_super_admin;
    
    -- Super admins can assign any role to anyone
    IF is_super_admin THEN
        RETURN NEW;
    END IF;
    
    -- Get current user's highest role (excluding super_admin since we already checked)
    SELECT role INTO current_user_role
    FROM public.user_roles 
    WHERE user_id = auth.uid()
    AND role IN ('company_admin', 'manager', 'sales_agent', 'employee')
    ORDER BY 
        CASE 
            WHEN role = 'company_admin' THEN 1  
            WHEN role = 'manager' THEN 2
            WHEN role = 'sales_agent' THEN 3
            WHEN role = 'employee' THEN 4
            ELSE 5
        END
    LIMIT 1;
    
    -- If no role found, deny access
    IF current_user_role IS NULL THEN
        RAISE EXCEPTION 'Permission denied: User has no role assigned';
    END IF;
    
    -- Define role hierarchy (lower number = higher privilege)
    highest_role_hierarchy := CASE 
        WHEN current_user_role = 'company_admin' THEN 1
        WHEN current_user_role = 'manager' THEN 2
        WHEN current_user_role = 'sales_agent' THEN 3
        WHEN current_user_role = 'employee' THEN 4
        ELSE 5
    END;
    
    new_role_hierarchy := CASE 
        WHEN NEW.role = 'super_admin' THEN 0 -- Super admin can only be assigned by super admin
        WHEN NEW.role = 'company_admin' THEN 1
        WHEN NEW.role = 'manager' THEN 2
        WHEN NEW.role = 'sales_agent' THEN 3
        WHEN NEW.role = 'employee' THEN 4
        ELSE 5
    END;
    
    -- Prevent role escalation - users cannot assign roles higher than their own
    IF new_role_hierarchy < highest_role_hierarchy THEN
        RAISE EXCEPTION 'Permission denied: Cannot assign role higher than your own';
    END IF;
    
    -- Prevent non-super-admins from assigning super_admin role
    IF NEW.role = 'super_admin' THEN
        RAISE EXCEPTION 'Permission denied: Only super admins can assign super admin roles';
    END IF;
    
    -- Prevent self-role modification unless it's a downgrade
    IF NEW.user_id = auth.uid() AND new_role_hierarchy < highest_role_hierarchy THEN
        RAISE EXCEPTION 'Permission denied: Cannot escalate your own roles';
    END IF;
    
    RETURN NEW;
END;
$function$;