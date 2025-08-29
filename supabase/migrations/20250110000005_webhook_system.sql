-- نظام الـ Webhooks للتكامل مع الأنظمة الخارجية
-- Webhook system for external system integration

-- Create webhook configurations table
CREATE TABLE IF NOT EXISTS public.webhook_configurations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    headers JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_webhook_configurations_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT valid_url CHECK (url ~* '^https?://'),
    CONSTRAINT valid_timeout CHECK (timeout_seconds > 0 AND timeout_seconds <= 300),
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= 10)
);

-- Create webhook delivery log table
CREATE TABLE IF NOT EXISTS public.webhook_delivery_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_id UUID NOT NULL,
    company_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'success', 'failed', 'retrying')),
    attempt_count INTEGER DEFAULT 1,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_webhook_delivery_webhook FOREIGN KEY (webhook_id) REFERENCES public.webhook_configurations(id) ON DELETE CASCADE,
    CONSTRAINT fk_webhook_delivery_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Create API access tokens table
CREATE TABLE IF NOT EXISTS public.api_access_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    token_name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_api_tokens_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_webhook_configurations_company_id ON public.webhook_configurations(company_id);
CREATE INDEX idx_webhook_configurations_active ON public.webhook_configurations(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_webhook_delivery_log_webhook_id ON public.webhook_delivery_log(webhook_id);
CREATE INDEX idx_webhook_delivery_log_status ON public.webhook_delivery_log(delivery_status, next_retry_at);
CREATE INDEX idx_api_access_tokens_company_id ON public.api_access_tokens(company_id);
CREATE INDEX idx_api_access_tokens_hash ON public.api_access_tokens(token_hash) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.webhook_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_access_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_configurations
CREATE POLICY "Users can view webhook configs in their company" 
ON public.webhook_configurations 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage webhook configs in their company" 
ON public.webhook_configurations 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
);

-- RLS policies for webhook_delivery_log
CREATE POLICY "Users can view webhook delivery logs in their company" 
ON public.webhook_delivery_log 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- RLS policies for api_access_tokens
CREATE POLICY "Admins can manage API tokens in their company" 
ON public.api_access_tokens 
FOR ALL 
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
)
WITH CHECK (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR 
      has_role(auth.uid(), 'manager'::user_role)))
);

-- Function to trigger webhooks
CREATE OR REPLACE FUNCTION public.trigger_webhook(
    p_company_id UUID,
    p_event_type TEXT,
    p_payload JSONB
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    webhook_record RECORD;
    delivery_id UUID;
    triggered_count INTEGER := 0;
BEGIN
    -- Get active webhooks for this company and event
    FOR webhook_record IN
        SELECT *
        FROM public.webhook_configurations
        WHERE company_id = p_company_id
        AND is_active = true
        AND p_event_type = ANY(events)
    LOOP
        -- Create delivery log entry
        INSERT INTO public.webhook_delivery_log (
            webhook_id, company_id, event_type, payload, delivery_status
        ) VALUES (
            webhook_record.id, p_company_id, p_event_type, p_payload, 'pending'
        ) RETURNING id INTO delivery_id;
        
        -- Update last triggered timestamp
        UPDATE public.webhook_configurations
        SET last_triggered_at = now()
        WHERE id = webhook_record.id;
        
        triggered_count := triggered_count + 1;
        
        -- Here you would typically queue the webhook for delivery
        -- For now, we'll just log it
        RAISE LOG 'Webhook queued for delivery: % to %', delivery_id, webhook_record.url;
    END LOOP;
    
    RETURN triggered_count;
END;
$$;

-- Function to generate API token
CREATE OR REPLACE FUNCTION public.generate_api_token(
    p_company_id UUID,
    p_token_name TEXT,
    p_permissions JSONB DEFAULT '{}',
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    token_value TEXT;
    token_hash TEXT;
BEGIN
    -- Generate random token (in production, use a more secure method)
    token_value := 'flt_' || encode(gen_random_bytes(32), 'hex');
    
    -- Hash the token for storage
    token_hash := encode(digest(token_value, 'sha256'), 'hex');
    
    -- Store the token
    INSERT INTO public.api_access_tokens (
        company_id, token_name, token_hash, permissions, expires_at, created_by
    ) VALUES (
        p_company_id, p_token_name, token_hash, p_permissions, p_expires_at, auth.uid()
    );
    
    RETURN token_value;
END;
$$;

-- Function to validate API token
CREATE OR REPLACE FUNCTION public.validate_api_token(p_token TEXT)
RETURNS TABLE (
    company_id UUID,
    permissions JSONB,
    is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    token_hash TEXT;
    token_record RECORD;
BEGIN
    -- Hash the provided token
    token_hash := encode(digest(p_token, 'sha256'), 'hex');
    
    -- Look up the token
    SELECT t.company_id, t.permissions, t.is_active, t.expires_at
    INTO token_record
    FROM public.api_access_tokens t
    WHERE t.token_hash = token_hash;
    
    -- Check if token exists and is valid
    IF token_record.company_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, '{}'::JSONB, false;
        RETURN;
    END IF;
    
    -- Check if token is active
    IF NOT token_record.is_active THEN
        RETURN QUERY SELECT token_record.company_id, token_record.permissions, false;
        RETURN;
    END IF;
    
    -- Check if token is expired
    IF token_record.expires_at IS NOT NULL AND token_record.expires_at < now() THEN
        RETURN QUERY SELECT token_record.company_id, token_record.permissions, false;
        RETURN;
    END IF;
    
    -- Update last used timestamp
    UPDATE public.api_access_tokens
    SET last_used_at = now()
    WHERE token_hash = token_hash;
    
    RETURN QUERY SELECT token_record.company_id, token_record.permissions, true;
END;
$$;

-- Triggers to automatically send webhooks for important events

-- Webhook trigger for customer creation
CREATE OR REPLACE FUNCTION public.trigger_customer_webhook()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.trigger_webhook(
            NEW.company_id,
            'customer.created',
            jsonb_build_object(
                'customer_id', NEW.id,
                'customer_type', NEW.customer_type,
                'name', CASE 
                    WHEN NEW.customer_type = 'individual' 
                    THEN NEW.first_name || ' ' || NEW.last_name
                    ELSE NEW.company_name 
                END,
                'phone', NEW.phone,
                'email', NEW.email,
                'created_at', NEW.created_at
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only trigger if important fields changed
        IF OLD.is_active != NEW.is_active OR OLD.is_blacklisted != NEW.is_blacklisted THEN
            PERFORM public.trigger_webhook(
                NEW.company_id,
                'customer.updated',
                jsonb_build_object(
                    'customer_id', NEW.id,
                    'changes', jsonb_build_object(
                        'is_active', jsonb_build_object('old', OLD.is_active, 'new', NEW.is_active),
                        'is_blacklisted', jsonb_build_object('old', OLD.is_blacklisted, 'new', NEW.is_blacklisted)
                    ),
                    'updated_at', NEW.updated_at
                )
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create customer webhook trigger
DROP TRIGGER IF EXISTS trigger_customer_webhook ON public.customers;
CREATE TRIGGER trigger_customer_webhook
    AFTER INSERT OR UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_customer_webhook();

-- Webhook trigger for payment allocation
CREATE OR REPLACE FUNCTION public.trigger_payment_allocation_webhook()
RETURNS TRIGGER AS $$
DECLARE
    customer_info RECORD;
    obligation_info RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get customer and obligation info
        SELECT fo.customer_id, fo.obligation_type, fo.contract_id, c.first_name, c.last_name, c.company_name, c.customer_type
        INTO obligation_info
        FROM public.financial_obligations fo
        JOIN public.customers c ON fo.customer_id = c.id
        WHERE fo.id = NEW.obligation_id;
        
        PERFORM public.trigger_webhook(
            NEW.company_id,
            'payment.allocated',
            jsonb_build_object(
                'allocation_id', NEW.id,
                'payment_id', NEW.payment_id,
                'customer_id', obligation_info.customer_id,
                'customer_name', CASE 
                    WHEN obligation_info.customer_type = 'individual' 
                    THEN obligation_info.first_name || ' ' || obligation_info.last_name
                    ELSE obligation_info.company_name 
                END,
                'obligation_type', obligation_info.obligation_type,
                'contract_id', obligation_info.contract_id,
                'allocated_amount', NEW.allocated_amount,
                'allocation_strategy', NEW.allocation_strategy,
                'allocation_date', NEW.allocation_date
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create payment allocation webhook trigger
DROP TRIGGER IF EXISTS trigger_payment_allocation_webhook ON public.payment_allocations;
CREATE TRIGGER trigger_payment_allocation_webhook
    AFTER INSERT ON public.payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_payment_allocation_webhook();

-- Webhook trigger for smart alerts
CREATE OR REPLACE FUNCTION public.trigger_alert_webhook()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.priority IN ('high', 'critical') THEN
        PERFORM public.trigger_webhook(
            NEW.company_id,
            'alert.created',
            jsonb_build_object(
                'alert_id', NEW.id,
                'alert_type', NEW.alert_type,
                'alert_title', NEW.alert_title,
                'alert_message', NEW.alert_message,
                'priority', NEW.priority,
                'alert_data', NEW.alert_data,
                'created_at', NEW.created_at
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create alert webhook trigger
DROP TRIGGER IF EXISTS trigger_alert_webhook ON public.smart_alerts_log;
CREATE TRIGGER trigger_alert_webhook
    AFTER INSERT ON public.smart_alerts_log
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_alert_webhook();

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_webhook_configurations
    BEFORE UPDATE ON public.webhook_configurations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_api_access_tokens
    BEFORE UPDATE ON public.api_access_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.webhook_configurations IS 'إعدادات الـ Webhooks للتكامل مع الأنظمة الخارجية';
COMMENT ON TABLE public.webhook_delivery_log IS 'سجل تسليم الـ Webhooks';
COMMENT ON TABLE public.api_access_tokens IS 'رموز الوصول لـ API';
COMMENT ON FUNCTION public.trigger_webhook IS 'دالة تفعيل الـ Webhooks للأحداث المختلفة';
COMMENT ON FUNCTION public.generate_api_token IS 'دالة إنشاء رمز وصول API جديد';
COMMENT ON FUNCTION public.validate_api_token IS 'دالة التحقق من صحة رمز الوصول';
