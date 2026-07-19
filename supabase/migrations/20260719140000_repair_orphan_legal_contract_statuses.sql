-- Repair legacy contracts marked legal without a case or an audit reason, then
-- require every future transition into legal procedure to have an open case.

CREATE TEMP TABLE orphan_legal_contract_repairs ON COMMIT DROP AS
WITH first_legal_transition AS (
  SELECT DISTINCT ON (log.contract_id)
    log.contract_id,
    lower(log.old_values->>'status') AS previous_status,
    log.performed_at
  FROM public.contract_operations_log log
  WHERE lower(COALESCE(log.new_values->>'status', '')) = 'under_legal_procedure'
    AND lower(COALESCE(log.old_values->>'status', '')) <> 'under_legal_procedure'
  ORDER BY log.contract_id, log.performed_at ASC, log.id ASC
)
SELECT
  contract.id AS contract_id,
  contract.company_id,
  contract.contract_number,
  contract.status AS old_status,
  CASE
    WHEN transition.previous_status IN (
      'active', 'cancelled', 'canceled', 'expired', 'pending', 'draft', 'suspended'
    ) THEN transition.previous_status
    WHEN contract.end_date < CURRENT_DATE THEN 'expired'
    ELSE 'active'
  END AS target_status
FROM public.contracts contract
LEFT JOIN first_legal_transition transition ON transition.contract_id = contract.id
WHERE lower(COALESCE(contract.status::text, '')) = 'under_legal_procedure'
  AND contract.legal_status IS NULL
  AND NULLIF(BTRIM(COALESCE(contract.suspension_reason, '')), '') IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = contract.company_id
      AND legal_case.contract_id = contract.id
      AND lower(COALESCE(legal_case.case_status, '')) IN (
        'open', 'active', 'pending', 'on_hold', 'under_review'
      )
  );

INSERT INTO public.contract_operations_log (
  contract_id,
  company_id,
  operation_type,
  operation_details,
  old_values,
  new_values,
  notes,
  performed_by,
  performed_at
)
SELECT
  repair.contract_id,
  repair.company_id,
  'repair_orphan_legal_status',
  jsonb_build_object(
    'migration', '20260719140000',
    'basis', 'No open legal case, legal status, or suspension reason exists'
  ),
  jsonb_build_object('status', repair.old_status),
  jsonb_build_object('status', repair.target_status),
  'إعادة حالة العقد السابقة بعد اكتشاف تصنيف قانوني غير مدعوم',
  NULL,
  now()
FROM orphan_legal_contract_repairs repair;

UPDATE public.contracts contract
SET
  status = repair.target_status,
  updated_at = now()
FROM orphan_legal_contract_repairs repair
WHERE contract.id = repair.contract_id
  AND contract.company_id = repair.company_id
  AND lower(COALESCE(contract.status::text, '')) = 'under_legal_procedure';

CREATE OR REPLACE FUNCTION public.enforce_contract_legal_case_evidence_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.status::text, '')) = 'under_legal_procedure'
     AND (
       TG_OP = 'INSERT'
       OR lower(COALESCE(OLD.status::text, '')) <> 'under_legal_procedure'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.legal_cases legal_case
       WHERE legal_case.company_id = NEW.company_id
         AND legal_case.contract_id = NEW.id
         AND lower(COALESCE(legal_case.case_status, '')) IN (
           'open', 'active', 'pending', 'on_hold', 'under_review'
         )
     )
  THEN
    RAISE EXCEPTION 'A contract cannot enter legal procedure without an open legal case'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_contract_legal_case_evidence_v1() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_contract_legal_case_evidence
  ON public.contracts;

CREATE TRIGGER enforce_contract_legal_case_evidence
BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_contract_legal_case_evidence_v1();
