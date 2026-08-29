CREATE OR REPLACE FUNCTION public.guard_legal_case_filing_readiness_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_reason TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.workflow_stage = 'filed' THEN
    RAISE EXCEPTION 'لا يمكن إنشاء قضية مرفوعة مباشرة؛ أنشئها في مرحلة التجهيز ثم استخدم إجراء الرفع المعتمد'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.workflow_stage = 'filed' THEN
    v_reason := public.legal_case_filing_block_reason_v1(
      NEW.company_id, NEW.id, NEW.case_value
    );
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'لا يمكن رفع الدعوى: %', v_reason USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_legal_case_filing_readiness_v1()
  FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.legal_case_defendant_email_block_reason_v1(UUID, UUID);

ALTER TABLE public.legal_case_litigation_profile
  DROP CONSTRAINT IF EXISTS chk_defendant_email_status_value,
  DROP CONSTRAINT IF EXISTS chk_defendant_email_status,
  DROP COLUMN IF EXISTS defendant_email_status;
