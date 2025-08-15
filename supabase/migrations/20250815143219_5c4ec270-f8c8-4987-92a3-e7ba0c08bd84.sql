-- Create function to check for document expiry during active contracts
CREATE OR REPLACE FUNCTION public.check_document_expiry_alerts()
RETURNS TABLE(
    alert_type text,
    contract_id uuid,
    customer_id uuid,
    customer_name text,
    document_type text,
    expiry_date date,
    days_until_expiry integer,
    contract_number text,
    company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN c.national_id_expiry <= CURRENT_DATE THEN 'expired'
            WHEN c.national_id_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'valid'
        END as alert_type,
        ct.id as contract_id,
        c.id as customer_id,
        CASE 
            WHEN c.customer_type = 'individual' THEN c.first_name || ' ' || c.last_name
            ELSE c.company_name
        END as customer_name,
        'national_id'::text as document_type,
        c.national_id_expiry as expiry_date,
        (c.national_id_expiry - CURRENT_DATE)::integer as days_until_expiry,
        ct.contract_number,
        c.company_id
    FROM public.customers c
    INNER JOIN public.contracts ct ON c.id = ct.customer_id
    WHERE ct.status = 'active'
        AND c.national_id_expiry IS NOT NULL
        AND c.national_id_expiry <= CURRENT_DATE + INTERVAL '30 days'
    
    UNION ALL
    
    SELECT 
        CASE 
            WHEN c.license_expiry <= CURRENT_DATE THEN 'expired'
            WHEN c.license_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
            ELSE 'valid'
        END as alert_type,
        ct.id as contract_id,
        c.id as customer_id,
        CASE 
            WHEN c.customer_type = 'individual' THEN c.first_name || ' ' || c.last_name
            ELSE c.company_name
        END as customer_name,
        'license'::text as document_type,
        c.license_expiry as expiry_date,
        (c.license_expiry - CURRENT_DATE)::integer as days_until_expiry,
        ct.contract_number,
        c.company_id
    FROM public.customers c
    INNER JOIN public.contracts ct ON c.id = ct.customer_id
    WHERE ct.status = 'active'
        AND c.license_expiry IS NOT NULL
        AND c.license_expiry <= CURRENT_DATE + INTERVAL '30 days';
END;
$$;

-- Create document expiry alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.document_expiry_alerts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    document_type text NOT NULL, -- 'national_id' or 'license'
    alert_type text NOT NULL, -- 'expired' or 'expiring_soon'
    expiry_date date NOT NULL,
    days_until_expiry integer NOT NULL,
    contract_number text NOT NULL,
    customer_name text NOT NULL,
    is_acknowledged boolean DEFAULT false,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_expiry_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view document alerts in their company"
ON public.document_expiry_alerts
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage document alerts in their company"
ON public.document_expiry_alerts
FOR ALL
USING (
    has_role(auth.uid(), 'super_admin'::user_role) OR 
    (company_id = get_user_company(auth.uid()) AND 
     (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
);

-- Create function to sync document expiry alerts
CREATE OR REPLACE FUNCTION public.sync_document_expiry_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    alert_record RECORD;
    inserted_count integer := 0;
    existing_alert_id uuid;
BEGIN
    -- Get all document expiry issues for active contracts
    FOR alert_record IN 
        SELECT * FROM public.check_document_expiry_alerts()
        WHERE alert_type IN ('expired', 'expiring_soon')
    LOOP
        -- Check if alert already exists
        SELECT id INTO existing_alert_id
        FROM public.document_expiry_alerts
        WHERE contract_id = alert_record.contract_id
            AND document_type = alert_record.document_type
            AND alert_type = alert_record.alert_type
            AND is_acknowledged = false;
        
        -- If no existing alert, create new one
        IF existing_alert_id IS NULL THEN
            INSERT INTO public.document_expiry_alerts (
                company_id,
                contract_id,
                customer_id,
                document_type,
                alert_type,
                expiry_date,
                days_until_expiry,
                contract_number,
                customer_name
            ) VALUES (
                alert_record.company_id,
                alert_record.contract_id,
                alert_record.customer_id,
                alert_record.document_type,
                alert_record.alert_type,
                alert_record.expiry_date,
                alert_record.days_until_expiry,
                alert_record.contract_number,
                alert_record.customer_name
            );
            inserted_count := inserted_count + 1;
        END IF;
    END LOOP;
    
    RETURN inserted_count;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_expiry_alerts_company_id ON public.document_expiry_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_document_expiry_alerts_contract_id ON public.document_expiry_alerts(contract_id);
CREATE INDEX IF NOT EXISTS idx_document_expiry_alerts_acknowledged ON public.document_expiry_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_document_expiry_alerts_alert_type ON public.document_expiry_alerts(alert_type);