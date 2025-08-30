-- Create customer_account_types table
CREATE TABLE public.customer_account_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type_name TEXT NOT NULL UNIQUE,
  type_name_ar TEXT NOT NULL,
  account_category TEXT NOT NULL CHECK (account_category IN ('current_assets', 'current_liabilities')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default account types
INSERT INTO public.customer_account_types (type_name, type_name_ar, account_category) VALUES
('receivables', 'حسابات القبض - العملاء', 'current_assets'),
('advances', 'عهد وسلف العملاء', 'current_liabilities'),
('deposits', 'أمانات العملاء', 'current_liabilities'),
('discounts', 'خصومات مستحقة للعملاء', 'current_liabilities'),
('returns', 'مرتجعات العملاء', 'current_liabilities');

-- Add new columns to existing customer_accounts table
ALTER TABLE public.customer_accounts 
ADD COLUMN IF NOT EXISTS account_type_id UUID REFERENCES public.customer_account_types(id),
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'KWD',
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_purpose TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Update existing customer_accounts to use receivables type as default
UPDATE public.customer_accounts 
SET account_type_id = (SELECT id FROM public.customer_account_types WHERE type_name = 'receivables' LIMIT 1),
    is_default = true
WHERE account_type_id IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_customer_accounts_type ON public.customer_accounts(account_type_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer ON public.customer_accounts(customer_id);

-- Enable RLS on new table
ALTER TABLE public.customer_account_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_account_types
CREATE POLICY "Users can view account types in their company" 
ON public.customer_account_types 
FOR SELECT 
USING (true); -- All users can view account types as they are global

CREATE POLICY "Admins can manage account types" 
ON public.customer_account_types 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

-- Add updated_at trigger for customer_account_types
CREATE OR REPLACE FUNCTION public.update_customer_account_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_account_types_updated_at
    BEFORE UPDATE ON public.customer_account_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_account_types_updated_at();

-- Function to auto-create customer accounts
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    p_customer_id UUID,
    p_company_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_type RECORD;
    chart_account RECORD;
    created_count INTEGER := 0;
    account_code TEXT;
    customer_code TEXT;
BEGIN
    -- Get customer code for account naming
    SELECT customer_code INTO customer_code
    FROM public.customers
    WHERE id = p_customer_id;
    
    -- Create accounts for each active account type
    FOR account_type IN 
        SELECT * FROM public.customer_account_types 
        WHERE is_active = true
    LOOP
        -- Find appropriate chart of accounts based on account type
        SELECT * INTO chart_account
        FROM public.chart_of_accounts
        WHERE company_id = p_company_id
        AND is_active = true
        AND can_link_customers = true
        AND account_type = CASE account_type.type_name
            WHEN 'receivables' THEN 'ACCOUNTS_RECEIVABLE'
            WHEN 'advances' THEN 'OTHER_CURRENT_LIABILITY'
            WHEN 'deposits' THEN 'OTHER_CURRENT_LIABILITY'
            WHEN 'discounts' THEN 'OTHER_CURRENT_LIABILITY'
            WHEN 'returns' THEN 'OTHER_CURRENT_LIABILITY'
            ELSE 'ACCOUNTS_RECEIVABLE'
        END
        LIMIT 1;
        
        IF chart_account.id IS NOT NULL THEN
            -- Check if account already exists
            IF NOT EXISTS (
                SELECT 1 FROM public.customer_accounts
                WHERE customer_id = p_customer_id
                AND account_type_id = account_type.id
            ) THEN
                -- Create customer account
                INSERT INTO public.customer_accounts (
                    customer_id,
                    account_id,
                    account_type_id,
                    is_default,
                    currency,
                    account_purpose,
                    is_active
                ) VALUES (
                    p_customer_id,
                    chart_account.id,
                    account_type.id,
                    account_type.type_name = 'receivables', -- receivables is default
                    'KWD',
                    account_type.type_name_ar,
                    true
                );
                
                created_count := created_count + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN created_count;
END;
$$;

-- Function to get customer default account by type
CREATE OR REPLACE FUNCTION public.get_customer_default_account(
    p_customer_id UUID,
    p_account_type TEXT DEFAULT 'receivables'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id UUID;
BEGIN
    SELECT ca.account_id INTO account_id
    FROM public.customer_accounts ca
    JOIN public.customer_account_types cat ON ca.account_type_id = cat.id
    WHERE ca.customer_id = p_customer_id
    AND cat.type_name = p_account_type
    AND ca.is_active = true
    AND (ca.is_default = true OR cat.type_name = 'receivables')
    ORDER BY ca.is_default DESC, ca.created_at ASC
    LIMIT 1;
    
    RETURN account_id;
END;
$$;