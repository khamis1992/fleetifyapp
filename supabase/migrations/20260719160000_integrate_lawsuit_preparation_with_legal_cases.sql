-- Link lawsuit preparation artifacts to their legal case and keep the link synchronized.

ALTER TABLE public.lawsuit_documents
  ADD COLUMN IF NOT EXISTS legal_case_id uuid;
ALTER TABLE public.lawsuit_preparations
  ADD COLUMN IF NOT EXISTS legal_case_id uuid;
ALTER TABLE public.lawsuit_templates
  ADD COLUMN IF NOT EXISTS legal_case_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lawsuit_documents_legal_case_id_fkey') THEN
    ALTER TABLE public.lawsuit_documents
      ADD CONSTRAINT lawsuit_documents_legal_case_id_fkey
      FOREIGN KEY (legal_case_id) REFERENCES public.legal_cases(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lawsuit_preparations_legal_case_id_fkey') THEN
    ALTER TABLE public.lawsuit_preparations
      ADD CONSTRAINT lawsuit_preparations_legal_case_id_fkey
      FOREIGN KEY (legal_case_id) REFERENCES public.legal_cases(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lawsuit_templates_legal_case_id_fkey') THEN
    ALTER TABLE public.lawsuit_templates
      ADD CONSTRAINT lawsuit_templates_legal_case_id_fkey
      FOREIGN KEY (legal_case_id) REFERENCES public.legal_cases(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lawsuit_documents_legal_case_id
  ON public.lawsuit_documents(legal_case_id);
CREATE INDEX IF NOT EXISTS idx_lawsuit_preparations_legal_case_id
  ON public.lawsuit_preparations(legal_case_id);
CREATE INDEX IF NOT EXISTS idx_lawsuit_templates_legal_case_id
  ON public.lawsuit_templates(legal_case_id);

-- Prefer the latest live case; use the latest historical case only when no live case exists.
UPDATE public.lawsuit_documents d
SET legal_case_id = (
  SELECT c.id
  FROM public.legal_cases c
  WHERE c.company_id = d.company_id AND c.contract_id = d.contract_id
  ORDER BY
    CASE WHEN c.case_status IN ('open', 'active', 'pending', 'on_hold', 'under_review') THEN 0 ELSE 1 END,
    c.created_at DESC,
    c.id DESC
  LIMIT 1
)
WHERE d.contract_id IS NOT NULL;

UPDATE public.lawsuit_preparations p
SET legal_case_id = (
  SELECT c.id
  FROM public.legal_cases c
  WHERE c.company_id = p.company_id AND c.contract_id = p.contract_id
  ORDER BY
    CASE WHEN c.case_status IN ('open', 'active', 'pending', 'on_hold', 'under_review') THEN 0 ELSE 1 END,
    c.created_at DESC,
    c.id DESC
  LIMIT 1
)
WHERE p.contract_id IS NOT NULL;

UPDATE public.lawsuit_templates t
SET legal_case_id = (
  SELECT c.id
  FROM public.legal_cases c
  WHERE c.company_id = t.company_id AND c.contract_id = t.contract_id
  ORDER BY
    CASE WHEN c.case_status IN ('open', 'active', 'pending', 'on_hold', 'under_review') THEN 0 ELSE 1 END,
    c.created_at DESC,
    c.id DESC
  LIMIT 1
)
WHERE t.contract_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_current_legal_case_to_lawsuit_record_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_id IS NULL THEN
    NEW.legal_case_id := NULL;
    RETURN NEW;
  END IF;

  SELECT c.id INTO NEW.legal_case_id
  FROM public.legal_cases c
  WHERE c.company_id = NEW.company_id
    AND c.contract_id = NEW.contract_id
  ORDER BY
    CASE WHEN c.case_status IN ('open', 'active', 'pending', 'on_hold', 'under_review') THEN 0 ELSE 1 END,
    c.created_at DESC,
    c.id DESC
  LIMIT 1;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lawsuit_documents_assign_legal_case ON public.lawsuit_documents;
CREATE TRIGGER trg_lawsuit_documents_assign_legal_case
BEFORE INSERT OR UPDATE OF company_id, contract_id ON public.lawsuit_documents
FOR EACH ROW EXECUTE FUNCTION public.assign_current_legal_case_to_lawsuit_record_v1();

DROP TRIGGER IF EXISTS trg_lawsuit_preparations_assign_legal_case ON public.lawsuit_preparations;
CREATE TRIGGER trg_lawsuit_preparations_assign_legal_case
BEFORE INSERT OR UPDATE OF company_id, contract_id ON public.lawsuit_preparations
FOR EACH ROW EXECUTE FUNCTION public.assign_current_legal_case_to_lawsuit_record_v1();

DROP TRIGGER IF EXISTS trg_lawsuit_templates_assign_legal_case ON public.lawsuit_templates;
CREATE TRIGGER trg_lawsuit_templates_assign_legal_case
BEFORE INSERT OR UPDATE OF company_id, contract_id ON public.lawsuit_templates
FOR EACH ROW EXECUTE FUNCTION public.assign_current_legal_case_to_lawsuit_record_v1();

CREATE OR REPLACE FUNCTION public.sync_lawsuit_preparation_to_legal_case_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_case_id uuid,
  p_claim_amount numeric DEFAULT 0,
  p_case_title text DEFAULT NULL,
  p_facts text DEFAULT NULL,
  p_claims text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := COALESCE(auth.uid(), p_actor_id);
  v_documents integer := 0;
  v_preparations integer := 0;
  v_templates integer := 0;
BEGIN
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NOT NULL
     AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.legal_cases c
    WHERE c.id = p_case_id
      AND c.company_id = p_company_id
      AND c.contract_id = p_contract_id
  ) THEN
    RAISE EXCEPTION 'The legal case does not belong to this contract' USING ERRCODE = '23514';
  END IF;

  UPDATE public.legal_cases
  SET case_value = GREATEST(COALESCE(p_claim_amount, 0), 0),
      case_title = COALESCE(NULLIF(BTRIM(p_case_title), ''), case_title),
      description = COALESCE(NULLIF(BTRIM(p_facts), ''), description),
      notes = CASE
        WHEN NULLIF(BTRIM(p_claims), '') IS NULL THEN notes
        WHEN COALESCE(notes, '') LIKE '%' || BTRIM(p_claims) || '%' THEN notes
        ELSE CONCAT_WS(E'\n\n', NULLIF(BTRIM(notes), ''), BTRIM(p_claims))
      END,
      updated_at = now()
  WHERE id = p_case_id AND company_id = p_company_id;

  UPDATE public.lawsuit_documents
  SET legal_case_id = p_case_id, updated_at = now()
  WHERE company_id = p_company_id AND contract_id = p_contract_id;
  GET DIAGNOSTICS v_documents = ROW_COUNT;

  UPDATE public.lawsuit_preparations
  SET legal_case_id = p_case_id, updated_at = now()
  WHERE company_id = p_company_id AND contract_id = p_contract_id;
  GET DIAGNOSTICS v_preparations = ROW_COUNT;

  UPDATE public.lawsuit_templates
  SET legal_case_id = p_case_id, updated_at = now()
  WHERE company_id = p_company_id AND contract_id = p_contract_id;
  GET DIAGNOSTICS v_templates = ROW_COUNT;

  INSERT INTO public.legal_case_activities (
    case_id, company_id, activity_type, activity_title, activity_description,
    new_values, created_by
  ) VALUES (
    p_case_id,
    p_company_id,
    'lawsuit_preparation_synced',
    'تم ربط ملف تجهيز الدعوى',
    format('تم ربط %s مستندات تجهيز بالقضية وتحديث قيمة المطالبة إلى %s ر.ق.', v_documents, COALESCE(p_claim_amount, 0)),
    jsonb_build_object(
      'contract_id', p_contract_id,
      'claim_amount', GREATEST(COALESCE(p_claim_amount, 0), 0),
      'documents_count', v_documents,
      'preparations_count', v_preparations,
      'templates_count', v_templates
    ),
    v_actor_id
  );

  RETURN jsonb_build_object(
    'case_id', p_case_id,
    'documents_count', v_documents,
    'preparations_count', v_preparations,
    'templates_count', v_templates
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_lawsuit_preparation_to_legal_case_v1(uuid, uuid, uuid, numeric, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_lawsuit_preparation_to_legal_case_v1(uuid, uuid, uuid, numeric, text, text, text, uuid) TO authenticated, service_role;

