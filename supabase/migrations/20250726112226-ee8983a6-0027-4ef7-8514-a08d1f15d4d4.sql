-- Create function to find inconsistent accounts
CREATE OR REPLACE FUNCTION get_inconsistent_accounts()
RETURNS TABLE (
  employee_id UUID,
  employee_email TEXT,
  user_id UUID,
  has_system_access BOOLEAN,
  employee_company_id UUID,
  profile_company_id UUID,
  role_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.email as employee_email,
    e.user_id,
    e.has_system_access,
    e.company_id as employee_company_id,
    p.company_id as profile_company_id,
    COUNT(ur.role) as role_count
  FROM employees e
  LEFT JOIN profiles p ON e.user_id = p.user_id
  LEFT JOIN user_roles ur ON e.user_id = ur.user_id
  WHERE e.has_system_access = true 
    AND e.user_id IS NOT NULL
    AND (
      p.company_id IS NULL 
      OR COUNT(ur.role) = 0
    )
  GROUP BY e.id, e.email, e.user_id, e.has_system_access, e.company_id, p.company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;