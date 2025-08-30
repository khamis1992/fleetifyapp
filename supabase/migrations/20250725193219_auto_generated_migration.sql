-- Drop the existing unique constraint on email column
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_email_key;

-- Create a unique index for email that only applies to active employees with non-null emails
CREATE UNIQUE INDEX employees_email_unique_active 
ON public.employees (company_id, email) 
WHERE is_active = true AND email IS NOT NULL AND email != '';

-- Add a comment to document the purpose of this index
COMMENT ON INDEX employees_email_unique_active IS 'Ensures email uniqueness only among active employees within the same company';