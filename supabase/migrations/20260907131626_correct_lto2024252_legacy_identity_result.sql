-- Correct one legacy OCR result using existing, exact identity evidence.
-- The filename, contract number, active copy and current customer are checked.
-- Original OCR names and numbers remain untouched; before/after values are audited.
DO $repair$
DECLARE
  v_document public.contract_documents%ROWTYPE;
  v_after public.contract_documents%ROWTYPE;
BEGIN
  SELECT d.* INTO v_document
  FROM public.contract_documents d
  JOIN public.contracts c ON c.id = d.contract_id AND c.company_id = d.company_id
  JOIN public.customers cu ON cu.id = c.customer_id AND cu.company_id = c.company_id
  WHERE d.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND c.contract_number = 'LTO2024252'
    AND d.document_name = '721440 - LTO2024252.pdf'
    AND d.document_type = 'signed_contract'
    AND d.legal_evidence_state = 'active'
    AND d.legal_identity_match_status = 'mismatch'
    AND d.legal_identity_checked_at IS NOT NULL
    AND NULLIF(BTRIM(d.file_path), '') IS NOT NULL
    AND d.legal_identity_extracted_name = 'للطرف الاول بموجب هذا العقد ولا يمكن استرجاع'
    AND regexp_replace(d.legal_identity_expected_id, '[^0-9]', '', 'g') ~ '^[0-9]{11}$'
    AND regexp_replace(d.legal_identity_expected_id, '[^0-9]', '', 'g')
      = regexp_replace(d.legal_identity_extracted_id, '[^0-9]', '', 'g')
    AND regexp_replace(d.legal_identity_expected_id, '[^0-9]', '', 'g')
      = regexp_replace(cu.national_id, '[^0-9]', '', 'g')
    AND NOT EXISTS (
      SELECT 1 FROM public.contract_documents other
      WHERE other.company_id = d.company_id AND other.contract_id = d.contract_id
        AND other.id <> d.id AND other.legal_evidence_state = 'active'
        AND other.document_type IN ('signed_contract', 'signed_contract_image')
    )
  FOR UPDATE OF d, c, cu;

  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.contract_documents
  SET legal_identity_match_status = 'matched',
      legal_identity_match_reason = 'تم تصحيح نتيجة قراءة الاسم القديمة: النص المستخرج من شروط العقد وليس اسم شخص؛ الرقم الشخصي المستخرج يطابق الرقم المتوقع وسجل العميل الحالي بالكامل.',
      legal_identity_checked_at = now()
  WHERE id = v_document.id AND company_id = v_document.company_id
  RETURNING * INTO v_after;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, old_values, new_values, metadata
  ) VALUES (
    v_document.company_id, 'correct_lto2024252_legacy_identity_result',
    'contract_documents', v_document.id,
    jsonb_build_object(
      'legal_identity_match_status', v_document.legal_identity_match_status,
      'legal_identity_match_reason', v_document.legal_identity_match_reason,
      'legal_identity_checked_at', v_document.legal_identity_checked_at
    ),
    jsonb_build_object(
      'legal_identity_match_status', v_after.legal_identity_match_status,
      'legal_identity_match_reason', v_after.legal_identity_match_reason,
      'legal_identity_checked_at', v_after.legal_identity_checked_at
    ),
    jsonb_build_object('source', 'legacy_ocr_exact_id_reconciliation',
      'current_customer_identity_matched', true, 'original_extraction_preserved', true)
  );
END;
$repair$;
