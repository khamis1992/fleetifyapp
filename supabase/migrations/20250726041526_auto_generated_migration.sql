-- Complete the leave management integration by adding synchronization functions

-- Function to automatically initialize leave balances for new employees
CREATE OR REPLACE FUNCTION initialize_employee_leave_balances(employee_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  leave_type_record RECORD;
  employee_company_id uuid;
  current_year integer;
BEGIN
  -- Get employee's company
  SELECT company_id INTO employee_company_id 
  FROM public.employees 
  WHERE id = employee_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Create leave balances for all active leave types of the company
  FOR leave_type_record IN 
    SELECT * FROM public.leave_types 
    WHERE company_id = employee_company_id 
      AND is_active = true
  LOOP
    -- Insert leave balance if it doesn't exist
    INSERT INTO public.leave_balances (
      id, employee_id, leave_type_id, total_days, 
      used_days, remaining_days, year
    ) VALUES (
      gen_random_uuid(), employee_id_param, leave_type_record.id, 
      leave_type_record.max_days_per_year, 0, leave_type_record.max_days_per_year, 
      current_year
    ) ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
  END LOOP;
END;
$$;

-- Function to sync leave_types changes to leave_balances
CREATE OR REPLACE FUNCTION sync_leave_type_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_year integer;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- If max_days_per_year was updated, update existing balances
  IF TG_OP = 'UPDATE' AND OLD.max_days_per_year != NEW.max_days_per_year THEN
    UPDATE public.leave_balances 
    SET 
      total_days = NEW.max_days_per_year,
      remaining_days = NEW.max_days_per_year - used_days
    WHERE leave_type_id = NEW.id 
      AND year = current_year;
  END IF;
  
  -- If a new leave type is created, create balances for all employees
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    INSERT INTO public.leave_balances (
      id, employee_id, leave_type_id, total_days, 
      used_days, remaining_days, year
    )
    SELECT 
      gen_random_uuid(), e.id, NEW.id, NEW.max_days_per_year,
      0, NEW.max_days_per_year, current_year
    FROM public.employees e
    WHERE e.company_id = NEW.company_id 
      AND e.is_active = true
    ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to auto-initialize leave balances for new employees
CREATE OR REPLACE FUNCTION trigger_initialize_employee_leave_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Initialize leave balances for the new employee
  PERFORM initialize_employee_leave_balances(NEW.id);
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS auto_initialize_leave_balances ON public.employees;
CREATE TRIGGER auto_initialize_leave_balances
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_employee_leave_balances();

DROP TRIGGER IF EXISTS sync_leave_type_to_balances ON public.leave_types;
CREATE TRIGGER sync_leave_type_to_balances
  AFTER INSERT OR UPDATE ON public.leave_types
  FOR EACH ROW
  EXECUTE FUNCTION sync_leave_type_changes();

-- Initialize leave balances for existing employees who don't have them
DO $$
DECLARE
  employee_record RECORD;
BEGIN
  FOR employee_record IN 
    SELECT DISTINCT e.id 
    FROM public.employees e
    WHERE e.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.leave_balances lb 
        WHERE lb.employee_id = e.id 
          AND lb.year = EXTRACT(YEAR FROM CURRENT_DATE)
      )
  LOOP
    PERFORM initialize_employee_leave_balances(employee_record.id);
  END LOOP;
END;
$$;