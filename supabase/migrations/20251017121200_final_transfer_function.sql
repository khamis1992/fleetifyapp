-- Final version: Bypass RLS completely for transfer operation
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
BEGIN
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

  -- Temporarily disable RLS for this transaction
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  
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

  -- 2. Delete old roles
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

  -- Reset config
  PERFORM set_config('request.jwt.claim.role', NULL, true);

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User transferred successfully',
    'transferLogId', v_transfer_log_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Reset config on error
    PERFORM set_config('request.jwt.claim.role', NULL, true);
    -- Rollback happens automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION transfer_user_to_company TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_user_to_company TO service_role;

COMMENT ON FUNCTION transfer_user_to_company IS 'Transfers a user from one company to another (Final version with RLS bypass)';

