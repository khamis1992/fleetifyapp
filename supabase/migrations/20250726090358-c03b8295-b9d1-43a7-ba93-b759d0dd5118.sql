-- Create the view properly without RLS policies
CREATE OR REPLACE VIEW public.contract_payment_summary AS
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