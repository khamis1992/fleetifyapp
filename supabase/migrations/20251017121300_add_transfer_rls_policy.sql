-- Add special RLS policy to allow transfer_user_to_company function to work
-- This policy allows operations when the function is called by super_admin users

-- First, let's create a helper function to check if we're in a transfer context
CREATE OR REPLACE FUNCTION is_in_transfer_context()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Check if the current user is super_admin
  -- SECURITY DEFINER functions inherit the definer's privileges
  RETURN has_role(auth.uid(), 'super_admin'::user_role);
END;
$$;

-- Now add a permissive policy for transfer operations
CREATE POLICY "Super admins can manage any user roles for transfer"
ON user_roles
FOR ALL
TO authenticated
USING (
  -- Allow if user is super_admin (they can transfer anyone)
  has_role(auth.uid(), 'super_admin'::user_role)
)
WITH CHECK (
  -- Allow if user is super_admin
  has_role(auth.uid(), 'super_admin'::user_role)
);

-- Update the transfer function to ensure it works with the new policy
DROP FUNCTION IF EXISTS transfer_user_to_company;

CREATE OR REPLACE FUNCTION transfer_user_to_company(
  p_user_id UUID,
  p_from_company_id UUID,
  p_to_company_id UUID,
  p_new_roles TEXT[],
  p_transfer_reason TEXT DEFAULT NULL,
  p_data_handling_strategy JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_transfer_log_id UUID;
  v_role TEXT;
  v_caller_is_super_admin BOOLEAN;
BEGIN
  -- Check if caller is super_admin
  SELECT has_role(auth.uid(), 'super_admin'::user_role) INTO v_caller_is_super_admin;
  
  IF NOT v_caller_is_super_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only super admins can transfer users between companies'
    );
  END IF;

  -- Validate inputs
  IF p_user_id IS NULL OR p_from_company_id IS NULL OR p_to_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required parameters'
    );
  END IF;

  IF p_from_company_id = p_to_company_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot transfer to the same company'
    );
  END IF;

  IF array_length(p_new_roles, 1) IS NULL OR array_length(p_new_roles, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'At least one role must be specified'
    );
  END IF;

  -- Now perform the transfer operations
  -- Since the caller is super_admin, the RLS policies will allow these operations
  
  -- 1. Update user's company_id in profiles
  UPDATE profiles
  SET company_id = p_to_company_id,
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;

  -- 2. Delete old roles (RLS allows this because caller is super_admin)
  DELETE FROM user_roles
  WHERE user_id = p_user_id;

  -- 3. Insert new roles with proper ENUM casting
  FOREACH v_role IN ARRAY p_new_roles
  LOOP
    INSERT INTO user_roles (user_id, role, company_id)
    VALUES (p_user_id, v_role::user_role, p_to_company_id);
  END LOOP;

  -- 4. Create transfer log
  INSERT INTO user_transfer_logs (
    user_id,
    from_company_id,
    to_company_id,
    transferred_at,
    transfer_reason,
    data_handling_strategy,
    new_roles
  )
  VALUES (
    p_user_id,
    p_from_company_id,
    p_to_company_id,
    NOW(),
    p_transfer_reason,
    p_data_handling_strategy,
    p_new_roles
  )
  RETURNING id INTO v_transfer_log_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User transferred successfully',
    'transferLogId', v_transfer_log_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_user_to_company TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_transfer_context TO authenticated;

-- Add comments
COMMENT ON FUNCTION transfer_user_to_company IS 'Transfers a user from one company to another (Works with RLS policies)';
COMMENT ON FUNCTION is_in_transfer_context IS 'Helper function to check if we are in a transfer context';
COMMENT ON POLICY "Super admins can manage any user roles for transfer" ON user_roles IS 'Allows super admins to manage any user roles for transfer operations';

