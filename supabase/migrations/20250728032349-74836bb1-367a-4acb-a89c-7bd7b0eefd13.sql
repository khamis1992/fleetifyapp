-- Phase 1: Critical Security Fixes and Data Isolation Improvements

-- 1. Fix Function Search Path Security (Critical)
-- Update all functions to have SET search_path to prevent SQL injection
ALTER FUNCTION public.calculate_vehicle_total_costs(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_trial_balance(uuid, date) SET search_path TO 'public';
ALTER FUNCTION public.calculate_fuel_efficiency(uuid, date, date) SET search_path TO 'public';
ALTER FUNCTION public.create_invoice_journal_entry(uuid) SET search_path TO 'public';
ALTER FUNCTION public.calculate_financial_health_score(uuid) SET search_path TO 'public';
ALTER FUNCTION public.check_budget_variances(uuid) SET search_path TO 'public';
ALTER FUNCTION public.generate_cash_flow_analysis(uuid, date, date) SET search_path TO 'public';
ALTER FUNCTION public.generate_monthly_trends(uuid, integer) SET search_path TO 'public';
ALTER FUNCTION public.trigger_budget_variance_check() SET search_path TO 'public';
ALTER FUNCTION public.generate_vehicle_alerts() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_company() SET search_path TO 'public';
ALTER FUNCTION public.get_available_vehicles_for_contracts(uuid) SET search_path TO 'public';
ALTER FUNCTION public.create_vehicle_fixed_asset_entry(uuid) SET search_path TO 'public';
ALTER FUNCTION public.copy_default_accounts_to_company(uuid) SET search_path TO 'public';
ALTER FUNCTION public.process_vehicle_depreciation_monthly(uuid, date) SET search_path TO 'public';
ALTER FUNCTION public.handle_vehicle_financial_integration() SET search_path TO 'public';
ALTER FUNCTION public.handle_invoice_changes() SET search_path TO 'public';
ALTER FUNCTION public.handle_penalty_changes() SET search_path TO 'public';
ALTER FUNCTION public.process_monthly_depreciation(uuid, date) SET search_path TO 'public';
ALTER FUNCTION public.handle_contract_changes() SET search_path TO 'public';
ALTER FUNCTION public.handle_payroll_changes() SET search_path TO 'public';
ALTER FUNCTION public.update_account_levels_manually(uuid) SET search_path TO 'public';
ALTER FUNCTION public.handle_bank_transaction_changes() SET search_path TO 'public';
ALTER FUNCTION public.calculate_account_level(uuid) SET search_path TO 'public';
ALTER FUNCTION public.create_payment_journal_entry(uuid) SET search_path TO 'public';

-- 2. Add missing foreign key constraints for data integrity
-- Add foreign key for company_id in employees table
ALTER TABLE public.employees 
ADD CONSTRAINT fk_employees_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add foreign key for company_id in contracts table
ALTER TABLE public.contracts 
ADD CONSTRAINT fk_contracts_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add foreign key for company_id in customers table
ALTER TABLE public.customers 
ADD CONSTRAINT fk_customers_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add foreign key for company_id in vehicles table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_vehicles_company') THEN
            ALTER TABLE public.vehicles 
            ADD CONSTRAINT fk_vehicles_company 
            FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. Improve RLS policies for better data isolation
-- Create a more secure function to get user company with proper error handling
CREATE OR REPLACE FUNCTION public.get_user_company_secure(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT COALESCE(
        (SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1),
        '00000000-0000-0000-0000-000000000000'::uuid
    );
$$;

-- 4. Add data validation triggers for company isolation
CREATE OR REPLACE FUNCTION public.validate_company_isolation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Ensure user can only create/modify records for their own company
    IF NEW.company_id != public.get_user_company_secure(auth.uid()) AND NOT public.has_role(auth.uid(), 'super_admin'::user_role) THEN
        RAISE EXCEPTION 'Access denied: Cannot access data from different company';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply validation trigger to critical tables
DROP TRIGGER IF EXISTS validate_company_isolation_trigger ON public.employees;
CREATE TRIGGER validate_company_isolation_trigger
    BEFORE INSERT OR UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_company_isolation();

DROP TRIGGER IF EXISTS validate_company_isolation_trigger ON public.contracts;
CREATE TRIGGER validate_company_isolation_trigger
    BEFORE INSERT OR UPDATE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_company_isolation();

DROP TRIGGER IF EXISTS validate_company_isolation_trigger ON public.customers;
CREATE TRIGGER validate_company_isolation_trigger
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_company_isolation();

-- 5. Create subscription management system tables
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name text NOT NULL UNIQUE,
    plan_code text NOT NULL UNIQUE,
    price_monthly numeric(10,2) NOT NULL DEFAULT 0,
    price_yearly numeric(10,2) NOT NULL DEFAULT 0,
    max_users integer DEFAULT NULL, -- NULL means unlimited
    max_vehicles integer DEFAULT NULL,
    max_customers integer DEFAULT NULL,
    max_contracts integer DEFAULT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (plan_name, plan_code, price_monthly, price_yearly, max_users, max_vehicles, max_customers, max_contracts, features) VALUES
('Free', 'free', 0, 0, 2, 5, 10, 5, '["basic_reporting", "email_support"]'::jsonb),
('Basic', 'basic', 29.99, 299.99, 10, 25, 100, 50, '["advanced_reporting", "email_support", "basic_integrations"]'::jsonb),
('Professional', 'professional', 99.99, 999.99, 50, 100, 500, 200, '["advanced_reporting", "priority_support", "advanced_integrations", "custom_branding"]'::jsonb),
('Enterprise', 'enterprise', 299.99, 2999.99, NULL, NULL, NULL, NULL, '["everything", "dedicated_support", "custom_development", "sla"]'::jsonb)
ON CONFLICT (plan_code) DO NOTHING;

-- Create subscription usage tracking table
CREATE TABLE IF NOT EXISTS public.company_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    usage_date date NOT NULL DEFAULT CURRENT_DATE,
    users_count integer DEFAULT 0,
    vehicles_count integer DEFAULT 0,
    customers_count integer DEFAULT 0,
    contracts_count integer DEFAULT 0,
    api_calls_count integer DEFAULT 0,
    storage_used_mb numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(company_id, usage_date)
);

-- Enable RLS on new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription management
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Super admins can manage subscription plans" ON public.subscription_plans FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Companies can view their own usage" ON public.company_usage FOR SELECT USING (company_id = public.get_user_company_secure(auth.uid()));
CREATE POLICY "System can insert usage data" ON public.company_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage usage data" ON public.company_usage FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::user_role) OR (company_id = public.get_user_company_secure(auth.uid()) AND public.has_role(auth.uid(), 'company_admin'::user_role)));

-- 6. Create feature gates system
CREATE TABLE IF NOT EXISTS public.feature_gates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_code text NOT NULL UNIQUE,
    feature_name text NOT NULL,
    description text,
    required_plans text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert core feature gates
INSERT INTO public.feature_gates (feature_code, feature_name, description, required_plans) VALUES
('advanced_reporting', 'Advanced Reporting', 'Access to advanced analytics and custom reports', ARRAY['basic', 'professional', 'enterprise']),
('custom_branding', 'Custom Branding', 'Customize company branding and logos', ARRAY['professional', 'enterprise']),
('api_access', 'API Access', 'Access to REST API endpoints', ARRAY['professional', 'enterprise']),
('bulk_operations', 'Bulk Operations', 'Bulk import/export capabilities', ARRAY['basic', 'professional', 'enterprise']),
('multi_company', 'Multi-Company Management', 'Manage multiple companies from one account', ARRAY['enterprise']),
('custom_fields', 'Custom Fields', 'Add custom fields to entities', ARRAY['professional', 'enterprise']),
('advanced_integrations', 'Advanced Integrations', 'Third-party system integrations', ARRAY['professional', 'enterprise']),
('priority_support', 'Priority Support', 'Priority customer support', ARRAY['professional', 'enterprise'])
ON CONFLICT (feature_code) DO NOTHING;

-- Enable RLS on feature gates
ALTER TABLE public.feature_gates ENABLE ROW LEVEL SECURITY;

-- RLS policy for feature gates
CREATE POLICY "Anyone can view active feature gates" ON public.feature_gates FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage feature gates" ON public.feature_gates FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::user_role));

-- 7. Add subscription plan to companies table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'current_plan_id') THEN
        ALTER TABLE public.companies ADD COLUMN current_plan_id uuid REFERENCES public.subscription_plans(id);
        
        -- Set default plan for existing companies
        UPDATE public.companies 
        SET current_plan_id = (SELECT id FROM public.subscription_plans WHERE plan_code = 'free' LIMIT 1)
        WHERE current_plan_id IS NULL;
    END IF;
END $$;

-- 8. Create function to check feature access
CREATE OR REPLACE FUNCTION public.has_feature_access(company_id_param uuid, feature_code_param text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    company_plan_code text;
    required_plans text[];
BEGIN
    -- Get company's current plan
    SELECT sp.plan_code INTO company_plan_code
    FROM public.companies c
    JOIN public.subscription_plans sp ON c.current_plan_id = sp.id
    WHERE c.id = company_id_param;
    
    -- If no plan found, default to free
    IF company_plan_code IS NULL THEN
        company_plan_code := 'free';
    END IF;
    
    -- Get required plans for the feature
    SELECT fg.required_plans INTO required_plans
    FROM public.feature_gates fg
    WHERE fg.feature_code = feature_code_param
    AND fg.is_active = true;
    
    -- If feature doesn't exist or no plans required, allow access
    IF required_plans IS NULL OR array_length(required_plans, 1) = 0 THEN
        RETURN true;
    END IF;
    
    -- Check if company's plan is in the required plans
    RETURN company_plan_code = ANY(required_plans);
END;
$$;

-- 9. Create function to update company usage statistics
CREATE OR REPLACE FUNCTION public.update_company_usage_stats(company_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    users_count integer := 0;
    vehicles_count integer := 0;
    customers_count integer := 0;
    contracts_count integer := 0;
BEGIN
    -- Count current usage
    SELECT COUNT(*) INTO users_count FROM public.profiles WHERE company_id = company_id_param;
    SELECT COUNT(*) INTO customers_count FROM public.customers WHERE company_id = company_id_param AND is_active = true;
    SELECT COUNT(*) INTO contracts_count FROM public.contracts WHERE company_id = company_id_param AND status IN ('active', 'pending');
    
    -- Count vehicles if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles' AND table_schema = 'public') THEN
        EXECUTE format('SELECT COUNT(*) FROM public.vehicles WHERE company_id = %L AND is_active = true', company_id_param) INTO vehicles_count;
    END IF;
    
    -- Insert or update usage record
    INSERT INTO public.company_usage (company_id, usage_date, users_count, vehicles_count, customers_count, contracts_count)
    VALUES (company_id_param, CURRENT_DATE, users_count, vehicles_count, customers_count, contracts_count)
    ON CONFLICT (company_id, usage_date)
    DO UPDATE SET
        users_count = EXCLUDED.users_count,
        vehicles_count = EXCLUDED.vehicles_count,
        customers_count = EXCLUDED.customers_count,
        contracts_count = EXCLUDED.contracts_count;
END;
$$;

-- 10. Create triggers to automatically update usage stats
CREATE OR REPLACE FUNCTION public.trigger_usage_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Update usage stats for the affected company
    IF TG_OP = 'DELETE' THEN
        PERFORM public.update_company_usage_stats(OLD.company_id);
        RETURN OLD;
    ELSE
        PERFORM public.update_company_usage_stats(NEW.company_id);
        RETURN NEW;
    END IF;
END;
$$;

-- Apply usage tracking triggers
DROP TRIGGER IF EXISTS update_usage_on_customer_change ON public.customers;
CREATE TRIGGER update_usage_on_customer_change
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_usage_update();

DROP TRIGGER IF EXISTS update_usage_on_contract_change ON public.contracts;
CREATE TRIGGER update_usage_on_contract_change
    AFTER INSERT OR UPDATE OR DELETE ON public.contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_usage_update();

DROP TRIGGER IF EXISTS update_usage_on_profile_change ON public.profiles;
CREATE TRIGGER update_usage_on_profile_change
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_usage_update();