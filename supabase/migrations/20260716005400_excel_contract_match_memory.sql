CREATE TABLE IF NOT EXISTS public.excel_import_contract_match_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  source_file_name text NULL,
  source_customer_name text NULL,
  source_plate text NULL,
  match_source text NOT NULL DEFAULT 'manual_review'
    CHECK (match_source IN ('manual_review')),
  confirmed_by uuid NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  last_confirmed_by uuid NULL,
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  confirmation_count integer NOT NULL DEFAULT 1 CHECK (confirmation_count > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_excel_contract_match_memory_contract
  ON public.excel_import_contract_match_memory(company_id, contract_id)
  WHERE is_active = true;

ALTER TABLE public.excel_import_contract_match_memory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.excel_import_contract_match_memory FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.excel_import_contract_match_memory TO service_role;

CREATE OR REPLACE FUNCTION public.remember_excel_import_contract_match_v1(
  p_company_id uuid,
  p_content_hash text,
  p_contract_id uuid,
  p_file_name text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_plate text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
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
  v_approved_contract_id uuid;
  v_memory public.excel_import_contract_match_memory%ROWTYPE;
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL
     OR lower(COALESCE(p_content_hash, '')) !~ '^[0-9a-f]{64}$'
  THEN
    RAISE EXCEPTION 'A valid company, contract, and workbook content hash are required'
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = p_contract_id
      AND contract.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Contract was not found in the selected company'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT version.contract_id
  INTO v_approved_contract_id
  FROM public.excel_import_versions version
  WHERE version.company_id = p_company_id
    AND version.content_hash = lower(p_content_hash)
    AND version.status = 'approved'
  ORDER BY version.approved_at DESC NULLS LAST, version.created_at DESC
  LIMIT 1;

  IF v_approved_contract_id IS NOT NULL
     AND v_approved_contract_id IS DISTINCT FROM p_contract_id
  THEN
    RAISE EXCEPTION 'This workbook was already approved for another contract and cannot be remapped'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.excel_import_contract_match_memory (
    company_id, content_hash, contract_id,
    source_file_name, source_customer_name, source_plate,
    confirmed_by, last_confirmed_by
  ) VALUES (
    p_company_id, lower(p_content_hash), p_contract_id,
    NULLIF(BTRIM(COALESCE(p_file_name, '')), ''),
    NULLIF(BTRIM(COALESCE(p_customer_name, '')), ''),
    NULLIF(BTRIM(COALESCE(p_plate, '')), ''),
    v_actor, v_actor
  )
  ON CONFLICT (company_id, content_hash) DO UPDATE SET
    contract_id = EXCLUDED.contract_id,
    source_file_name = COALESCE(EXCLUDED.source_file_name, excel_import_contract_match_memory.source_file_name),
    source_customer_name = COALESCE(EXCLUDED.source_customer_name, excel_import_contract_match_memory.source_customer_name),
    source_plate = COALESCE(EXCLUDED.source_plate, excel_import_contract_match_memory.source_plate),
    last_confirmed_by = EXCLUDED.last_confirmed_by,
    last_confirmed_at = now(),
    confirmation_count = excel_import_contract_match_memory.confirmation_count + 1,
    is_active = true,
    updated_at = now()
  RETURNING * INTO v_memory;

  RETURN jsonb_build_object(
    'id', v_memory.id,
    'company_id', v_memory.company_id,
    'content_hash', v_memory.content_hash,
    'contract_id', v_memory.contract_id,
    'confirmation_count', v_memory.confirmation_count,
    'remembered', true
  );
END;
$$;

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
  IF p_company_id IS NULL OR lower(COALESCE(p_content_hash, '')) !~ '^[0-9a-f]{64}$' THEN
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
  JOIN public.contracts contract
    ON contract.id = version.contract_id
   AND contract.company_id = version.company_id
  WHERE version.company_id = p_company_id
    AND version.content_hash = lower(p_content_hash)
    AND version.status = 'approved'
  ORDER BY version.approved_at DESC NULLS LAST, version.created_at DESC
  LIMIT 1;

  IF v_contract_id IS NOT NULL THEN
    RETURN v_contract_id;
  END IF;

  SELECT memory.contract_id
  INTO v_contract_id
  FROM public.excel_import_contract_match_memory memory
  JOIN public.contracts contract
    ON contract.id = memory.contract_id
   AND contract.company_id = memory.company_id
  WHERE memory.company_id = p_company_id
    AND memory.content_hash = lower(p_content_hash)
    AND memory.is_active = true
  ORDER BY memory.last_confirmed_at DESC, memory.updated_at DESC
  LIMIT 1;

  RETURN v_contract_id;
END;
$$;

REVOKE ALL ON FUNCTION public.remember_excel_import_contract_match_v1(uuid, text, uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remember_excel_import_contract_match_v1(uuid, text, uuid, text, text, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolve_excel_import_contract_by_hash_v1(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_excel_import_contract_by_hash_v1(uuid, text)
  TO authenticated, service_role;

COMMENT ON TABLE public.excel_import_contract_match_memory IS
  'Remembers reviewed workbook-to-contract decisions so exact files do not require repeated manual matching.';
COMMENT ON FUNCTION public.remember_excel_import_contract_match_v1(uuid, text, uuid, text, text, text) IS
  'Persists or corrects a manual workbook-to-contract review decision after company and approved-version validation.';
COMMENT ON FUNCTION public.resolve_excel_import_contract_by_hash_v1(uuid, text) IS
  'Resolves an exact workbook hash from an approved import first, then from active manual review memory.';
