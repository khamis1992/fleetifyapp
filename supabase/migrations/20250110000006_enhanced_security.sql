-- تحسين الأمان وحقوق الوصول
-- Enhanced security and access control

-- Create audit log table for financial operations
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    user_id UUID,
    table_name TEXT NOT NULL,
    record_id UUID,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_financial_audit_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Create data encryption keys table
CREATE TABLE IF NOT EXISTS public.encryption_keys (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    key_name TEXT NOT NULL,
    key_purpose TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_encryption_keys_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT unique_company_key_name UNIQUE (company_id, key_name)
);

-- Create session management table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id UUID NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_user_sessions_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Create failed login attempts table
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT,
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_email_ip UNIQUE (email, ip_address)
);

-- Create indexes
CREATE INDEX idx_financial_audit_log_company_id ON public.financial_audit_log(company_id);
CREATE INDEX idx_financial_audit_log_table_record ON public.financial_audit_log(table_name, record_id);
CREATE INDEX idx_financial_audit_log_user_id ON public.financial_audit_log(user_id);
CREATE INDEX idx_financial_audit_log_created_at ON public.financial_audit_log(created_at);
CREATE INDEX idx_encryption_keys_company_id ON public.encryption_keys(company_id);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_failed_login_attempts_ip ON public.failed_login_attempts(ip_address, last_attempt);

-- Enable RLS
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for financial_audit_log
CREATE POLICY "Admins can view audit logs in their company" 
ON public.financial_audit_log 
FOR SELECT 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
);

-- RLS policies for encryption_keys
CREATE POLICY "Super admins can manage encryption keys" 
ON public.encryption_keys 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

-- RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enhanced audit logging function
CREATE OR REPLACE FUNCTION public.log_financial_operation()
RETURNS TRIGGER AS $$
DECLARE
    user_company_id UUID;
    changed_fields TEXT[] := '{}';
    field_name TEXT;
BEGIN
    -- Get user's company
    SELECT company_id INTO user_company_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Determine changed fields for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        FOR field_name IN SELECT jsonb_object_keys(to_jsonb(NEW))
        LOOP
            IF to_jsonb(OLD) ->> field_name IS DISTINCT FROM to_jsonb(NEW) ->> field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;
    
    -- Log the operation
    INSERT INTO public.financial_audit_log (
        company_id,
        user_id,
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        changed_fields,
        ip_address,
        user_agent
    ) VALUES (
        COALESCE(user_company_id, 
                CASE TG_OP 
                    WHEN 'DELETE' THEN OLD.company_id 
                    ELSE NEW.company_id 
                END),
        auth.uid(),
        TG_TABLE_NAME,
        CASE TG_OP 
            WHEN 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        TG_OP,
        CASE TG_OP 
            WHEN 'INSERT' THEN NULL 
            ELSE to_jsonb(OLD) 
        END,
        CASE TG_OP 
            WHEN 'DELETE' THEN NULL 
            ELSE to_jsonb(NEW) 
        END,
        changed_fields,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit logging to critical tables
DROP TRIGGER IF EXISTS audit_financial_obligations ON public.financial_obligations;
CREATE TRIGGER audit_financial_obligations
    AFTER INSERT OR UPDATE OR DELETE ON public.financial_obligations
    FOR EACH ROW
    EXECUTE FUNCTION public.log_financial_operation();

DROP TRIGGER IF EXISTS audit_payment_allocations ON public.payment_allocations;
CREATE TRIGGER audit_payment_allocations
    AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.log_financial_operation();

DROP TRIGGER IF EXISTS audit_customers ON public.customers;
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.log_financial_operation();

DROP TRIGGER IF EXISTS audit_payments ON public.payments;
CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_financial_operation();

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(
    p_data TEXT,
    p_company_id UUID,
    p_key_name TEXT DEFAULT 'default'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    -- Get encryption key for company
    SELECT encrypted_key INTO encryption_key
    FROM public.encryption_keys
    WHERE company_id = p_company_id
    AND key_name = p_key_name
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
    
    IF encryption_key IS NULL THEN
        RAISE EXCEPTION 'No active encryption key found for company';
    END IF;
    
    -- In a real implementation, you would use proper encryption
    -- For this example, we'll use a simple encoding
    RETURN encode(digest(p_data || encryption_key, 'sha256'), 'hex');
END;
$$;

-- Function to validate user permissions for financial operations
CREATE OR REPLACE FUNCTION public.validate_financial_permission(
    p_user_id UUID,
    p_operation TEXT,
    p_resource TEXT,
    p_company_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_roles TEXT[];
    user_company UUID;
    has_permission BOOLEAN := false;
BEGIN
    -- Get user roles and company
    SELECT array_agg(r.role), p.company_id
    INTO user_roles, user_company
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
    LEFT JOIN public.roles r ON ur.role_id = r.id
    WHERE p.id = p_user_id
    GROUP BY p.company_id;
    
    -- Check if user belongs to the specified company
    IF p_company_id IS NOT NULL AND user_company != p_company_id THEN
        RETURN false;
    END IF;
    
    -- Super admin has all permissions
    IF 'super_admin' = ANY(user_roles) THEN
        RETURN true;
    END IF;
    
    -- Check specific permissions based on operation and resource
    CASE p_operation
        WHEN 'read' THEN
            -- All authenticated users can read their company's data
            has_permission := user_company IS NOT NULL;
            
        WHEN 'create' THEN
            -- Company admins, managers, and sales agents can create
            has_permission := ARRAY['company_admin', 'manager', 'sales_agent', 'accountant'] && user_roles IS NOT NULL;
            
        WHEN 'update' THEN
            -- Company admins, managers, and accountants can update
            has_permission := ARRAY['company_admin', 'manager', 'accountant'] && user_roles IS NOT NULL;
            
        WHEN 'delete' THEN
            -- Only company admins and managers can delete
            has_permission := ARRAY['company_admin', 'manager'] && user_roles IS NOT NULL;
            
        WHEN 'approve' THEN
            -- Only company admins and managers can approve
            has_permission := ARRAY['company_admin', 'manager'] && user_roles IS NOT NULL;
            
        ELSE
            has_permission := false;
    END CASE;
    
    -- Additional resource-specific checks
    IF has_permission AND p_resource = 'financial_obligations' THEN
        -- Financial obligations require accounting permissions
        has_permission := ARRAY['company_admin', 'manager', 'accountant'] && user_roles IS NOT NULL;
    END IF;
    
    RETURN has_permission;
END;
$$;

-- Function to check rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_operation TEXT,
    p_limit INTEGER DEFAULT 100,
    p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    operation_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Count operations in the time window
    SELECT COUNT(*)
    INTO operation_count
    FROM public.financial_audit_log
    WHERE user_id = p_user_id
    AND operation = p_operation
    AND created_at >= window_start;
    
    RETURN operation_count < p_limit;
END;
$$;

-- Function to manage failed login attempts
CREATE OR REPLACE FUNCTION public.record_failed_login(
    p_email TEXT,
    p_ip_address INET,
    p_user_agent TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    current_attempts INTEGER;
    block_duration INTERVAL;
    blocked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Insert or update failed attempt record
    INSERT INTO public.failed_login_attempts (
        email, ip_address, user_agent, attempt_count, last_attempt
    ) VALUES (
        p_email, p_ip_address, p_user_agent, 1, now()
    )
    ON CONFLICT (email, ip_address)
    DO UPDATE SET
        attempt_count = failed_login_attempts.attempt_count + 1,
        last_attempt = now(),
        user_agent = COALESCE(EXCLUDED.user_agent, failed_login_attempts.user_agent);
    
    -- Get current attempt count
    SELECT attempt_count INTO current_attempts
    FROM public.failed_login_attempts
    WHERE email = p_email AND ip_address = p_ip_address;
    
    -- Calculate block duration based on attempt count
    IF current_attempts >= 10 THEN
        block_duration := '24 hours'::INTERVAL;
    ELSIF current_attempts >= 5 THEN
        block_duration := '1 hour'::INTERVAL;
    ELSIF current_attempts >= 3 THEN
        block_duration := '15 minutes'::INTERVAL;
    ELSE
        block_duration := NULL;
    END IF;
    
    -- Update block time if needed
    IF block_duration IS NOT NULL THEN
        blocked_until := now() + block_duration;
        UPDATE public.failed_login_attempts
        SET blocked_until = blocked_until
        WHERE email = p_email AND ip_address = p_ip_address;
    END IF;
    
    RETURN jsonb_build_object(
        'attempt_count', current_attempts,
        'blocked_until', blocked_until,
        'is_blocked', blocked_until IS NOT NULL AND blocked_until > now()
    );
END;
$$;

-- Function to check if login is blocked
CREATE OR REPLACE FUNCTION public.is_login_blocked(
    p_email TEXT,
    p_ip_address INET
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    blocked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT blocked_until
    INTO blocked_until
    FROM public.failed_login_attempts
    WHERE email = p_email AND ip_address = p_ip_address;
    
    RETURN blocked_until IS NOT NULL AND blocked_until > now();
END;
$$;

-- Function to clear failed login attempts after successful login
CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(
    p_email TEXT,
    p_ip_address INET
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    DELETE FROM public.failed_login_attempts
    WHERE email = p_email AND ip_address = p_ip_address;
END;
$$;

-- Enhanced RLS policies for financial_obligations with permission checks
DROP POLICY IF EXISTS "Users can view financial obligations in their company" ON public.financial_obligations;
CREATE POLICY "Users can view financial obligations in their company" 
ON public.financial_obligations 
FOR SELECT 
USING (
    company_id = get_user_company(auth.uid()) AND
    public.validate_financial_permission(auth.uid(), 'read', 'financial_obligations', company_id)
);

DROP POLICY IF EXISTS "Staff can insert financial obligations in their company" ON public.financial_obligations;
CREATE POLICY "Staff can insert financial obligations in their company" 
ON public.financial_obligations 
FOR INSERT 
WITH CHECK (
    company_id = get_user_company(auth.uid()) AND
    public.validate_financial_permission(auth.uid(), 'create', 'financial_obligations', company_id)
);

DROP POLICY IF EXISTS "Staff can update financial obligations in their company" ON public.financial_obligations;
CREATE POLICY "Staff can update financial obligations in their company" 
ON public.financial_obligations 
FOR UPDATE 
USING (
    company_id = get_user_company(auth.uid()) AND
    public.validate_financial_permission(auth.uid(), 'update', 'financial_obligations', company_id)
)
WITH CHECK (
    company_id = get_user_company(auth.uid()) AND
    public.validate_financial_permission(auth.uid(), 'update', 'financial_obligations', company_id)
);

DROP POLICY IF EXISTS "Staff can delete financial obligations in their company" ON public.financial_obligations;
CREATE POLICY "Staff can delete financial obligations in their company" 
ON public.financial_obligations 
FOR DELETE 
USING (
    company_id = get_user_company(auth.uid()) AND
    public.validate_financial_permission(auth.uid(), 'delete', 'financial_obligations', company_id)
);

-- Create function to clean up old audit logs
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
    p_retention_days INTEGER DEFAULT 365
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.financial_audit_log
    WHERE created_at < now() - (p_retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Create function to generate security report
CREATE OR REPLACE FUNCTION public.generate_security_report(
    p_company_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    report JSONB;
    total_operations INTEGER;
    failed_logins INTEGER;
    active_sessions INTEGER;
    top_users JSONB;
BEGIN
    -- Count total operations
    SELECT COUNT(*) INTO total_operations
    FROM public.financial_audit_log
    WHERE company_id = p_company_id
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;
    
    -- Count failed login attempts
    SELECT COUNT(*) INTO failed_logins
    FROM public.failed_login_attempts
    WHERE last_attempt::DATE BETWEEN p_start_date AND p_end_date;
    
    -- Count active sessions
    SELECT COUNT(*) INTO active_sessions
    FROM public.user_sessions
    WHERE company_id = p_company_id
    AND is_active = true
    AND expires_at > now();
    
    -- Get top users by activity
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', user_id,
            'operation_count', operation_count
        )
    ) INTO top_users
    FROM (
        SELECT user_id, COUNT(*) as operation_count
        FROM public.financial_audit_log
        WHERE company_id = p_company_id
        AND created_at::DATE BETWEEN p_start_date AND p_end_date
        GROUP BY user_id
        ORDER BY operation_count DESC
        LIMIT 10
    ) top_activity;
    
    report := jsonb_build_object(
        'period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),
        'statistics', jsonb_build_object(
            'total_operations', total_operations,
            'failed_logins', failed_logins,
            'active_sessions', active_sessions
        ),
        'top_users', COALESCE(top_users, '[]'::jsonb),
        'generated_at', now()
    );
    
    RETURN report;
END;
$$;

COMMENT ON TABLE public.financial_audit_log IS 'سجل مراجعة العمليات المالية';
COMMENT ON TABLE public.encryption_keys IS 'مفاتيح التشفير للبيانات الحساسة';
COMMENT ON TABLE public.user_sessions IS 'إدارة جلسات المستخدمين';
COMMENT ON TABLE public.failed_login_attempts IS 'محاولات تسجيل الدخول الفاشلة';
COMMENT ON FUNCTION public.validate_financial_permission IS 'التحقق من صلاحيات العمليات المالية';
COMMENT ON FUNCTION public.generate_security_report IS 'إنشاء تقرير أمني شامل';
