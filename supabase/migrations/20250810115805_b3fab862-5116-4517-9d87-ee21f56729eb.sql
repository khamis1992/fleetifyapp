-- Implement plan: partial unique indexes for active employees only
-- 1) Employee number unique per company for active employees
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.employees'::regclass
          AND conname = 'employees_number_company_unique'
    ) THEN
        ALTER TABLE public.employees DROP CONSTRAINT employees_number_company_unique;
    END IF;
END $$;

-- Drop any legacy indexes with similar intent (safety)
DROP INDEX IF EXISTS public.employees_number_company_unique;
DROP INDEX IF EXISTS public.employees_number_company_active_unique;

-- Create partial unique index for active employees only
CREATE UNIQUE INDEX IF NOT EXISTS employees_number_company_active_unique
ON public.employees (company_id, employee_number)
WHERE is_active = true AND company_id IS NOT NULL AND employee_number IS NOT NULL;


-- 2) Email unique per company for active employees (and not null), remove old global/partial email indexes
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.employees'::regclass
          AND conname = 'employees_email_unique'
    ) THEN
        ALTER TABLE public.employees DROP CONSTRAINT employees_email_unique;
    END IF;
END $$;

-- Drop previously created/legacy email indexes
DROP INDEX IF EXISTS public.employees_email_active_unique_idx; -- previous single-column partial index
DROP INDEX IF EXISTS public.employees_email_unique_active;
DROP INDEX IF EXISTS public.employees_company_email_active_unique;
DROP INDEX IF EXISTS public.employees_email_unique;

-- Create the correct composite partial unique index (per company)
CREATE UNIQUE INDEX IF NOT EXISTS employees_company_email_active_unique
ON public.employees (company_id, email)
WHERE is_active = true AND company_id IS NOT NULL AND email IS NOT NULL;