-- Update payroll triggers to create journal entries upon approval
-- First, drop the existing trigger
DROP TRIGGER IF EXISTS trigger_handle_payroll_changes ON public.payroll;

-- Create an enhanced function that creates journal entries on approval AND payment
CREATE OR REPLACE FUNCTION public.handle_payroll_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    -- Create journal entry when payroll status changes to 'approved' or 'paid'
    IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('approved', 'paid') AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payroll_journal_entry(NEW.id);
    ELSIF (TG_OP = 'INSERT' AND NEW.status IN ('approved', 'paid') AND NEW.journal_entry_id IS NULL) THEN
        NEW.journal_entry_id := create_payroll_journal_entry(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER trigger_handle_payroll_changes
    BEFORE INSERT OR UPDATE ON public.payroll
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payroll_changes();

-- Add a view for payroll financial analysis
CREATE OR REPLACE VIEW public.payroll_financial_analysis AS
SELECT 
    p.id,
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
LEFT JOIN public.cost_centers cc ON cc.company_id = p.company_id AND cc.center_code = 'PAYROLL_WAGES'
ORDER BY p.payroll_date DESC, p.created_at DESC;