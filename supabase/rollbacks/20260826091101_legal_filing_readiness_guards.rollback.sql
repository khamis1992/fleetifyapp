-- Restore only repairs recorded by this feature, newest first.
DO $$
DECLARE
  repair RECORD;
  case_state JSONB;
BEGIN
  IF to_regclass('public.legal_filing_repair_audit') IS NOT NULL THEN
    FOR repair IN
      SELECT * FROM public.legal_filing_repair_audit ORDER BY repaired_at DESC
    LOOP
      UPDATE public.contracts
      SET vehicle_id = repair.old_vehicle_id, updated_at = NOW()
      WHERE id = repair.contract_id
        AND company_id = repair.company_id
        AND vehicle_id IS NOT DISTINCT FROM repair.new_vehicle_id;

      FOR case_state IN SELECT * FROM jsonb_array_elements(repair.legal_cases_before)
      LOOP
        UPDATE public.legal_cases
        SET case_value = (case_state ->> 'case_value')::NUMERIC,
            filing_date = NULLIF(case_state ->> 'filing_date', '')::DATE,
            updated_at = NOW()
        WHERE id = (case_state ->> 'id')::UUID
          AND company_id = repair.company_id
          AND contract_id = repair.contract_id
          AND workflow_stage = 'preparation';
      END LOOP;

      DELETE FROM public.legal_case_litigation_profile
      WHERE id = repair.created_profile_id
        AND company_id = repair.company_id
        AND contract_id = repair.contract_id
        AND legal_review_status = 'draft'
        AND notes = '[system-seed:legal-filing-readiness] ملف مسودة؛ لا يتضمن بيانات تبليغ أو إنهاء مفترضة.';
    END LOOP;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_legal_case_filing_readiness ON public.legal_cases;
DROP TRIGGER IF EXISTS trg_guard_legal_case_filing_readiness_insert ON public.legal_cases;
DROP FUNCTION IF EXISTS public.finalize_legal_case_filing_v1(UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.guard_legal_case_filing_readiness_v1();
DROP FUNCTION IF EXISTS public.legal_case_filing_block_reason_v1(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.repair_legal_preparation_case_v1(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.calculate_legal_claim_amount_v1(UUID, UUID, DATE);
DROP TABLE IF EXISTS public.legal_filing_repair_audit;

ALTER TABLE public.legal_case_litigation_profile
  DROP CONSTRAINT IF EXISTS chk_defendant_email_format,
  DROP CONSTRAINT IF EXISTS chk_defendant_contact_evidence,
  DROP CONSTRAINT IF EXISTS chk_defendant_contact_source;

DROP INDEX IF EXISTS public.idx_legal_case_litigation_profile_contact_document;

ALTER TABLE public.legal_case_litigation_profile
  DROP COLUMN IF EXISTS defendant_contact_document_id,
  DROP COLUMN IF EXISTS defendant_contact_source,
  DROP COLUMN IF EXISTS defendant_email,
  DROP COLUMN IF EXISTS defendant_service_address;

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
      'termination_supporting_document_id', 'delivery_handover_document_id',
      'vehicle_return_document_id', 'notice_exception_document_id',
      'retention_rate_source_document_id', 'contractual_compensation_document_id'
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
