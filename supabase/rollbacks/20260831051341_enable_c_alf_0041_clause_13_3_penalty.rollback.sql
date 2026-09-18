BEGIN;

-- Reverses only the exact clause values installed by the matching migration.
-- Memo snapshots remain immutable; the profile stays draft after reversal.
DO $rollback$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id CONSTANT UUID := '4fcdae07-20f2-4bad-ba1c-e3de57df2a6d';
  v_clause_text CONSTANT TEXT := 'في حال مخالفة الطرف الثاني لأي من بنود هذا العقد يحق للطرف الأول إنهاء العقد دون الحاجة إلى إنذار أو إخطار من قبل الطرف الأول، كما يترتب على الطرف الثاني غرامة 2000 ريال في حال إلغاء العقد بسبب مخالفته لأحد البنود.';
BEGIN
  UPDATE public.legal_case_litigation_profile profile
  SET contractual_compensation_enabled = FALSE,
      contractual_compensation_clause_number = NULL,
      contractual_compensation_clause_text = NULL,
      contractual_compensation_method = NULL,
      contractual_compensation_rate = NULL,
      contractual_compensation_cap = NULL,
      contractual_compensation_document_id = NULL
  WHERE profile.company_id = v_company_id
    AND profile.contract_id = v_contract_id
    AND profile.contractual_compensation_enabled
    AND profile.contractual_compensation_clause_number = '13.3'
    AND profile.contractual_compensation_clause_text = v_clause_text
    AND profile.contractual_compensation_method = 'fixed'
    AND profile.contractual_compensation_rate = 2000
    AND profile.contractual_compensation_cap = 2000
    AND profile.contractual_compensation_document_id IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clause 13.3 correction is not in the expected state; rollback aborted';
  END IF;
END;
$rollback$;

COMMIT;
