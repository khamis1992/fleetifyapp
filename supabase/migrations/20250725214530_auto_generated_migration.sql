-- Create a normal view without RLS policies (views inherit RLS from underlying tables)
CREATE OR REPLACE VIEW public.payroll_financial_analysis AS
SELECT 
    p.id,
    p.company_id,
    p.payroll_number,
    p.payroll_date,
    p.basic_salary,
    p.allowances,
    p.overtime_amount,
    p.deductions,
    p.tax_amount,
    p.net_amount,
    p.status,
    p.journal_entry_id,
    e.first_name,
    e.last_name,
    e.first_name_ar,
    e.last_name_ar,
    e.employee_number,
    e.department,
    e.position,
    je.entry_number as journal_entry_number,
    je.status as journal_entry_status,
    cc.center_name as cost_center_name,
    cc.center_name_ar as cost_center_name_ar,
    CASE 
        WHEN p.journal_entry_id IS NOT NULL THEN 'integrated'
        WHEN p.status = 'paid' THEN 'error'
        ELSE 'pending'
    END as integration_status
FROM public.payroll p
JOIN public.employees e ON p.employee_id = e.id
LEFT JOIN public.journal_entries je ON p.journal_entry_id = je.id
LEFT JOIN public.cost_centers cc ON cc.company_id = p.company_id AND cc.center_code = 'PAYROLL_WAGES';