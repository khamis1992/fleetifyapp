-- Migration to unify leave management: Remove hardcoded leave days from hr_settings
-- and ensure leave_types is the single source of truth

-- Step 1: Add unique constraint to prevent duplicate leave types per company
ALTER TABLE public.leave_types 
ADD CONSTRAINT IF NOT EXISTS unique_leave_type_per_company 
UNIQUE (company_id, type_name);

-- Step 2: Create default leave types for companies that don't have them yet
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

-- Step 3: Sync existing hr_settings leave days to leave_types
CREATE OR REPLACE FUNCTION sync_hr_settings_to_leave_types()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record RECORD;
  company_record RECORD;
BEGIN
  -- Process each company
  FOR company_record IN 
    SELECT DISTINCT id FROM public.companies
  LOOP
    -- Create default leave types for this company if they don't exist
    PERFORM create_default_leave_types_for_company(company_record.id);
    
    -- Get hr_settings for this company if they exist
    SELECT * INTO settings_record 
    FROM public.hr_settings 
    WHERE company_id = company_record.id;
    
    IF FOUND THEN
      -- Update Annual Leave if hr_settings has a value
      IF settings_record.annual_leave_days IS NOT NULL AND settings_record.annual_leave_days > 0 THEN
        UPDATE public.leave_types 
        SET max_days_per_year = settings_record.annual_leave_days
        WHERE company_id = company_record.id 
          AND type_name = 'Annual Leave';
      END IF;
        
      -- Update Sick Leave if hr_settings has a value
      IF settings_record.sick_leave_days IS NOT NULL AND settings_record.sick_leave_days > 0 THEN
        UPDATE public.leave_types 
        SET max_days_per_year = settings_record.sick_leave_days
        WHERE company_id = company_record.id 
          AND type_name = 'Sick Leave';
      END IF;
        
      -- Update Casual Leave if hr_settings has a value
      IF settings_record.casual_leave_days IS NOT NULL AND settings_record.casual_leave_days > 0 THEN
        UPDATE public.leave_types 
        SET max_days_per_year = settings_record.casual_leave_days
        WHERE company_id = company_record.id 
          AND type_name = 'Casual Leave';
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Step 4: Execute the synchronization
SELECT sync_hr_settings_to_leave_types();

-- Step 5: Remove the hardcoded leave day columns from hr_settings
ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS annual_leave_days CASCADE;

ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS sick_leave_days CASCADE;

ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS casual_leave_days CASCADE;