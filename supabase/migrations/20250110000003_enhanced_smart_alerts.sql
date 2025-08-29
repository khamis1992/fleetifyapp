-- نظام التنبيهات الذكية المحسن
-- Enhanced smart alerts system

-- Create smart alerts configuration table
CREATE TABLE IF NOT EXISTS public.smart_alerts_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    alert_type TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    notification_settings JSONB NOT NULL DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_smart_alerts_config_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT unique_company_alert_type UNIQUE (company_id, alert_type)
);

-- Create smart alerts log table
CREATE TABLE IF NOT EXISTS public.smart_alerts_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    alert_type TEXT NOT NULL,
    alert_title TEXT NOT NULL,
    alert_message TEXT NOT NULL,
    alert_data JSONB DEFAULT '{}',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    target_users UUID[],
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT fk_smart_alerts_log_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_smart_alerts_config_company_id ON public.smart_alerts_config(company_id);
CREATE INDEX idx_smart_alerts_log_company_id ON public.smart_alerts_log(company_id);
CREATE INDEX idx_smart_alerts_log_status ON public.smart_alerts_log(status);
CREATE INDEX idx_smart_alerts_log_priority ON public.smart_alerts_log(priority);
CREATE INDEX idx_smart_alerts_log_created_at ON public.smart_alerts_log(created_at);

-- Enable RLS
ALTER TABLE public.smart_alerts_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for smart_alerts_config
CREATE POLICY "Users can view alert configs in their company" 
ON public.smart_alerts_config 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage alert configs in their company" 
ON public.smart_alerts_config 
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

-- RLS policies for smart_alerts_log
CREATE POLICY "Users can view alerts in their company" 
ON public.smart_alerts_log 
FOR SELECT 
USING (
    company_id = get_user_company(auth.uid()) OR
    auth.uid() = ANY(target_users)
);

CREATE POLICY "Users can update alerts targeted to them" 
ON public.smart_alerts_log 
FOR UPDATE 
USING (
    company_id = get_user_company(auth.uid()) OR
    auth.uid() = ANY(target_users)
)
WITH CHECK (
    company_id = get_user_company(auth.uid()) OR
    auth.uid() = ANY(target_users)
);

-- Function to create default alert configurations
CREATE OR REPLACE FUNCTION public.create_default_alert_configs(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- تنبيهات الاستحقاق
    INSERT INTO public.smart_alerts_config (company_id, alert_type, trigger_conditions, notification_settings)
    VALUES 
    (p_company_id, 'payment_due_reminder', 
     '{"days_before": 7, "min_amount": 0}'::JSONB,
     '{"email": true, "sms": false, "in_app": true}'::JSONB),
    
    (p_company_id, 'payment_overdue', 
     '{"days_after": [1, 7, 15, 30], "min_amount": 0}'::JSONB,
     '{"email": true, "sms": true, "in_app": true}'::JSONB),
    
    -- تنبيهات الحدود الائتمانية
    (p_company_id, 'credit_limit_warning', 
     '{"threshold_percentage": 80}'::JSONB,
     '{"email": true, "sms": false, "in_app": true}'::JSONB),
    
    (p_company_id, 'credit_limit_exceeded', 
     '{"threshold_percentage": 100}'::JSONB,
     '{"email": true, "sms": true, "in_app": true}'::JSONB),
    
    -- تنبيهات المتأخرات
    (p_company_id, 'high_overdue_amount', 
     '{"min_amount": 1000, "min_days": 30}'::JSONB,
     '{"email": true, "sms": false, "in_app": true}'::JSONB),
    
    -- تنبيهات العقود
    (p_company_id, 'contract_expiry_warning', 
     '{"days_before": 30}'::JSONB,
     '{"email": true, "sms": false, "in_app": true}'::JSONB),
    
    -- تنبيهات المركبات
    (p_company_id, 'vehicle_registration_expiry', 
     '{"days_before": 30}'::JSONB,
     '{"email": true, "sms": false, "in_app": true}'::JSONB),
    
    (p_company_id, 'vehicle_insurance_expiry', 
     '{"days_before": 15}'::JSONB,
     '{"email": true, "sms": true, "in_app": true}'::JSONB)
    
    ON CONFLICT (company_id, alert_type) DO NOTHING;
END;
$$;

-- Function to check and create payment due alerts
CREATE OR REPLACE FUNCTION public.check_payment_due_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    config_record RECORD;
    obligation_record RECORD;
    alert_count INTEGER := 0;
    days_before INTEGER;
    min_amount NUMERIC;
BEGIN
    -- الحصول على إعدادات التنبيهات لجميع الشركات
    FOR config_record IN 
        SELECT * FROM public.smart_alerts_config 
        WHERE alert_type = 'payment_due_reminder' AND is_enabled = true
    LOOP
        days_before := (config_record.trigger_conditions->>'days_before')::INTEGER;
        min_amount := COALESCE((config_record.trigger_conditions->>'min_amount')::NUMERIC, 0);
        
        -- البحث عن الالتزامات المستحقة قريباً
        FOR obligation_record IN
            SELECT fo.*, c.first_name, c.last_name, c.company_name, c.customer_type, ct.contract_number
            FROM public.financial_obligations fo
            JOIN public.customers c ON fo.customer_id = c.id
            JOIN public.contracts ct ON fo.contract_id = ct.id
            WHERE fo.company_id = config_record.company_id
            AND fo.status = 'pending'
            AND fo.due_date = CURRENT_DATE + (days_before || ' days')::INTERVAL
            AND fo.remaining_amount >= min_amount
            -- تجنب التنبيهات المكررة
            AND NOT EXISTS (
                SELECT 1 FROM public.smart_alerts_log sal
                WHERE sal.company_id = fo.company_id
                AND sal.alert_type = 'payment_due_reminder'
                AND sal.alert_data->>'obligation_id' = fo.id::TEXT
                AND sal.created_at::DATE = CURRENT_DATE
            )
        LOOP
            -- إنشاء التنبيه
            INSERT INTO public.smart_alerts_log (
                company_id, alert_type, alert_title, alert_message, alert_data, priority
            ) VALUES (
                config_record.company_id,
                'payment_due_reminder',
                'تذكير باستحقاق دفعة',
                format('دفعة بقيمة %s د.ك مستحقة خلال %s أيام للعميل %s',
                    obligation_record.remaining_amount,
                    days_before,
                    CASE 
                        WHEN obligation_record.customer_type = 'individual' 
                        THEN obligation_record.first_name || ' ' || obligation_record.last_name
                        ELSE obligation_record.company_name 
                    END
                ),
                jsonb_build_object(
                    'obligation_id', obligation_record.id,
                    'customer_id', obligation_record.customer_id,
                    'contract_id', obligation_record.contract_id,
                    'contract_number', obligation_record.contract_number,
                    'amount', obligation_record.remaining_amount,
                    'due_date', obligation_record.due_date,
                    'days_until_due', days_before
                ),
                'medium'
            );
            
            alert_count := alert_count + 1;
        END LOOP;
    END LOOP;
    
    RETURN alert_count;
END;
$$;

-- Function to check overdue payment alerts
CREATE OR REPLACE FUNCTION public.check_overdue_payment_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    config_record RECORD;
    obligation_record RECORD;
    alert_count INTEGER := 0;
    days_after INTEGER[];
    min_amount NUMERIC;
    day_threshold INTEGER;
BEGIN
    FOR config_record IN 
        SELECT * FROM public.smart_alerts_config 
        WHERE alert_type = 'payment_overdue' AND is_enabled = true
    LOOP
        days_after := ARRAY(SELECT jsonb_array_elements_text(config_record.trigger_conditions->'days_after'))::INTEGER[];
        min_amount := COALESCE((config_record.trigger_conditions->>'min_amount')::NUMERIC, 0);
        
        FOREACH day_threshold IN ARRAY days_after
        LOOP
            FOR obligation_record IN
                SELECT fo.*, c.first_name, c.last_name, c.company_name, c.customer_type, ct.contract_number
                FROM public.financial_obligations fo
                JOIN public.customers c ON fo.customer_id = c.id
                JOIN public.contracts ct ON fo.contract_id = ct.id
                WHERE fo.company_id = config_record.company_id
                AND fo.status IN ('overdue', 'partially_paid')
                AND fo.days_overdue = day_threshold
                AND fo.remaining_amount >= min_amount
                AND NOT EXISTS (
                    SELECT 1 FROM public.smart_alerts_log sal
                    WHERE sal.company_id = fo.company_id
                    AND sal.alert_type = 'payment_overdue'
                    AND sal.alert_data->>'obligation_id' = fo.id::TEXT
                    AND (sal.alert_data->>'days_overdue')::INTEGER = day_threshold
                )
            LOOP
                INSERT INTO public.smart_alerts_log (
                    company_id, alert_type, alert_title, alert_message, alert_data, priority
                ) VALUES (
                    config_record.company_id,
                    'payment_overdue',
                    'دفعة متأخرة',
                    format('دفعة بقيمة %s د.ك متأخرة منذ %s يوم للعميل %s',
                        obligation_record.remaining_amount,
                        day_threshold,
                        CASE 
                            WHEN obligation_record.customer_type = 'individual' 
                            THEN obligation_record.first_name || ' ' || obligation_record.last_name
                            ELSE obligation_record.company_name 
                        END
                    ),
                    jsonb_build_object(
                        'obligation_id', obligation_record.id,
                        'customer_id', obligation_record.customer_id,
                        'contract_id', obligation_record.contract_id,
                        'contract_number', obligation_record.contract_number,
                        'amount', obligation_record.remaining_amount,
                        'due_date', obligation_record.due_date,
                        'days_overdue', day_threshold
                    ),
                    CASE 
                        WHEN day_threshold >= 30 THEN 'high'
                        WHEN day_threshold >= 7 THEN 'medium'
                        ELSE 'low'
                    END
                );
                
                alert_count := alert_count + 1;
            END LOOP;
        END LOOP;
    END LOOP;
    
    RETURN alert_count;
END;
$$;

-- Function to check credit limit alerts
CREATE OR REPLACE FUNCTION public.check_credit_limit_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    config_record RECORD;
    customer_record RECORD;
    alert_count INTEGER := 0;
    threshold_percentage NUMERIC;
    current_utilization NUMERIC;
    alert_type_name TEXT;
    alert_priority TEXT;
BEGIN
    -- تنبيهات تحذير الحد الائتماني (80%)
    FOR config_record IN 
        SELECT * FROM public.smart_alerts_config 
        WHERE alert_type = 'credit_limit_warning' AND is_enabled = true
    LOOP
        threshold_percentage := (config_record.trigger_conditions->>'threshold_percentage')::NUMERIC;
        
        FOR customer_record IN
            SELECT c.*, cb.current_balance, cb.credit_limit
            FROM public.customers c
            LEFT JOIN public.customer_balances cb ON c.id = cb.customer_id
            WHERE c.company_id = config_record.company_id
            AND c.is_active = true
            AND cb.credit_limit > 0
            AND (cb.current_balance / cb.credit_limit * 100) >= threshold_percentage
            AND (cb.current_balance / cb.credit_limit * 100) < 100
            AND NOT EXISTS (
                SELECT 1 FROM public.smart_alerts_log sal
                WHERE sal.company_id = c.company_id
                AND sal.alert_type = 'credit_limit_warning'
                AND sal.alert_data->>'customer_id' = c.id::TEXT
                AND sal.created_at::DATE = CURRENT_DATE
            )
        LOOP
            current_utilization := (customer_record.current_balance / customer_record.credit_limit * 100);
            
            INSERT INTO public.smart_alerts_log (
                company_id, alert_type, alert_title, alert_message, alert_data, priority
            ) VALUES (
                config_record.company_id,
                'credit_limit_warning',
                'تحذير الحد الائتماني',
                format('العميل %s وصل إلى %s%% من الحد الائتماني',
                    CASE 
                        WHEN customer_record.customer_type = 'individual' 
                        THEN customer_record.first_name || ' ' || customer_record.last_name
                        ELSE customer_record.company_name 
                    END,
                    ROUND(current_utilization, 1)
                ),
                jsonb_build_object(
                    'customer_id', customer_record.id,
                    'current_balance', customer_record.current_balance,
                    'credit_limit', customer_record.credit_limit,
                    'utilization_percentage', current_utilization
                ),
                'medium'
            );
            
            alert_count := alert_count + 1;
        END LOOP;
    END LOOP;
    
    -- تنبيهات تجاوز الحد الائتماني (100%)
    FOR config_record IN 
        SELECT * FROM public.smart_alerts_config 
        WHERE alert_type = 'credit_limit_exceeded' AND is_enabled = true
    LOOP
        FOR customer_record IN
            SELECT c.*, cb.current_balance, cb.credit_limit
            FROM public.customers c
            LEFT JOIN public.customer_balances cb ON c.id = cb.customer_id
            WHERE c.company_id = config_record.company_id
            AND c.is_active = true
            AND cb.credit_limit > 0
            AND cb.current_balance >= cb.credit_limit
            AND NOT EXISTS (
                SELECT 1 FROM public.smart_alerts_log sal
                WHERE sal.company_id = c.company_id
                AND sal.alert_type = 'credit_limit_exceeded'
                AND sal.alert_data->>'customer_id' = c.id::TEXT
                AND sal.created_at::DATE = CURRENT_DATE
            )
        LOOP
            current_utilization := (customer_record.current_balance / customer_record.credit_limit * 100);
            
            INSERT INTO public.smart_alerts_log (
                company_id, alert_type, alert_title, alert_message, alert_data, priority
            ) VALUES (
                config_record.company_id,
                'credit_limit_exceeded',
                'تجاوز الحد الائتماني',
                format('العميل %s تجاوز الحد الائتماني بنسبة %s%%',
                    CASE 
                        WHEN customer_record.customer_type = 'individual' 
                        THEN customer_record.first_name || ' ' || customer_record.last_name
                        ELSE customer_record.company_name 
                    END,
                    ROUND(current_utilization, 1)
                ),
                jsonb_build_object(
                    'customer_id', customer_record.id,
                    'current_balance', customer_record.current_balance,
                    'credit_limit', customer_record.credit_limit,
                    'utilization_percentage', current_utilization
                ),
                'high'
            );
            
            alert_count := alert_count + 1;
        END LOOP;
    END LOOP;
    
    RETURN alert_count;
END;
$$;

-- Master function to run all alert checks
CREATE OR REPLACE FUNCTION public.run_smart_alerts_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    payment_due_count INTEGER;
    overdue_count INTEGER;
    credit_limit_count INTEGER;
    total_alerts INTEGER;
BEGIN
    -- تشغيل جميع فحوصات التنبيهات
    payment_due_count := public.check_payment_due_alerts();
    overdue_count := public.check_overdue_payment_alerts();
    credit_limit_count := public.check_credit_limit_alerts();
    
    total_alerts := payment_due_count + overdue_count + credit_limit_count;
    
    RETURN jsonb_build_object(
        'success', true,
        'total_alerts_created', total_alerts,
        'breakdown', jsonb_build_object(
            'payment_due_reminders', payment_due_count,
            'overdue_payments', overdue_count,
            'credit_limit_alerts', credit_limit_count
        ),
        'timestamp', now()
    );
END;
$$;

-- Function to acknowledge an alert
CREATE OR REPLACE FUNCTION public.acknowledge_alert(p_alert_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE public.smart_alerts_log
    SET 
        status = 'acknowledged',
        acknowledged_by = auth.uid(),
        acknowledged_at = now()
    WHERE id = p_alert_id
    AND (company_id = get_user_company(auth.uid()) OR auth.uid() = ANY(target_users))
    AND status = 'active';
    
    RETURN FOUND;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_smart_alerts_config
    BEFORE UPDATE ON public.smart_alerts_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create default alert configs for new companies
CREATE OR REPLACE FUNCTION public.trigger_create_default_alerts()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.create_default_alert_configs(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_default_alerts ON public.companies;
CREATE TRIGGER trigger_create_default_alerts
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_create_default_alerts();

COMMENT ON TABLE public.smart_alerts_config IS 'إعدادات التنبيهات الذكية لكل شركة';
COMMENT ON TABLE public.smart_alerts_log IS 'سجل التنبيهات الذكية المُنشأة';
COMMENT ON FUNCTION public.run_smart_alerts_check IS 'دالة تشغيل جميع فحوصات التنبيهات الذكية';
