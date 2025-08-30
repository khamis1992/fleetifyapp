-- Modify unique constraint on employees.email to apply only for active records

-- 1) Drop existing unique constraint if present
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

-- 2) Drop any leftover unique index with the same name (safety)
DROP INDEX IF EXISTS public.employees_email_unique;

-- 3) Create partial unique index: email must be unique among active employees only
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_active_unique_idx
ON public.employees (email)
WHERE is_active = true;