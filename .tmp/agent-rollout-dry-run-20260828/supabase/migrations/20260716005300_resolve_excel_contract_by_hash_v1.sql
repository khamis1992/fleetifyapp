CREATE OR REPLACE FUNCTION public.resolve_excel_import_contract_by_hash_v1(
  p_company_id uuid,
  p_content_hash text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(
    NULLIF(auth.role()::text, ''),
    current_setting('request.jwt.claim.role', true),
    ''
  );
  v_contract_id uuid;
BEGIN
  IF p_company_id IS NULL OR p_content_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A valid company and workbook content hash are required'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR NOT (
      public.get_user_company_id() = p_company_id
      OR EXISTS (
        SELECT 1
        FROM public.user_roles role_row
        WHERE role_row.user_id = v_actor
          AND role_row.role = 'super_admin'
      )
    ) THEN
      RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT version.contract_id
  INTO v_contract_id
  FROM public.excel_import_versions version
  WHERE version.company_id = p_company_id
    AND version.content_hash = lower(p_content_hash)
    AND version.status = 'approved'
  ORDER BY version.approved_at DESC NULLS LAST, version.created_at DESC
  LIMIT 1;

  RETURN v_contract_id;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_excel_import_contract_by_hash_v1(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_excel_import_contract_by_hash_v1(uuid, text)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.resolve_excel_import_contract_by_hash_v1(uuid, text) IS
  'Returns only the approved contract id for an exact workbook hash after company-access verification.';
