-- Revert only the audited status correction made by migration 20260830171454.
DO $rollback$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID;
  v_contract_id CONSTANT UUID := 'cd8a5d6d-676c-47a1-8974-e7b28540c3d4'::UUID;
  v_vehicle_id CONSTANT UUID := '43cb61c2-9c1b-45c8-bf99-fbf28f329d4b'::UUID;
  v_actor_user_id CONSTANT UUID := '2a2b3a8a-35dd-4251-a8ba-09f70538c920'::UUID;
  v_migration_key CONSTANT TEXT := '20260830171454_cancel_lto2024104';
BEGIN
  PERFORM 1
  FROM public.contracts contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id
    AND contract.status = 'cancelled'
    AND contract.suspension_reason LIKE 'تصحيح إداري معتمد بتاريخ 2026-08-30:%'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refusing rollback because LTO2024104 no longer matches the migration result';
  END IF;

  UPDATE public.contracts
  SET status = 'expired',
      suspension_reason = NULL,
      updated_at = NOW()
  WHERE id = v_contract_id AND company_id = v_company_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND vehicle.status::TEXT = 'rented'
  ) THEN
    RAISE EXCEPTION 'Rollback unexpectedly changed the reconciled vehicle status';
  END IF;

  INSERT INTO public.audit_logs (
    user_id, company_id, action, resource_type, resource_id,
    severity, user_email, entity_name, changes_summary, status, metadata, notes
  ) VALUES (
    v_actor_user_id, v_company_id,
    'ROLLBACK_CONTRACT_STATUS_CORRECTION',
    'contract', v_contract_id, 'warning', 'khamis-1992@hotmail.com',
    'LTO2024104', 'إعادة حالة العقد من ملغى إلى منتهي.', 'success',
    jsonb_build_object('migration_key', v_migration_key),
    'تم التراجع عن تصحيح حالة العقد مع إبقاء سجل التدقيق التاريخي.'
  );
END;
$rollback$;
