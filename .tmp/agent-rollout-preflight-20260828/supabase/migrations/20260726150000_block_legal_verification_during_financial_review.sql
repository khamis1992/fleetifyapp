-- Keep legal verification blocked while a manager is reviewing a financial issue.
CREATE OR REPLACE FUNCTION public.block_verification_with_open_financial_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'verified'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND EXISTS (
       SELECT 1
       FROM public.tasks task
       WHERE task.company_id = NEW.company_id
         AND task.category = 'contract_financial_review'
         AND task.status IN ('pending', 'in_progress', 'on_hold')
         AND task.metadata ->> 'verificationTaskId' = NEW.id::text
     )
  THEN
    RAISE EXCEPTION 'Financial review must be resolved before legal verification'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS block_verification_with_open_financial_review
  ON public.customer_verification_tasks;
CREATE TRIGGER block_verification_with_open_financial_review
  BEFORE UPDATE OF status ON public.customer_verification_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.block_verification_with_open_financial_review();
REVOKE ALL ON FUNCTION public.block_verification_with_open_financial_review()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.block_verification_with_open_financial_review()
  TO service_role;
COMMENT ON FUNCTION public.block_verification_with_open_financial_review() IS
  'Prevents legal verification while a contract financial review task is open.';
CREATE OR REPLACE FUNCTION public.resolve_contract_financial_review_v1(
  p_company_id uuid,
  p_task_id uuid,
  p_resolution text,
  p_notes text
)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor public.profiles%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_verification_task_id uuid;
  v_reported_by uuid;
  v_resolution_label text;
BEGIN
  IF p_resolution NOT IN (
    'corrected',
    'approved_as_is',
    'needs_more_information',
    'legal_transfer_rejected'
  ) THEN
    RAISE EXCEPTION 'Unsupported financial review resolution' USING ERRCODE = 'P0001';
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_notes, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Financial review notes are required' USING ERRCODE = 'P0001';
  END IF;

  SELECT profile.*
  INTO v_actor
  FROM public.profiles profile
  WHERE profile.user_id = auth.uid()
    AND profile.company_id = p_company_id
    AND COALESCE(profile.is_active, true)
  LIMIT 1;

  IF v_actor.id IS NULL THEN
    RAISE EXCEPTION 'Active company profile was not found' USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_actor.role, '') NOT IN ('admin', 'owner', 'super_admin', 'company_admin', 'manager')
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles role_row
       WHERE role_row.user_id = auth.uid()
         AND role_row.company_id = p_company_id
         AND role_row.role IN ('company_admin'::public.user_role, 'manager'::public.user_role)
     )
  THEN
    RAISE EXCEPTION 'Only a company manager can resolve financial reviews' USING ERRCODE = '42501';
  END IF;

  SELECT task.*
  INTO v_task
  FROM public.tasks task
  WHERE task.id = p_task_id
    AND task.company_id = p_company_id
    AND task.category = 'contract_financial_review'
    AND task.status IN ('pending', 'in_progress', 'on_hold')
    AND task.assigned_to = v_actor.id
  FOR UPDATE;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Open financial review assigned to this manager was not found'
      USING ERRCODE = 'P0001';
  END IF;

  v_verification_task_id := NULLIF(v_task.metadata ->> 'verificationTaskId', '')::uuid;
  v_reported_by := NULLIF(v_task.metadata ->> 'reportedBy', '')::uuid;
  v_resolution_label := CASE p_resolution
    WHEN 'corrected' THEN 'تم تصحيح المشكلة'
    WHEN 'approved_as_is' THEN 'تم اعتماد البيانات كما هي'
    WHEN 'needs_more_information' THEN 'إعادة للموظف لاستكمال المعلومات'
    WHEN 'legal_transfer_rejected' THEN 'رفض التحويل القانوني'
  END;

  IF p_resolution = 'legal_transfer_rejected' THEN
    UPDATE public.customer_verification_tasks
    SET status = 'rejected',
        rejection_reason = BTRIM(p_notes),
        updated_at = now()
    WHERE id = v_verification_task_id
      AND company_id = p_company_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Verification task linked to the financial review was not found'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.tasks
  SET status = CASE WHEN p_resolution = 'needs_more_information' THEN 'on_hold' ELSE 'completed' END,
      assigned_to = CASE
        WHEN p_resolution = 'needs_more_information' THEN v_reported_by
        ELSE v_actor.id
      END,
      completed_at = CASE WHEN p_resolution = 'needs_more_information' THEN NULL ELSE now() END,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'managerResolution', p_resolution,
        'managerResolutionLabel', v_resolution_label,
        'managerNotes', BTRIM(p_notes),
        'resolvedBy', v_actor.id,
        CASE WHEN p_resolution = 'needs_more_information' THEN 'returnedAt' ELSE 'resolvedAt' END,
        now()
      ),
      updated_at = now()
  WHERE id = v_task.id
  RETURNING * INTO v_task;

  INSERT INTO public.task_activity_log(
    task_id,
    user_id,
    action,
    description,
    new_value
  )
  VALUES (
    v_task.id,
    v_actor.id,
    CASE WHEN p_resolution = 'needs_more_information' THEN 'returned_for_information' ELSE 'completed' END,
    v_resolution_label || ': ' || BTRIM(p_notes),
    jsonb_build_object('resolution', p_resolution, 'notes', BTRIM(p_notes))
  );

  IF v_reported_by IS NOT NULL THEN
    INSERT INTO public.task_notifications(task_id, user_id, type, title, message)
    VALUES (
      v_task.id,
      v_reported_by,
      CASE WHEN p_resolution = 'needs_more_information' THEN 'assignment' ELSE 'status_change' END,
      CASE
        WHEN p_resolution = 'needs_more_information' THEN 'مطلوب استكمال معلومات مالية'
        ELSE 'تمت مراجعة المشكلة المالية'
      END,
      v_resolution_label || ' للعقد ' || COALESCE(v_task.metadata ->> 'contractNumber', '-')
    );
  END IF;

  RETURN v_task;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_contract_financial_review_v1(uuid, uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_contract_financial_review_v1(uuid, uuid, text, text)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.resolve_contract_financial_review_v1(uuid, uuid, text, text) IS
  'Atomically records a manager decision and, when rejected, blocks the linked legal verification.';
