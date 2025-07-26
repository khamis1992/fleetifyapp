-- Fix security definer view - convert to regular view and add RLS policy
DROP VIEW IF EXISTS public.contract_payment_summary;

-- Create the view without SECURITY DEFINER
CREATE VIEW public.contract_payment_summary AS
SELECT 
    c.id as contract_id,
    c.contract_amount,
    COALESCE(SUM(p.amount), 0) as total_paid,
    (c.contract_amount - COALESCE(SUM(p.amount), 0)) as outstanding_amount,
    CASE 
        WHEN (c.contract_amount - COALESCE(SUM(p.amount), 0)) > 0 THEN true 
        ELSE false 
    END as has_outstanding_payments,
    c.company_id
FROM public.contracts c
LEFT JOIN public.payments p ON p.customer_id = c.customer_id 
    AND p.status = 'completed'
    AND p.payment_date >= c.start_date 
    AND p.payment_date <= c.end_date
GROUP BY c.id, c.contract_amount, c.company_id;

-- Enable RLS on the view
ALTER VIEW public.contract_payment_summary SET (security_barrier);

-- Add RLS policy for the view (users can only see summaries for their company)
CREATE POLICY "Users can view payment summaries in their company" 
ON public.contract_payment_summary
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

-- Update the function to remove the search_path issue
DROP FUNCTION IF EXISTS public.get_eligible_contracts_for_renewal(uuid);

-- Create function with proper search path
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
SET search_path TO 'public'
AS $function$
BEGIN
    -- Check if user belongs to the company
    IF NOT user_belongs_to_company(auth.uid(), company_id_param) AND NOT has_role(auth.uid(), 'super_admin'::user_role) THEN
        RAISE EXCEPTION 'Access denied: user does not belong to this company';
    END IF;

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
    FROM contracts c
    LEFT JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN vehicles v ON c.vehicle_id = v.id
    LEFT JOIN contract_payment_summary cps ON c.id = cps.contract_id
    WHERE c.company_id = company_id_param
        AND c.status = 'expired'
        AND c.vehicle_returned = false
        AND cps.has_outstanding_payments = true
        AND c.end_date < CURRENT_DATE
    ORDER BY c.end_date DESC, cps.outstanding_amount DESC;
END;
$function$;