-- Filing readiness is enforced twice: in the application for clear operator
-- feedback and in PostgreSQL so no direct RPC call can file an incomplete case.

ALTER TABLE public.legal_case_litigation_profile
  ADD COLUMN IF NOT EXISTS defendant_service_address TEXT,
  ADD COLUMN IF NOT EXISTS defendant_email TEXT,
  ADD COLUMN IF NOT EXISTS defendant_contact_source TEXT,
  ADD COLUMN IF NOT EXISTS defendant_contact_document_id UUID
    REFERENCES public.contract_documents(id) ON DELETE SET NULL;

ALTER TABLE public.legal_case_litigation_profile
  ADD CONSTRAINT chk_defendant_contact_source CHECK (
    defendant_contact_source IS NULL
    OR defendant_contact_source IN (
      'customer_record', 'contract', 'national_address', 'verified_manual'
    )
  ),
  ADD CONSTRAINT chk_defendant_contact_evidence CHECK (
    (defendant_service_address IS NULL AND defendant_email IS NULL)
    OR (
      defendant_contact_source IS NOT NULL
      AND (
        defendant_contact_source = 'customer_record'
        OR defendant_contact_document_id IS NOT NULL
      )
    )
  ) NOT VALID,
  ADD CONSTRAINT chk_defendant_email_format CHECK (
    defendant_email IS NULL
    OR defendant_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) NOT VALID;

ALTER TABLE public.legal_case_litigation_profile
  VALIDATE CONSTRAINT chk_defendant_contact_evidence,
  VALIDATE CONSTRAINT chk_defendant_email_format;

CREATE INDEX IF NOT EXISTS idx_legal_case_litigation_profile_contact_document
  ON public.legal_case_litigation_profile (defendant_contact_document_id)
  WHERE defendant_contact_document_id IS NOT NULL;

-- Keep the existing cross-tenant evidence validation and include the new
-- service-contact evidence field.
CREATE OR REPLACE FUNCTION public.validate_legal_case_litigation_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  linked_document_id UUID;
  document_field TEXT;
  document_fields TEXT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = NEW.contract_id AND c.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'contract does not belong to the selected company';
  END IF;

  IF NEW.case_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.legal_cases lc
    WHERE lc.id = NEW.case_id
      AND lc.company_id = NEW.company_id
      AND lc.contract_id = NEW.contract_id
  ) THEN
    RAISE EXCEPTION 'legal case does not belong to the selected company and contract';
  END IF;

  document_fields := CASE TG_TABLE_NAME
    WHEN 'legal_case_litigation_profile' THEN ARRAY[
      'termination_supporting_document_id',
      'delivery_handover_document_id',
      'vehicle_return_document_id',
      'notice_exception_document_id',
      'retention_rate_source_document_id',
      'contractual_compensation_document_id',
      'defendant_contact_document_id'
    ]
    WHEN 'legal_case_formal_notices' THEN ARRAY['proof_document_id']
    WHEN 'legal_case_damage_costs' THEN ARRAY['evidence_document_id']
    ELSE ARRAY[]::TEXT[]
  END;

  FOREACH document_field IN ARRAY document_fields LOOP
    linked_document_id := NULLIF(to_jsonb(NEW) ->> document_field, '')::UUID;
    IF linked_document_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.contract_documents cd
      WHERE cd.id = linked_document_id
        AND cd.company_id = NEW.company_id
        AND cd.contract_id = NEW.contract_id
    ) THEN
      RAISE EXCEPTION 'evidence document does not belong to the selected company and contract';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Canonical amount: outstanding due invoices first, then due schedule rows only
-- for months for which no invoice exists. This never includes future rent.
CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(
  p_company_id UUID,
  p_contract_id UUID,
  p_as_of_date DATE DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE)
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  WITH due_invoices AS (
    SELECT
      date_trunc('month', COALESCE(i.invoice_month, i.due_date)::timestamp)::date AS claim_month,
      i.due_date,
      GREATEST(COALESCE(i.balance_due, i.total_amount - COALESCE(i.paid_amount, 0)), 0) AS amount
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.contract_id = p_contract_id
      AND i.due_date <= p_as_of_date
      AND LOWER(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
      AND LOWER(COALESCE(i.payment_status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
  ),
  due_schedules AS (
    SELECT s.due_date, GREATEST(s.amount - COALESCE(s.paid_amount, 0), 0) AS amount
    FROM public.contract_payment_schedules s
    WHERE s.company_id = p_company_id
      AND s.contract_id = p_contract_id
      AND s.due_date <= p_as_of_date
      AND s.invoice_id IS NULL
      AND LOWER(COALESCE(s.status, '')) NOT IN ('paid', 'cancelled', 'canceled', 'voided', 'reversed')
      AND NOT EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.company_id = s.company_id
          AND i.contract_id = s.contract_id
          AND LOWER(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
          AND LOWER(COALESCE(i.payment_status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
          AND date_trunc('month', COALESCE(i.invoice_month, i.due_date)::timestamp)
              = date_trunc('month', s.due_date::timestamp)
      )
  ),
  claim_rows AS (
    SELECT due_date, amount FROM due_invoices WHERE amount > 0
    UNION ALL
    SELECT due_date, amount FROM due_schedules WHERE amount > 0
  ),
  profile AS (
    SELECT p.*
    FROM public.legal_case_litigation_profile p
    WHERE p.company_id = p_company_id AND p.contract_id = p_contract_id
  ),
  contractual_raw AS (
    SELECT CASE p.contractual_compensation_method
      WHEN 'fixed' THEN p.contractual_compensation_rate
      WHEN 'daily' THEN COALESCE((
        SELECT SUM(GREATEST(p_as_of_date - r.due_date, 0) * p.contractual_compensation_rate)
        FROM claim_rows r
      ), 0)
      WHEN 'per_invoice' THEN (
        SELECT COUNT(*) * p.contractual_compensation_rate FROM claim_rows
      )
      ELSE 0
    END AS amount,
    p.contractual_compensation_cap AS cap
    FROM profile p
    WHERE p.contractual_compensation_enabled
      AND NULLIF(BTRIM(p.contractual_compensation_clause_number), '') IS NOT NULL
      AND NULLIF(BTRIM(p.contractual_compensation_clause_text), '') IS NOT NULL
      AND p.contractual_compensation_method IN ('fixed', 'daily', 'per_invoice')
      AND p.contractual_compensation_rate > 0
      AND p.contractual_compensation_document_id IS NOT NULL
  ),
  extras AS (
    SELECT
      COALESCE((
        SELECT CASE WHEN cap IS NULL THEN amount ELSE LEAST(amount, GREATEST(cap, 0)) END
        FROM contractual_raw
      ), 0) AS contractual_amount,
      COALESCE((
        SELECT SUM(GREATEST(
          d.amount - COALESCE(d.depreciation_deduction, 0) - COALESCE(d.insurance_recovery, 0),
          0
        ))
        FROM public.legal_case_damage_costs d
        WHERE d.company_id = p_company_id
          AND d.contract_id = p_contract_id
          AND d.verified
          AND d.evidence_document_id IS NOT NULL
      ), 0) AS damage_amount,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.contract_documents d
        WHERE d.company_id = p_company_id
          AND d.contract_id = p_contract_id
          AND d.document_type = 'violations_proof'
          AND d.file_path IS NOT NULL
      ) THEN COALESCE((
        SELECT SUM(COALESCE(pe.amount, 0))
        FROM public.penalties pe
        WHERE pe.company_id = p_company_id
          AND pe.contract_id = p_contract_id
          AND COALESCE(pe.payment_status, '') <> 'paid'
          AND COALESCE(pe.status, '') <> 'cancelled'
      ), 0) ELSE 0 END AS violations_amount,
      COALESCE((
        SELECT GREATEST(p_as_of_date - p.termination_date, 0) * p.retention_daily_rate
        FROM profile p
        WHERE p.vehicle_custody = 'with_defendant'
          AND p.rescission_strategy IN ('natural_expiry', 'documented_termination')
          AND p.termination_date IS NOT NULL
          AND p.termination_date_status = 'confirmed'
          AND p.termination_supporting_document_id IS NOT NULL
          AND p.retention_daily_rate > 0
          AND p.retention_rate_source IS NOT NULL
          AND NULLIF(BTRIM(p.retention_rate_source_ref), '') IS NOT NULL
          AND p.retention_rate_source_document_id IS NOT NULL
          AND (
            p.rescission_strategy = 'natural_expiry'
            OR EXISTS (
              SELECT 1 FROM public.legal_case_formal_notices n
              WHERE n.company_id = p_company_id
                AND n.contract_id = p_contract_id
                AND n.notice_type = 'termination_notice'
                AND n.delivery_confirmed
                AND n.proof_document_id IS NOT NULL
                AND n.delivered_on IS NOT NULL
                AND p.termination_date >= n.delivered_on + COALESCE(n.grace_period_days, 0)
            )
          )
      ), 0) AS retention_amount,
      COALESCE((
        SELECT CASE WHEN p.apply_security_deposit
          THEN GREATEST(COALESCE(p.security_deposit_amount, 0), 0)
          ELSE 0 END
        FROM profile p
      ), 0) AS deposit_deduction
  )
  SELECT GREATEST(
    COALESCE((SELECT SUM(amount) FROM claim_rows), 0)
      + contractual_amount
      + damage_amount
      + violations_amount
      + retention_amount
      - deposit_deduction,
    0
  )
  FROM extras;
$$;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE)
  TO service_role;

-- Returns one user-facing reason instead of mutating anything. The trigger and
-- atomic finalizer both call this same function.
CREATE OR REPLACE FUNCTION public.legal_case_filing_block_reason_v1(
  p_company_id UUID,
  p_case_id UUID,
  p_claim_amount NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_case public.legal_cases%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_customer public.customers%ROWTYPE;
  v_profile public.legal_case_litigation_profile%ROWTYPE;
  v_snapshot public.legal_case_memo_snapshots%ROWTYPE;
  v_current_claim NUMERIC;
  v_snapshot_claim_text TEXT;
  v_snapshot_claim NUMERIC;
  v_address TEXT;
  v_email TEXT;
  v_plate TEXT;
BEGIN
  SELECT * INTO v_case
  FROM public.legal_cases
  WHERE id = p_case_id AND company_id = p_company_id;
  IF NOT FOUND OR v_case.contract_id IS NULL THEN
    RETURN 'القضية غير مرتبطة بعقد تابع للشركة.';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts
  WHERE id = v_case.contract_id AND company_id = p_company_id;
  IF NOT FOUND THEN RETURN 'العقد غير تابع للشركة.'; END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = v_contract.customer_id AND company_id = p_company_id;
  IF NOT FOUND OR NULLIF(BTRIM(COALESCE(v_customer.national_id, '')), '') IS NULL THEN
    RETURN 'الرقم الشخصي للمدعى عليه غير مكتمل.';
  END IF;

  IF v_contract.vehicle_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = v_contract.vehicle_id AND v.company_id = p_company_id
  ) THEN
    RETURN 'المركبة غير مرتبطة بالعقد بسجل نظامي.';
  END IF;

  SELECT * INTO v_profile
  FROM public.legal_case_litigation_profile p
  WHERE p.company_id = p_company_id
    AND p.contract_id = v_contract.id;
  IF NOT FOUND OR v_profile.legal_review_status <> 'approved' THEN
    RETURN 'الملف القانوني لم يعتمد بعد.';
  END IF;

  v_address := COALESCE(
    NULLIF(BTRIM(v_profile.defendant_service_address), ''),
    NULLIF(BTRIM(v_customer.address), '')
  );
  v_email := COALESCE(
    NULLIF(BTRIM(v_profile.defendant_email), ''),
    NULLIF(BTRIM(v_customer.email), '')
  );
  IF v_address IS NULL THEN RETURN 'عنوان تبليغ المدعى عليه غير مسجل.'; END IF;
  IF v_email IS NULL THEN RETURN 'البريد الإلكتروني للمدعى عليه غير مسجل.'; END IF;
  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RETURN 'البريد الإلكتروني للمدعى عليه غير صالح للاستخدام في التبليغ.';
  END IF;
  IF v_profile.defendant_contact_source = 'verified_manual'
     AND v_profile.defendant_contact_document_id IS NULL THEN
    RETURN 'بيانات التبليغ اليدوية تحتاج مستند إثبات.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contract_documents d
    WHERE d.company_id = p_company_id
      AND d.contract_id = v_contract.id
      AND d.file_path IS NOT NULL
      AND (
        LOWER(COALESCE(d.document_type, '')) IN ('signed_contract', 'contract')
        OR regexp_replace(LOWER(COALESCE(d.document_name, '')), '[^[:alnum:]]', '', 'g')
           ~ '(signedcontract|signedagreement)'
        OR regexp_replace(COALESCE(d.document_name, ''), '[^[:alnum:]]', '', 'g')
           ~ '(العقدالموقع|عقدموقع)'
      )
  ) THEN
    RETURN 'نسخة العقد المؤيدة غير مرتبطة بالقضية.';
  END IF;

  SELECT * INTO v_snapshot
  FROM public.legal_case_memo_snapshots s
  WHERE s.company_id = p_company_id
    AND s.contract_id = v_contract.id
    AND s.readiness_status = 'approved'
  ORDER BY s.version DESC
  LIMIT 1;
  IF NOT FOUND THEN RETURN 'لا توجد نسخة مذكرة معتمدة.'; END IF;

  v_current_claim := public.calculate_legal_claim_amount_v1(
    p_company_id, v_contract.id, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE
  );
  IF COALESCE(p_claim_amount, 0) <= 0
     OR ROUND(v_current_claim, 2) <> ROUND(p_claim_amount, 2) THEN
    RETURN 'قيمة المطالبة لا تطابق الاستحقاقات الحالّة في النظام.';
  END IF;

  v_snapshot_claim_text := v_snapshot.payload #>> '{customer,total_debt}';
  IF v_snapshot_claim_text IS NULL
     OR v_snapshot_claim_text !~ '^-?[0-9]+([.][0-9]+)?$' THEN
    RETURN 'نسخة المذكرة المعتمدة لا تحتوي قيمة مطالبة قابلة للتحقق.';
  END IF;
  v_snapshot_claim := v_snapshot_claim_text::NUMERIC;
  IF ROUND(v_snapshot_claim, 2) <> ROUND(p_claim_amount, 2) THEN
    RETURN 'نسخة المذكرة المعتمدة لا تطابق قيمة المطالبة الحالية.';
  END IF;

  IF COALESCE(v_snapshot.payload #>> '{customer,id_number}', '')
     <> COALESCE(v_customer.national_id, '') THEN
    RETURN 'هوية المدعى عليه تغيرت بعد اعتماد المذكرة.';
  END IF;
  IF COALESCE(v_snapshot.payload #>> '{customer,address}', '') <> v_address
     OR COALESCE(v_snapshot.payload #>> '{customer,email}', '') <> v_email THEN
    RETURN 'بيانات تبليغ المدعى عليه تغيرت بعد اعتماد المذكرة.';
  END IF;

  SELECT COALESCE(v.plate_number, v_contract.license_plate) INTO v_plate
  FROM public.vehicles v
  WHERE v.id = v_contract.vehicle_id AND v.company_id = p_company_id;
  IF regexp_replace(
       translate(COALESCE(v_snapshot.payload #>> '{vehicleInfo,plate}', ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
       '[^0-9A-Za-z]', '', 'g'
     ) <> regexp_replace(
       translate(COALESCE(v_plate, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
       '[^0-9A-Za-z]', '', 'g'
     ) THEN
    RETURN 'بيانات المركبة تغيرت بعد اعتماد المذكرة.';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.legal_case_filing_block_reason_v1(UUID, UUID, NUMERIC)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.legal_case_filing_block_reason_v1(UUID, UUID, NUMERIC)
  TO service_role;

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

DROP TRIGGER IF EXISTS trg_guard_legal_case_filing_readiness ON public.legal_cases;
CREATE TRIGGER trg_guard_legal_case_filing_readiness
  BEFORE UPDATE OF workflow_stage, case_value ON public.legal_cases
  FOR EACH ROW
  WHEN (NEW.workflow_stage = 'filed')
  EXECUTE FUNCTION public.guard_legal_case_filing_readiness_v1();

DROP TRIGGER IF EXISTS trg_guard_legal_case_filing_readiness_insert ON public.legal_cases;
CREATE TRIGGER trg_guard_legal_case_filing_readiness_insert
  BEFORE INSERT ON public.legal_cases
  FOR EACH ROW
  WHEN (NEW.workflow_stage = 'filed')
  EXECUTE FUNCTION public.guard_legal_case_filing_readiness_v1();

CREATE OR REPLACE FUNCTION public.finalize_legal_case_filing_v1(
  p_company_id UUID,
  p_contract_id UUID,
  p_case_id UUID,
  p_claim_amount NUMERIC,
  p_case_title TEXT,
  p_facts TEXT,
  p_claims TEXT,
  p_actor_id UUID DEFAULT NULL
)
RETURNS public.legal_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_case public.legal_cases%ROWTYPE;
  v_reason TEXT;
BEGIN
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL
     AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'company access denied' USING ERRCODE = '42501';
  END IF;

  -- Same order as the existing workflow transition: case, then contract.
  SELECT * INTO v_case
  FROM public.legal_cases
  WHERE id = p_case_id
    AND company_id = p_company_id
    AND contract_id = p_contract_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'legal case was not found'; END IF;
  PERFORM 1 FROM public.contracts
  WHERE id = p_contract_id AND company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'contract was not found'; END IF;

  v_reason := public.legal_case_filing_block_reason_v1(
    p_company_id, p_case_id, p_claim_amount
  );
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'لا يمكن رفع الدعوى: %', v_reason USING ERRCODE = '23514';
  END IF;

  PERFORM public.sync_lawsuit_preparation_to_legal_case_v1(
    p_company_id,
    p_contract_id,
    p_case_id,
    p_claim_amount,
    p_case_title,
    p_facts,
    p_claims,
    p_actor_id
  );

  SELECT * INTO v_case
  FROM public.transition_legal_case_workflow_v1(
    p_company_id,
    p_case_id,
    'filed',
    'تم تأكيد فتح القضية من صفحة تجهيز الدعوى بعد اجتياز فحص الجاهزية',
    p_actor_id
  );
  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_legal_case_filing_v1(
  UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, UUID
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_legal_case_filing_v1(
  UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, UUID
) TO authenticated, service_role;

-- Audit table makes the operational repair reversible without embedding record
-- identifiers in the migration itself.
CREATE TABLE IF NOT EXISTS public.legal_filing_repair_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  old_vehicle_id UUID,
  new_vehicle_id UUID,
  legal_cases_before JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_profile_id UUID,
  claim_amount NUMERIC NOT NULL,
  repaired_by UUID,
  repaired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legal_filing_repair_audit_contract
  ON public.legal_filing_repair_audit(company_id, contract_id, repaired_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_filing_repair_audit_contract_id
  ON public.legal_filing_repair_audit(contract_id);
ALTER TABLE public.legal_filing_repair_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.legal_filing_repair_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.repair_legal_preparation_case_v1(
  p_company_id UUID,
  p_contract_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_vehicle_id UUID;
  v_vehicle_count INTEGER;
  v_claim NUMERIC;
  v_case_before JSONB;
  v_profile_id UUID;
  v_due_day SMALLINT;
BEGIN
  IF auth.uid() IS NULL
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'service role is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL
     AND (
       public.get_user_company_id() IS DISTINCT FROM p_company_id
       OR NOT public.is_company_manager(p_company_id)
     ) THEN
    RAISE EXCEPTION 'manager permission is required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id AND company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'contract was not found'; END IF;

  IF v_contract.vehicle_id IS NULL AND NULLIF(BTRIM(v_contract.license_plate), '') IS NOT NULL THEN
    SELECT COUNT(*), (ARRAY_AGG(v.id ORDER BY v.id))[1]
      INTO v_vehicle_count, v_vehicle_id
    FROM public.vehicles v
    WHERE v.company_id = p_company_id
      AND regexp_replace(
        translate(COALESCE(v.plate_number, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
        '[^0-9A-Za-z]', '', 'g'
      ) = regexp_replace(
        translate(COALESCE(v_contract.license_plate, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
        '[^0-9A-Za-z]', '', 'g'
      );
    IF v_vehicle_count = 1 THEN
      UPDATE public.contracts
      SET vehicle_id = v_vehicle_id, updated_at = NOW()
      WHERE id = p_contract_id AND company_id = p_company_id;
    ELSE
      v_vehicle_id := NULL;
    END IF;
  ELSE
    v_vehicle_id := v_contract.vehicle_id;
  END IF;

  v_claim := public.calculate_legal_claim_amount_v1(
    p_company_id, p_contract_id, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE
  );
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', lc.id,
    'case_value', lc.case_value,
    'filing_date', lc.filing_date
  )), '[]'::JSONB)
    INTO v_case_before
  FROM public.legal_cases lc
  WHERE lc.company_id = p_company_id
    AND lc.contract_id = p_contract_id
    AND lc.workflow_stage = 'preparation';

  UPDATE public.legal_cases
  SET case_value = v_claim,
      filing_date = CASE WHEN case_reference IS NULL THEN NULL ELSE filing_date END,
      updated_at = NOW()
  WHERE company_id = p_company_id
    AND contract_id = p_contract_id
    AND workflow_stage = 'preparation';

  SELECT CASE
    WHEN MIN(EXTRACT(DAY FROM s.due_date)) = MAX(EXTRACT(DAY FROM s.due_date))
      THEN MIN(EXTRACT(DAY FROM s.due_date))::SMALLINT
    ELSE NULL
  END INTO v_due_day
  FROM public.contract_payment_schedules s
  WHERE s.company_id = p_company_id AND s.contract_id = p_contract_id;

  INSERT INTO public.legal_case_litigation_profile (
    company_id, contract_id, case_id, rescission_strategy, termination_type,
    termination_date_status, vehicle_custody, rent_due_day,
    legal_review_status, notes, created_by
  )
  SELECT
    p_company_id,
    p_contract_id,
    (
      SELECT lc.id FROM public.legal_cases lc
      WHERE lc.company_id = p_company_id AND lc.contract_id = p_contract_id
      ORDER BY lc.created_at DESC LIMIT 1
    ),
    'judicial_rescission',
    'judicial_rescission',
    'requires_judicial_proof',
    'unknown',
    v_due_day,
    'draft',
    '[system-seed:legal-filing-readiness] ملف مسودة؛ لا يتضمن بيانات تبليغ أو إنهاء مفترضة.',
    COALESCE(auth.uid(), p_actor_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.legal_case_litigation_profile p
    WHERE p.company_id = p_company_id AND p.contract_id = p_contract_id
  )
  RETURNING id INTO v_profile_id;

  INSERT INTO public.legal_filing_repair_audit (
    company_id, contract_id, old_vehicle_id, new_vehicle_id,
    legal_cases_before, created_profile_id, claim_amount, repaired_by
  ) VALUES (
    p_company_id, p_contract_id, v_contract.vehicle_id, v_vehicle_id,
    v_case_before, v_profile_id, v_claim, COALESCE(auth.uid(), p_actor_id)
  );

  RETURN jsonb_build_object(
    'claim_amount', v_claim,
    'vehicle_linked', v_vehicle_id IS NOT NULL,
    'profile_created', v_profile_id IS NOT NULL,
    'preparation_cases_repaired', jsonb_array_length(v_case_before)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.repair_legal_preparation_case_v1(UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_legal_preparation_case_v1(UUID, UUID, UUID)
  TO service_role;

COMMENT ON FUNCTION public.finalize_legal_case_filing_v1(
  UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, UUID
) IS 'Atomically validates, synchronizes, and files a contract legal case.';
