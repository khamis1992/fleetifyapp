-- Create subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    price_monthly NUMERIC NOT NULL DEFAULT 0,
    price_yearly NUMERIC NOT NULL DEFAULT 0,
    max_users INTEGER NOT NULL DEFAULT 5,
    max_vehicles INTEGER,
    max_customers INTEGER,
    max_storage_gb INTEGER,
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscription transactions table
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    plan_id UUID,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'upgrade', 'downgrade')),
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'KWD',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT CHECK (payment_method IN ('credit_card', 'bank_transfer', 'paypal', 'cash')),
    reference_number TEXT UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscription_plans
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage subscription plans" ON public.subscription_plans
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

-- Create RLS policies for subscription_transactions
CREATE POLICY "Super admins can view all subscription transactions" ON public.subscription_transactions
    FOR SELECT USING (has_role(auth.uid(), 'super_admin'::user_role));

CREATE POLICY "Companies can view their own transactions" ON public.subscription_transactions
    FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "System can manage subscription transactions" ON public.subscription_transactions
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, name_ar, description, price_monthly, price_yearly, max_users, features, is_popular) VALUES
('Basic', 'أساسي', 'Perfect for small businesses starting out', 25, 250, 5, '["10 vehicles", "50 customers", "Basic reports", "Email support"]', false),
('Premium', 'مميز', 'Most popular plan for growing businesses', 50, 500, 15, '["50 vehicles", "200 customers", "Advanced reports", "Priority support", "Mobile app"]', true),
('Enterprise', 'مؤسسي', 'Complete solution for large organizations', 100, 1000, 50, '["Unlimited vehicles", "Unlimited customers", "Custom reports", "24/7 support", "API access", "Custom integrations"]', false);

-- Insert sample transaction data
INSERT INTO public.subscription_transactions (company_id, transaction_type, amount, currency, status, payment_method, reference_number, description, processed_at) 
SELECT 
    c.id,
    'payment',
    CASE c.subscription_plan
        WHEN 'enterprise' THEN 100
        WHEN 'premium' THEN 50
        ELSE 25
    END,
    'KWD',
    'completed',
    CASE (random() * 3)::integer
        WHEN 0 THEN 'credit_card'
        WHEN 1 THEN 'bank_transfer'
        ELSE 'paypal'
    END,
    'TXN-' || TO_CHAR(NOW(), 'YYYY-MM') || '-' || LPAD((ROW_NUMBER() OVER())::TEXT, 4, '0'),
    'اشتراك شهري - خطة ' || 
    CASE c.subscription_plan
        WHEN 'enterprise' THEN 'مؤسسي'
        WHEN 'premium' THEN 'مميز'
        ELSE 'أساسي'
    END,
    NOW() - (random() * INTERVAL '30 days')
FROM companies c
WHERE c.subscription_status = 'active'
LIMIT 20;

-- Create function to generate transaction reference numbers
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_number IS NULL THEN
        NEW.reference_number := 'TXN-' || TO_CHAR(NOW(), 'YYYY-MM') || '-' || LPAD(
            (SELECT COUNT(*) + 1 FROM subscription_transactions 
             WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()))::TEXT, 
            4, '0'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic reference number generation
CREATE TRIGGER generate_transaction_reference_trigger
    BEFORE INSERT ON subscription_transactions
    FOR EACH ROW
    EXECUTE FUNCTION generate_transaction_reference();