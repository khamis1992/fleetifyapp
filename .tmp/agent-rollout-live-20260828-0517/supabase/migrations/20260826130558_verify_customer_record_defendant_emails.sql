-- The operator confirmed that customers.email is the correct defendant email,
-- including the shared company-held value. Keep it canonical in customers and
-- record only its verification/source in the litigation profile.
ALTER TABLE public.legal_case_litigation_profile
  DROP CONSTRAINT IF EXISTS chk_defendant_email_status_value;

ALTER TABLE public.legal_case_litigation_profile
  ADD CONSTRAINT chk_defendant_email_status_value CHECK (
    (
      defendant_email_status = 'verified'
      AND (
        NULLIF(BTRIM(defendant_email), '') IS NOT NULL
        OR defendant_contact_source = 'customer_record'
      )
    )
    OR (
      defendant_email_status IN ('unknown', 'unavailable')
      AND defendant_email IS NULL
    )
  );

UPDATE public.legal_case_litigation_profile p
SET defendant_email_status = 'verified',
    defendant_email = NULL,
    defendant_contact_source = 'customer_record',
    defendant_contact_document_id = NULL,
    updated_at = NOW()
FROM public.contracts c
JOIN public.customers cu
  ON cu.id = c.customer_id
 AND cu.company_id = c.company_id
WHERE p.contract_id = c.id
  AND p.company_id = c.company_id
  AND p.defendant_email_status IN ('unknown', 'unavailable')
  AND NULLIF(BTRIM(cu.email), '') IS NOT NULL
  AND cu.email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$';

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
      CASE
        WHEN COALESCE(
          NULLIF(BTRIM(p.defendant_email), ''),
          CASE WHEN p.defendant_contact_source = 'customer_record'
            THEN NULLIF(BTRIM(cu.email), '')
            ELSE NULL
          END
        ) IS NULL THEN 'حالة بريد المدعى عليه متحقق لكن البريد غير مسجل.'
        WHEN COALESCE(
          NULLIF(BTRIM(p.defendant_email), ''),
          CASE WHEN p.defendant_contact_source = 'customer_record'
            THEN NULLIF(BTRIM(cu.email), '')
            ELSE NULL
          END
        ) !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
          THEN 'البريد الإلكتروني للمدعى عليه غير صالح للاستخدام في التبليغ.'
        ELSE NULL
      END
    ELSE 'حالة بريد المدعى عليه غير صالحة.'
  END
  FROM public.legal_cases lc
  JOIN public.contracts c
    ON c.id = lc.contract_id
   AND c.company_id = lc.company_id
  JOIN public.customers cu
    ON cu.id = c.customer_id
   AND cu.company_id = c.company_id
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

;
