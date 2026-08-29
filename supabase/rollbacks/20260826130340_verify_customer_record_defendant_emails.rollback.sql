UPDATE public.legal_case_litigation_profile
SET defendant_email_status = 'unavailable',
    defendant_contact_source = NULL,
    updated_at = NOW()
WHERE defendant_email_status = 'verified'
  AND defendant_email IS NULL
  AND defendant_contact_source = 'customer_record';

ALTER TABLE public.legal_case_litigation_profile
  DROP CONSTRAINT IF EXISTS chk_defendant_email_status_value;

ALTER TABLE public.legal_case_litigation_profile
  ADD CONSTRAINT chk_defendant_email_status_value CHECK (
    (defendant_email_status = 'verified' AND NULLIF(BTRIM(defendant_email), '') IS NOT NULL)
    OR (defendant_email_status IN ('unknown', 'unavailable') AND defendant_email IS NULL)
  );

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
