-- Create the transfer_user_to_company RPC function
-- This function transfers a user from one company to another

CREATE OR REPLACE FUNCTION transfer_user_to_company(
  p_user_id UUID,
  p_target_company_id UUID,
  p_new_roles TEXT[],
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_company_id UUID;
  v_transfer_log_id UUID;
  v_old_roles TEXT[];
BEGIN
  -- Log the start of the transfer
  RAISE NOTICE 'Starting user transfer for user_id: %, target_company_id: %', p_user_id, p_target_company_id;
  
  -- Get current company and roles
  SELECT company_id INTO v_current_company_id
  FROM profiles
  WHERE id = p_user_id;
  
  -- Get current roles
  SELECT array_agg(role) INTO v_old_roles
  FROM user_roles
  WHERE user_id = p_user_id;
  
  RAISE NOTICE 'Current company_id: %, Old roles: %', v_current_company_id, v_old_roles;
  
  -- Create transfer log entry
  INSERT INTO user_transfer_logs (
    user_id,
    from_company_id,
    to_company_id,
    old_roles,
    new_roles,
    transfer_reason,
    transferred_by,
    transferred_at
  ) VALUES (
    p_user_id,
    v_current_company_id,
    p_target_company_id,
    v_old_roles,
    p_new_roles,
    p_reason,
    auth.uid(),
    NOW()
  ) RETURNING id INTO v_transfer_log_id;
  
  RAISE NOTICE 'Transfer log created with id: %', v_transfer_log_id;
  
  -- Update user's company in profiles table
  UPDATE profiles
  SET 
    company_id = p_target_company_id,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RAISE NOTICE 'Updated profiles table';
  
  -- Delete old roles
  DELETE FROM user_roles
  WHERE user_id = p_user_id;
  
  RAISE NOTICE 'Deleted old roles';
  
  -- Insert new roles
  INSERT INTO user_roles (user_id, role)
  SELECT p_user_id, unnest(p_new_roles);
  
  RAISE NOTICE 'Inserted new roles: %', p_new_roles;
  
  -- Return the transfer log ID
  RETURN v_transfer_log_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION transfer_user_to_company(UUID, UUID, TEXT[], TEXT) TO authenticated;

COMMENT ON FUNCTION transfer_user_to_company IS 'Transfers a user from one company to another with new roles';

