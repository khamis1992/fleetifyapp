-- Create customer_accounts table to track individual customer financial accounts
CREATE TABLE public.customer_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    account_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(customer_id, account_id)
);

-- Create customer_notes table for tracking customer interactions
CREATE TABLE public.customer_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on customer_accounts
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customer_notes  
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_accounts
CREATE POLICY "Staff can manage customer accounts in their company" 
ON public.customer_accounts 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))));

CREATE POLICY "Users can view customer accounts in their company" 
ON public.customer_accounts 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- RLS policies for customer_notes
CREATE POLICY "Staff can manage customer notes in their company" 
ON public.customer_notes 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::user_role) OR ((company_id = get_user_company(auth.uid())) AND (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role) OR has_role(auth.uid(), 'sales_agent'::user_role))));

CREATE POLICY "Users can view customer notes in their company" 
ON public.customer_notes 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Function to create customer financial account
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(customer_id_param uuid, company_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    customer_record record;
    account_id uuid;
    account_code varchar;
    account_name text;
    next_code_number integer;
BEGIN
    -- Get customer details
    SELECT * INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;
    
    -- Generate unique account code
    SELECT COALESCE(MAX(CAST(SUBSTRING(account_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_code_number
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_code LIKE '1201%';
    
    account_code := '1201' || LPAD(next_code_number::text, 4, '0');
    
    -- Create account name
    IF customer_record.customer_type = 'individual' THEN
        account_name := COALESCE(customer_record.first_name, '') || ' ' || COALESCE(customer_record.last_name, '');
    ELSE
        account_name := COALESCE(customer_record.company_name, 'Corporate Customer');
    END IF;
    
    account_name := 'Customer - ' || TRIM(account_name);
    
    -- Find parent receivables account
    WITH receivables_account AS (
        SELECT id as parent_id
        FROM public.chart_of_accounts
        WHERE company_id = company_id_param
        AND account_type = 'assets'
        AND (account_name ILIKE '%receivable%' OR account_code = '1201')
        AND is_header = true
        LIMIT 1
    )
    -- Create the customer account
    INSERT INTO public.chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        account_subtype,
        balance_type,
        parent_account_id,
        account_level,
        is_header,
        is_system,
        description,
        current_balance,
        is_active
    )
    SELECT 
        gen_random_uuid(),
        company_id_param,
        account_code,
        account_name,
        account_name || ' (العميل)',
        'assets',
        'accounts_receivable',
        'debit',
        ra.parent_id,
        CASE WHEN ra.parent_id IS NOT NULL THEN 3 ELSE 2 END,
        false,
        false,
        'Customer specific receivables account',
        0,
        true
    FROM receivables_account ra
    RETURNING id INTO account_id;
    
    -- Link customer to account
    INSERT INTO public.customer_accounts (
        company_id,
        customer_id,
        account_id
    ) VALUES (
        company_id_param,
        customer_id_param,
        account_id
    );
    
    RETURN account_id;
END;
$function$;

-- Trigger function to automatically create customer account
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Create financial account for new customer
    IF TG_OP = 'INSERT' THEN
        PERFORM public.create_customer_financial_account(NEW.id, NEW.company_id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for new customers
CREATE TRIGGER on_customer_created
    AFTER INSERT ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer();

-- Add updated_at trigger for customer_notes
CREATE TRIGGER update_customer_notes_updated_at
    BEFORE UPDATE ON public.customer_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for customer_accounts
CREATE TRIGGER update_customer_accounts_updated_at
    BEFORE UPDATE ON public.customer_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();