-- Turn durable Taqadi needs_human states into assigned, traceable tasks.
-- Existing jobs are backfilled by the separate activation migration so the
-- first production write remains explicit and countable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.taqadi_human_review_task_links (
  job_id uuid PRIMARY KEY REFERENCES public.taqadi_filing_jobs(id) ON DELETE CASCADE,
  task_id uuid NOT NULL UNIQUE REFERENCES public.tasks(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.taqadi_human_review_task_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.taqadi_human_review_task_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.taqadi_human_review_task_links TO service_role;

CREATE OR REPLACE FUNCTION public.sync_taqadi_human_review_task_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_profile_id uuid;
  v_task_id uuid;
  v_title text;
  v_description text;
  v_priority text;
  v_review_details jsonb := '{}'::jsonb;
  v_safe_retry_candidate boolean := false;
BEGIN
  SELECT profile.id
  INTO v_profile_id
  FROM public.profiles profile
  WHERE profile.company_id = NEW.company_id
    AND profile.is_active = true
  ORDER BY
    CASE WHEN profile.user_id = NEW.requested_by THEN 0 ELSE 1 END,
    CASE WHEN profile.role IN ('company_admin', 'manager', 'admin') THEN 0 ELSE 1 END,
    profile.created_at,
    profile.id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT link.task_id
  INTO v_task_id
  FROM public.taqadi_human_review_task_links link
  WHERE link.job_id = NEW.id;

  IF NEW.status = 'needs_human' THEN
    IF NEW.error_code = 'REVIEW_MISMATCH' THEN
      SELECT COALESCE(event.details, '{}'::jsonb)
      INTO v_review_details
      FROM public.taqadi_filing_job_events event
      WHERE event.job_id = NEW.id
        AND event.company_id = NEW.company_id
        AND event.details ? 'claimAmountMatches'
      ORDER BY event.created_at DESC, event.id DESC
      LIMIT 1;

      v_review_details := COALESCE(v_review_details, '{}'::jsonb);
      v_safe_retry_candidate :=
        v_review_details ->> 'claimAmountMatches' = 'true'
        AND jsonb_typeof(v_review_details -> 'requiredActions') = 'array'
        AND jsonb_array_length(v_review_details -> 'requiredActions') = 0
        AND jsonb_typeof(v_review_details -> 'validationMessages') = 'array'
        AND jsonb_array_length(v_review_details -> 'validationMessages') = 0;
    END IF;

    v_title := CASE NEW.error_code
      WHEN 'FINAL_APPROVAL_REQUIRED' THEN 'اعتماد الإرسال النهائي في بوابة تقاضي'
      WHEN 'REVIEW_MISMATCH' THEN CASE
        WHEN v_safe_retry_candidate
          THEN 'إعادة محاولة دعوى تقاضي بعد تحديث التحقق'
        ELSE 'تصحيح بيانات أو ترتيب أطراف الدعوى في تقاضي'
      END
      ELSE 'تدخل بشري مطلوب لإكمال الإيداع في بوابة تقاضي'
    END;
    v_priority := CASE NEW.error_code
      WHEN 'FINAL_APPROVAL_REQUIRED' THEN 'urgent'
      WHEN 'REVIEW_MISMATCH' THEN 'high'
      ELSE 'high'
    END;
    v_description := concat_ws(E'\n',
      'أوقف وكيل تقاضي الإيداع الآلي لحماية صحة الدعوى ويحتاج قراراً بشرياً.',
      'الخطوة الحالية: ' || COALESCE(NEW.current_step, '-'),
      'رمز السبب: ' || COALESCE(NEW.error_code, '-'),
      NULLIF(NEW.error_message, ''),
      CASE
        WHEN NEW.error_code = 'REVIEW_MISMATCH' AND v_safe_retry_candidate THEN
          'المبلغ مطابق، ولا توجد رسالة تحقق من البوابة. الفشل السابق ناتج غالباً عن شرط قديم كان يطلب ظهور رقم العقد في شاشة المراجعة. افتح صفحة تجهيز الدعوى وحدّث الحزمة ثم استخدم إعادة المحاولة من البداية.'
        WHEN NEW.error_code = 'REVIEW_MISMATCH' THEN
          'توجد رسالة تحقق أو إجراء مطلوب من البوابة؛ راجع ترتيب مقدم الطلب والمدعي والمدعى عليه قبل إعادة المحاولة.'
        ELSE
          'بعد المراجعة، استأنف المهمة من صفحة تجهيز الدعوى.'
      END
    );

    IF v_task_id IS NULL THEN
      INSERT INTO public.tasks (
        company_id,
        title,
        description,
        status,
        priority,
        assigned_to,
        created_by,
        due_date,
        category,
        tags,
        metadata
      ) VALUES (
        NEW.company_id,
        v_title,
        v_description,
        'pending',
        v_priority,
        v_profile_id,
        v_profile_id,
        current_date + 1,
        'taqadi_human_review',
        ARRAY['taqadi', 'legal', 'human-review'],
        jsonb_build_object(
          'taqadiJobId', NEW.id,
          'legalCaseId', NEW.legal_case_id,
          'contractId', NEW.contract_id,
          'errorCode', NEW.error_code,
          'currentStep', NEW.current_step,
          'safeRetryCandidate', v_safe_retry_candidate,
          'claimAmountMatches', v_review_details -> 'claimAmountMatches',
          'requiredActions', COALESCE(v_review_details -> 'requiredActions', '[]'::jsonb),
          'source', 'taqadi_filing_jobs'
        )
      )
      RETURNING id INTO v_task_id;

      INSERT INTO public.taqadi_human_review_task_links (
        job_id, task_id, company_id
      ) VALUES (
        NEW.id, v_task_id, NEW.company_id
      );
    ELSE
      UPDATE public.tasks task
      SET title = v_title,
          description = v_description,
          status = CASE
            WHEN task.status IN ('completed', 'cancelled') THEN 'pending'
            ELSE task.status
          END,
          priority = v_priority,
          assigned_to = COALESCE(task.assigned_to, v_profile_id),
          completed_at = NULL,
          metadata = COALESCE(task.metadata, '{}'::jsonb) || jsonb_build_object(
            'errorCode', NEW.error_code,
            'currentStep', NEW.current_step,
            'safeRetryCandidate', v_safe_retry_candidate,
            'claimAmountMatches', v_review_details -> 'claimAmountMatches',
            'requiredActions', COALESCE(v_review_details -> 'requiredActions', '[]'::jsonb),
            'reopenedAt', now()
          ),
          updated_at = now()
      WHERE task.id = v_task_id;

      UPDATE public.taqadi_human_review_task_links
      SET updated_at = now()
      WHERE job_id = NEW.id;
    END IF;
  ELSIF v_task_id IS NOT NULL AND TG_OP = 'UPDATE' THEN
    IF OLD.status = 'needs_human' THEN
      UPDATE public.tasks task
      SET status = CASE WHEN NEW.status = 'cancelled' THEN 'cancelled' ELSE 'completed' END,
          completed_at = now(),
          metadata = COALESCE(task.metadata, '{}'::jsonb) || jsonb_build_object(
            'taqadiResolutionStatus', NEW.status,
            'taqadiResolvedAt', now()
          ),
          updated_at = now()
      WHERE task.id = v_task_id
        AND task.status IN ('pending', 'in_progress', 'on_hold');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_taqadi_human_review_task_v1
ON public.taqadi_filing_jobs;

CREATE TRIGGER trg_sync_taqadi_human_review_task_v1
AFTER INSERT OR UPDATE OF status, current_step, error_code, error_message
ON public.taqadi_filing_jobs
FOR EACH ROW
EXECUTE FUNCTION public.sync_taqadi_human_review_task_v1();

REVOKE ALL ON FUNCTION public.sync_taqadi_human_review_task_v1()
FROM PUBLIC, anon, authenticated;

-- update_taqadi_filing_job_v1 writes the job row before it appends the event
-- that carries the portal diagnostics. The job trigger above creates the task;
-- this event trigger immediately enriches it with the just-written details so
-- first-time mismatches are classified correctly, not only historical backfill.
CREATE OR REPLACE FUNCTION public.enrich_taqadi_human_review_task_from_event_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_task_id uuid;
  v_job public.taqadi_filing_jobs%ROWTYPE;
  v_safe_retry_candidate boolean := false;
  v_title text;
  v_description text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'needs_human'
     OR NEW.details ->> 'claimAmountMatches' IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT job.*
  INTO v_job
  FROM public.taqadi_filing_jobs job
  WHERE job.id = NEW.job_id
    AND job.company_id = NEW.company_id
    AND job.status = 'needs_human'
    AND job.error_code = 'REVIEW_MISMATCH';

  IF v_job.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT link.task_id
  INTO v_task_id
  FROM public.taqadi_human_review_task_links link
  WHERE link.job_id = NEW.job_id
    AND link.company_id = NEW.company_id;

  IF v_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_safe_retry_candidate :=
    NEW.details ->> 'claimAmountMatches' = 'true'
    AND jsonb_typeof(NEW.details -> 'requiredActions') = 'array'
    AND jsonb_array_length(NEW.details -> 'requiredActions') = 0
    AND jsonb_typeof(NEW.details -> 'validationMessages') = 'array'
    AND jsonb_array_length(NEW.details -> 'validationMessages') = 0;

  v_title := CASE
    WHEN v_safe_retry_candidate
      THEN 'إعادة محاولة دعوى تقاضي بعد تحديث التحقق'
    ELSE 'تصحيح بيانات أو ترتيب أطراف الدعوى في تقاضي'
  END;
  v_description := concat_ws(E'\n',
    'أوقف وكيل تقاضي الإيداع الآلي لحماية صحة الدعوى ويحتاج قراراً بشرياً.',
    'الخطوة الحالية: ' || COALESCE(v_job.current_step, '-'),
    'رمز السبب: ' || COALESCE(v_job.error_code, '-'),
    NULLIF(v_job.error_message, ''),
    CASE
      WHEN v_safe_retry_candidate THEN
        'المبلغ مطابق، ولا توجد رسالة تحقق من البوابة. الفشل السابق ناتج غالباً عن شرط قديم كان يطلب ظهور رقم العقد في شاشة المراجعة. افتح صفحة تجهيز الدعوى وحدّث الحزمة ثم استخدم إعادة المحاولة من البداية.'
      ELSE
        'توجد رسالة تحقق أو إجراء مطلوب من البوابة؛ راجع ترتيب مقدم الطلب والمدعي والمدعى عليه قبل إعادة المحاولة.'
    END
  );

  UPDATE public.tasks task
  SET title = v_title,
      description = v_description,
      metadata = COALESCE(task.metadata, '{}'::jsonb) || jsonb_build_object(
        'safeRetryCandidate', v_safe_retry_candidate,
        'claimAmountMatches', NEW.details -> 'claimAmountMatches',
        'requiredActions', COALESCE(NEW.details -> 'requiredActions', '[]'::jsonb),
        'reviewDiagnosticEventId', NEW.id,
        'reviewDiagnosticAt', NEW.created_at
      ),
      updated_at = now()
  WHERE task.id = v_task_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enrich_taqadi_human_review_task_from_event_v1
ON public.taqadi_filing_job_events;

CREATE TRIGGER trg_enrich_taqadi_human_review_task_from_event_v1
AFTER INSERT ON public.taqadi_filing_job_events
FOR EACH ROW
EXECUTE FUNCTION public.enrich_taqadi_human_review_task_from_event_v1();

REVOKE ALL ON FUNCTION public.enrich_taqadi_human_review_task_from_event_v1()
FROM PUBLIC, anon, authenticated;

COMMIT;

;
