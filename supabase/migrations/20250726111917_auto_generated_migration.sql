-- Step 1: Data Consistency Cleanup
-- Fix inconsistent profiles (users with system access should have proper company association)
UPDATE profiles 
SET company_id = e.company_id
FROM employees e
WHERE profiles.user_id = e.user_id 
  AND e.has_system_access = true 
  AND profiles.company_id IS NULL;

-- Step 2: Add database constraints to prevent future inconsistencies
-- Constraint to ensure employees with system access have associated user_id
ALTER TABLE employees 
ADD CONSTRAINT check_system_access_has_user 
CHECK (
  (has_system_access = false AND user_id IS NULL) OR 
  (has_system_access = true AND user_id IS NOT NULL)
);

-- Constraint to ensure profiles of employees with system access have proper company association
CREATE OR REPLACE FUNCTION validate_employee_profile_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this profile belongs to an employee with system access
  IF EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.user_id = NEW.user_id 
      AND e.has_system_access = true 
      AND NEW.company_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Profiles for employees with system access must have a company_id';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile consistency
DROP TRIGGER IF EXISTS trigger_validate_employee_profile_consistency ON profiles;
CREATE TRIGGER trigger_validate_employee_profile_consistency
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_employee_profile_consistency();

-- Step 3: Create function to handle incomplete user accounts
CREATE OR REPLACE FUNCTION handle_incomplete_user_account(
  p_user_id UUID,
  p_employee_id UUID,
  p_company_id UUID,
  p_roles TEXT[]
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  role_record TEXT;
BEGIN
  -- Update profile with correct company
  UPDATE profiles 
  SET company_id = p_company_id
  WHERE user_id = p_user_id;
  
  -- Clear any existing roles
  DELETE FROM user_roles WHERE user_id = p_user_id;
  
  -- Assign new roles
  FOREACH role_record IN ARRAY p_roles
  LOOP
    INSERT INTO user_roles (user_id, role) 
    VALUES (p_user_id, role_record::user_role);
  END LOOP;
  
  -- Update employee status
  UPDATE employees 
  SET has_system_access = true,
      account_status = 'active'
  WHERE id = p_employee_id;
  
  SELECT json_build_object(
    'success', true,
    'message', 'Account completed successfully',
    'user_id', p_user_id
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    SELECT json_build_object(
      'success', false,
      'error', SQLERRM
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;