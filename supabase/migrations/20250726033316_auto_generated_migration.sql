-- Fix the security definer function by setting search_path
CREATE OR REPLACE FUNCTION public.initialize_employee_leave_balances(employee_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    leave_type_record RECORD;
    current_year INTEGER;
BEGIN
    current_year := EXTRACT(year FROM CURRENT_DATE);
    
    -- Get company from employee
    FOR leave_type_record IN 
        SELECT lt.* 
        FROM public.leave_types lt
        JOIN public.employees e ON e.company_id = lt.company_id
        WHERE e.id = employee_id_param AND lt.is_active = true
    LOOP
        INSERT INTO public.leave_balances (
            employee_id,
            leave_type_id,
            total_days,
            used_days,
            remaining_days,
            year
        ) VALUES (
            employee_id_param,
            leave_type_record.id,
            leave_type_record.max_days_per_year,
            0,
            leave_type_record.max_days_per_year,
            current_year
        ) ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
    END LOOP;
END;
$$;