-- Restore only the audited classification if no later verification has replaced it.
-- Retain the original audit event and record the rollback as another event.
DO $rollback$
DECLARE
  v_audit public.audit_logs%ROWTYPE;
  v_document public.contract_documents%ROWTYPE;
BEGIN
  FOR v_audit IN
    SELECT * FROM public.audit_logs
    WHERE action = 'correct_lto2024252_legacy_identity_result'
      AND company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  LOOP
    SELECT * INTO v_document FROM public.contract_documents d
    WHERE d.id = v_audit.resource_id AND d.company_id = v_audit.company_id
      AND d.legal_identity_match_status = v_audit.new_values->>'legal_identity_match_status'
      AND d.legal_identity_match_reason IS NOT DISTINCT FROM v_audit.new_values->>'legal_identity_match_reason'
      AND d.legal_identity_checked_at = (v_audit.new_values->>'legal_identity_checked_at')::timestamptz
    FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    UPDATE public.contract_documents
    SET legal_identity_match_status = v_audit.old_values->>'legal_identity_match_status',
        legal_identity_match_reason = v_audit.old_values->>'legal_identity_match_reason',
        legal_identity_checked_at = (v_audit.old_values->>'legal_identity_checked_at')::timestamptz
    WHERE id = v_document.id AND company_id = v_document.company_id;

    INSERT INTO public.audit_logs (
      company_id, action, resource_type, resource_id, old_values, new_values, metadata
    ) VALUES (
      v_document.company_id, 'rollback_lto2024252_legacy_identity_result',
      'contract_documents', v_document.id, v_audit.new_values, v_audit.old_values,
      jsonb_build_object('reverses_audit_id', v_audit.id)
    );
  END LOOP;
END;
$rollback$;
