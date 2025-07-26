-- Add new fields to contracts table for smart renewal tracking
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS vehicle_returned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_renew_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS renewal_terms jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_renewal_check timestamp with time zone DEFAULT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_returned ON public.contracts(vehicle_returned);
CREATE INDEX IF NOT EXISTS idx_contracts_auto_renew ON public.contracts(auto_renew_enabled);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date_status ON public.contracts(end_date, status);

-- Create a view for calculating outstanding payments per contract
CREATE OR REPLACE VIEW public.contract_payment_summary AS
SELECT 
    c.id as contract_id,
    c.contract_amount,
    COALESCE(SUM(p.amount), 0) as total_paid,
    (c.contract_amount - COALESCE(SUM(p.amount), 0)) as outstanding_amount,
    CASE 
        WHEN (c.contract_amount - COALESCE(SUM(p.amount), 0)) > 0 THEN true 
        ELSE false 
    END as has_outstanding_payments
FROM public.contracts c
LEFT JOIN public.payments p ON p.customer_id = c.customer_id 
    AND p.status = 'completed'
    AND p.payment_date >= c.start_date 
    AND p.payment_date <= c.end_date
GROUP BY c.id, c.contract_amount;

-- Create function to get eligible contracts for renewal
CREATE OR REPLACE FUNCTION public.get_eligible_contracts_for_renewal(company_id_param uuid)
RETURNS TABLE(
    contract_id uuid,
    contract_number text,
    customer_name text,
    vehicle_info text,
    end_date date,
    contract_amount numeric,
    total_paid numeric,
    outstanding_amount numeric,
    days_since_expiry integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as contract_id,
        c.contract_number::text,
        COALESCE(
            CONCAT(cust.first_name, ' ', cust.last_name),
            cust.company_name,
            'Unknown Customer'
        ) as customer_name,
        COALESCE(
            CONCAT(v.make, ' ', v.model, ' (', v.plate_number, ')'),
            'No Vehicle'
        ) as vehicle_info,
        c.end_date,
        c.contract_amount,
        cps.total_paid,
        cps.outstanding_amount,
        (CURRENT_DATE - c.end_date) as days_since_expiry
    FROM public.contracts c
    LEFT JOIN public.customers cust ON c.customer_id = cust.id
    LEFT JOIN public.vehicles v ON c.vehicle_id = v.id
    LEFT JOIN public.contract_payment_summary cps ON c.id = cps.contract_id
    WHERE c.company_id = company_id_param
        AND c.status = 'expired'
        AND c.vehicle_returned = false
        AND cps.has_outstanding_payments = true
        AND c.end_date < CURRENT_DATE
    ORDER BY c.end_date DESC, cps.outstanding_amount DESC;
END;
$function$;