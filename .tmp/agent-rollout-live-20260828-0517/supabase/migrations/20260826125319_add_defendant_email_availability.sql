-- Separate a verified defendant email from an explicitly unavailable one.
-- The claimant/representative email is configuration data and must never be
-- copied into this evidentiary field.
ALTER TABLE public.legal_case_litigation_profile
  ADD COLUMN defendant_email_status TEXT NOT NULL DEFAULT 'unknown';

UPDATE public.legal_case_litigation_profile
SET defendant_email_status = CASE
  WHEN NULLIF(BTRIM(defendant_email), '') IS NOT NULL THEN 'verified'
  ELSE 'unavailable'
END;

ALTER TABLE public.legal_case_litigation_profile
  ADD CONSTRAINT chk_defendant_email_status CHECK (
    defendant_email_status IN ('unknown', 'verified', 'unavailable')
  ),
  ADD CONSTRAINT chk_defendant_email_status_value CHECK (
    (defendant_email_status = 'verified' AND NULLIF(BTRIM(defendant_email), '') IS NOT NULL)
    OR (defendant_email_status IN ('unknown', 'unavailable') AND defendant_email IS NULL)
  );

COMMENT ON COLUMN public.legal_case_litigation_profile.defendant_email_status IS
  'unknown=not reviewed, verified=actual defendant email verified, unavailable=not held by company; never substitute claimant email';

CREATE OR REPLACE FUNCTION public.legal_case_defendant_email_block_reason_v1(
  p_company_id UUID,
  p_case_id UUID
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE p.defendant_email_status
    WHEN 'unavailable' THEN
      'بريد المدعى عليه غير متوفر لدى الشركة؛ يلزم استكمال بريد حقيقي أو مراجعة الرفع يدوياً، ولا يجوز استخدام بريد المدعية بدلاً منه.'
    WHEN 'unknown' THEN
      'حالة بريد المدعى عليه غير محددة.'
    WHEN 'verified' THEN
      CASE WHEN NULLIF(BTRIM(p.defendant_email), '') IS NULL
        THEN 'حالة بريد المدعى عليه متحقق لكن البريد غير مسجل.'
        ELSE NULL
      END
    ELSE 'حالة بريد المدعى عليه غير صالحة.'
  END
  FROM public.legal_cases lc
  JOIN public.legal_case_litigation_profile p
    ON p.company_id = lc.company_id
   AND p.contract_id = lc.contract_id
  WHERE lc.id = p_case_id
    AND lc.company_id = p_company_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.legal_case_defendant_email_block_reason_v1(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.legal_case_defendant_email_block_reason_v1(UUID, UUID)
  TO service_role;

-- Recreate the transition guard so the explicit availability state is checked
-- before the broader filing readiness function. This also protects direct
-- workflow updates and the finalizer's eventual filed transition.
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
    v_reason := public.legal_case_defendant_email_block_reason_v1(
      NEW.company_id, NEW.id
    );
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'لا يمكن رفع الدعوى: %', v_reason USING ERRCODE = '23514';
    END IF;
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

;
