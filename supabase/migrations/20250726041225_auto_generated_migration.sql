-- Migration to unify leave management: Remove hardcoded leave days from hr_settings
-- and ensure leave_types is the single source of truth

-- Step 1: Add unique constraint to prevent duplicate leave types per company (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_leave_type_per_company' 
        AND table_name = 'leave_types'
    ) THEN
        ALTER TABLE public.leave_types 
        ADD CONSTRAINT unique_leave_type_per_company 
        UNIQUE (company_id, type_name);
    END IF;
END $$;

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

-- Step 3: Ensure all companies have default leave types
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN 
    SELECT DISTINCT id FROM public.companies
  LOOP
    PERFORM create_default_leave_types_for_company(company_record.id);
  END LOOP;
END $$;

-- Step 4: Remove the hardcoded leave day columns from hr_settings
ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS annual_leave_days CASCADE;

ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS sick_leave_days CASCADE;

ALTER TABLE public.hr_settings 
DROP COLUMN IF EXISTS casual_leave_days CASCADE;