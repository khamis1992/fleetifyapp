CREATE OR REPLACE FUNCTION public.transfer_user_to_company(
  p_user_id uuid, 
  p_from_company_id uuid, 
  p_to_company_id uuid, 
  p_new_roles text[], 
  p_transfer_reason text DEFAULT NULL::text, 
  p_data_handling_strategy jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  -- ✅ FIXED: Changed from `id` to `user_id`
  UPDATE profiles
  SET company_id = p_to_company_id,
      updated_at = NOW()
  WHERE user_id = p_user_id;

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
    transferred_by,
    transfer_reason,
    data_handling_strategy,
    new_roles,
    status,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_from_company_id,
    p_to_company_id,
    auth.uid(), -- Current authenticated user
    p_transfer_reason,
    p_data_handling_strategy,
    p_new_roles,
    'completed',
    NOW(),
    NOW()
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
$function$;

