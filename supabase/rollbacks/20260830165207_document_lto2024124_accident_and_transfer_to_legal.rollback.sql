-- Revert only the pending review/tasks created by migration 20260830174500.
-- Historical audit records are preserved and a rollback audit is appended.
DO $rollback$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID;
  v_contract_id CONSTANT UUID := '622fce10-727e-49e0-ab45-8d2b305d452e'::UUID;
  v_customer_id CONSTANT UUID := '286b0804-fdf0-4a56-b71c-90d9e9ce3839'::UUID;
  v_actor_user_id CONSTANT UUID := '2a2b3a8a-35dd-4251-a8ba-09f70538c920'::UUID;
  v_migration_key CONSTANT TEXT := '20260830174500_lto2024124_accident_legal_transfer';
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.legal_transfer_employee_reviews review
    WHERE review.company_id = v_company_id
      AND review.contract_id = v_contract_id
      AND review.request_snapshot ->> 'migration_key' = v_migration_key
      AND review.status NOT IN ('awaiting_assignment', 'pending')
  ) THEN
    RAISE EXCEPTION 'Refusing rollback because the legal review has already progressed';
  END IF;

  DELETE FROM public.tasks task
  WHERE task.company_id = v_company_id
    AND task.metadata ->> 'migration_key' = v_migration_key
    AND task.status = 'pending';

  DELETE FROM public.contract_operations_log operation
  WHERE operation.company_id = v_company_id
    AND operation.contract_id = v_contract_id
    AND operation.operation_details ->> 'migration_key' = v_migration_key;

  DELETE FROM public.legal_transfer_employee_reviews review
  WHERE review.company_id = v_company_id
    AND review.contract_id = v_contract_id
    AND review.request_snapshot ->> 'migration_key' = v_migration_key
    AND review.status IN ('awaiting_assignment', 'pending');

  UPDATE public.contracts
  SET description = NULL,
      suspension_reason = NULL,
      legal_status = NULL,
      sub_status = NULL,
      updated_at = NOW()
  WHERE id = v_contract_id
    AND company_id = v_company_id
    AND status = 'cancelled'
    AND legal_status = 'under_legal_action';

  UPDATE public.customers
  SET last_name_ar = 'عبد الرحمن احمد المهدى بط',
      updated_at = NOW()
  WHERE id = v_customer_id
    AND company_id = v_company_id
    AND BTRIM(last_name_ar) = 'عبد الرحمن احمد المهدى';

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    severity, user_email, entity_name, changes_summary, status, metadata, notes
  ) VALUES (
    v_actor_user_id, v_company_id,
    'ROLLBACK_LTO2024124_LEGAL_REVIEW_REQUEST',
    'contract', v_contract_id, 'warning', 'khamis-1992@hotmail.com',
    'LTO2024124',
    'إلغاء طلب المراجعة القانونية وإعادة العقد إلى بياناته السابقة.',
    'success', jsonb_build_object('migration_key', v_migration_key),
    'لم تُحذف سجلات التدقيق التاريخية.'
  );
END;
$rollback$;
