-- Migration to unify leave management: Remove hardcoded leave days from hr_settings
-- and ensure leave_types is the single source of truth

-- Step 1: Create default leave types for companies that don't have them yet
-- This ensures compatibility with existing data

-- Function to create default leave types for a company
CREATE OR REPLACE FUNCTION create_default_leave_types_for_company(target_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Annual Leave
  INSERT INTO public.leave_types (
    id, company_id, type_name, type_name_ar, max_days_per_year, 
    requires_approval, is_paid, is_active, description
  ) VALUES (
    gen_random_uuid(), target_company_id, 'Annual Leave', 'إجازة سنوية', 30,
    true, true, true, 'Yearly vacation leave'
  ) ON CONFLICT (company_id, type_name) DO NOTHING;

  -- Sick Leave
  INSERT INTO public.leave_types (
    id, company_id, type_name, type_name_ar, max_days_per_year, 
    requires_approval, is_paid, is_active, description
  ) VALUES (
    gen_random_uuid(), target_company_id, 'Sick Leave', 'إجازة مرضية', 15,
    false, true, true, 'Medical leave for illness'
  ) ON CONFLICT (company_id, type_name) DO NOTHING;

  -- Casual Leave
  INSERT INTO public.leave_types (
    id, company_id, type_name, type_name_ar, max_days_per_year, 
    requires_approval, is_paid, is_active, description
  ) VALUES (
    gen_random_uuid(), target_company_id, 'Casual Leave', 'إجازة عارضة', 5,
    true, true, true, 'Short-term personal leave'
  ) ON CONFLICT (company_id, type_name) DO NOTHING;
END;
$$;

-- Step 2: Sync existing hr_settings leave days to leave_types
CREATE OR REPLACE FUNCTION sync_hr_settings_to_leave_types()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record RECORD;
  company_record RECORD;
BEGIN
  -- Process each company that has hr_settings but might not have proper leave_types
  FOR company_record IN 
    SELECT DISTINCT id FROM public.companies
  LOOP
    -- Create default leave types for this company if they don't exist
    PERFORM create_default_leave_types_for_company(company_record.id);
    
    -- Get hr_settings for this company
    SELECT * INTO settings_record 
    FROM public.hr_settings 
    WHERE company_id = company_record.id;
    
    IF FOUND THEN
      -- Update Annual Leave
      UPDATE public.leave_types 
      SET max_days_per_year = settings_record.annual_leave_days
      WHERE company_id = company_record.id 
        AND type_name = 'Annual Leave'
        AND settings_record.annual_leave_days > 0;
        
      -- Update Sick Leave
      UPDATE public.leave_types 
      SET max_days_per_year = settings_record.sick_leave_days
      WHERE company_id = company_record.id 
        AND type_name = 'Sick Leave'
        AND settings_record.sick_leave_days > 0;
        
      -- Update Casual Leave
      UPDATE public.leave_types 
      SET max_days_per_year = settings_record.casual_leave_days
      WHERE company_id = company_record.id 
        AND type_name = 'Casual Leave'
        AND settings_record.casual_leave_days > 0;
    END IF;
  END LOOP;
END;
$$;

-- Step 3: Execute the synchronization
SELECT sync_hr_settings_to_leave_types();

-- Step 4: Remove the hardcoded leave day columns from hr_settings
-- We'll do this carefully to avoid breaking existing functionality
ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS annual_leave_days CASCADE;

ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS sick_leave_days CASCADE;

ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS casual_leave_days CASCADE;

-- Step 5: Create a function to initialize leave balances for new employees
CREATE OR REPLACE FUNCTION initialize_employee_leave_balances(employee_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Step 6: Create a trigger to automatically initialize leave balances for new employees
CREATE OR REPLACE FUNCTION trigger_initialize_employee_leave_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Initialize leave balances for the new employee
  PERFORM initialize_employee_leave_balances(NEW.id);
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_initialize_leave_balances ON public.employees;

-- Create the trigger
CREATE TRIGGER auto_initialize_leave_balances
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_initialize_employee_leave_balances();

-- Step 7: Initialize leave balances for existing employees who don't have them
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

-- Step 8: Create a function to sync leave_types changes to leave_balances
CREATE OR REPLACE FUNCTION sync_leave_type_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for leave_types changes
DROP TRIGGER IF EXISTS sync_leave_type_to_balances ON public.leave_types;
CREATE TRIGGER sync_leave_type_to_balances
  AFTER INSERT OR UPDATE ON public.leave_types
  FOR EACH ROW
  EXECUTE FUNCTION sync_leave_type_changes();

-- Step 9: Add unique constraint to prevent duplicate leave types per company
ALTER TABLE public.leave_types 
ADD CONSTRAINT unique_leave_type_per_company 
UNIQUE (company_id, type_name);