-- Deduplicated operational alerts for failed/stalled agent work and traffic
-- mail synchronization. Scheduling is kept in a separate activation migration.

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_operational_alert_task_links (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_key text NOT NULL,
  task_id uuid NOT NULL UNIQUE REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, alert_key)
);

ALTER TABLE public.agent_operational_alert_task_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_operational_alert_task_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.agent_operational_alert_task_links TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_agent_operational_alert_task_v1(
  p_company_id uuid,
  p_alert_key text,
  p_title text,
  p_description text,
  p_priority text,
  p_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_profile_id uuid;
  v_task_id uuid;
BEGIN
  SELECT profile.id
  INTO v_profile_id
  FROM public.profiles profile
  LEFT JOIN public.system_agent_controls control
    ON control.company_id = p_company_id
    AND control.owner_profile_id IS NOT NULL
  WHERE profile.company_id = p_company_id
    AND profile.is_active = true
  ORDER BY
    CASE WHEN profile.id = control.owner_profile_id THEN 0 ELSE 1 END,
    CASE WHEN profile.role IN ('company_admin', 'manager', 'admin') THEN 0 ELSE 1 END,
    profile.created_at,
    profile.id
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RETURN;
  END IF;

  SELECT link.task_id
  INTO v_task_id
  FROM public.agent_operational_alert_task_links link
  WHERE link.company_id = p_company_id
    AND link.alert_key = p_alert_key;

  IF p_active AND v_task_id IS NULL THEN
    INSERT INTO public.tasks (
      company_id, title, description, status, priority,
      assigned_to, created_by, due_date, category, tags, metadata
    ) VALUES (
      p_company_id, p_title, p_description, 'pending', p_priority,
      v_profile_id, v_profile_id, current_date + 1,
      'agent_operational_alert',
      ARRAY['system-agent', 'operations', 'alert'],
      jsonb_build_object('alertKey', p_alert_key, 'source', 'agent_operational_monitor')
    ) RETURNING id INTO v_task_id;

    INSERT INTO public.agent_operational_alert_task_links (
      company_id, alert_key, task_id
    ) VALUES (
      p_company_id, p_alert_key, v_task_id
    );
  ELSIF p_active AND v_task_id IS NOT NULL THEN
    UPDATE public.tasks task
    SET title = p_title,
        description = p_description,
        priority = p_priority,
        status = CASE WHEN task.status IN ('completed', 'cancelled') THEN 'pending' ELSE task.status END,
        completed_at = CASE WHEN task.status IN ('completed', 'cancelled') THEN NULL ELSE task.completed_at END,
        updated_at = now()
    WHERE task.id = v_task_id;
  ELSIF NOT p_active AND v_task_id IS NOT NULL THEN
    UPDATE public.tasks task
    SET status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE task.id = v_task_id
      AND task.status IN ('pending', 'in_progress', 'on_hold');
  END IF;

  UPDATE public.agent_operational_alert_task_links
  SET updated_at = now()
  WHERE company_id = p_company_id
    AND alert_key = p_alert_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_agent_operational_alerts_v1(
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_failed_jobs integer := 0;
  v_stalled_jobs integer := 0;
  v_traffic_problem boolean := false;
  v_traffic_description text;
BEGIN
  SELECT count(*)
  INTO v_failed_jobs
  FROM public.system_agent_jobs job
  WHERE job.company_id = p_company_id
    AND job.status = 'failed'
    AND job.updated_at >= now() - interval '24 hours';

  SELECT count(*)
  INTO v_stalled_jobs
  FROM public.system_agent_jobs job
  WHERE job.company_id = p_company_id
    AND job.status IN ('queued', 'running', 'retry')
    AND job.updated_at < now() - interval '15 minutes';

  SELECT
    state.last_sync_status = 'error'
      OR (
        state.watermark_received_at IS NOT NULL
        AND COALESCE(state.last_sync_at, state.last_sync_started_at) < now() - interval '45 minutes'
      ),
    concat_ws(' · ',
      'الحالة: ' || state.last_sync_status,
      CASE WHEN state.last_error IS NOT NULL THEN 'الخطأ: ' || left(state.last_error, 500) END,
      CASE WHEN state.last_sync_at IS NOT NULL THEN 'آخر مزامنة: ' || state.last_sync_at::text END
    )
  INTO v_traffic_problem, v_traffic_description
  FROM public.traffic_mail_ingest_state state
  WHERE state.company_id = p_company_id;

  PERFORM public.upsert_agent_operational_alert_task_v1(
    p_company_id,
    'system-agent:failed-jobs',
    'فشل مهام في وكيل تدقيق النظام',
    format('يوجد %s مهمة فشلت خلال آخر 24 ساعة. راجع سجل التشغيل والأخطاء قبل إعادة التشغيل.', v_failed_jobs),
    'urgent',
    v_failed_jobs > 0
  );

  PERFORM public.upsert_agent_operational_alert_task_v1(
    p_company_id,
    'system-agent:stalled-jobs',
    'مهام وكيل التدقيق متوقفة عن التقدم',
    format('يوجد %s مهمة نشطة لم تُحدّث منذ أكثر من 15 دقيقة.', v_stalled_jobs),
    'high',
    v_stalled_jobs > 0
  );

  PERFORM public.upsert_agent_operational_alert_task_v1(
    p_company_id,
    'traffic-mail:sync-health',
    'تعطل مزامنة بريد مخالفات وزارة الداخلية',
    COALESCE(v_traffic_description, 'لم تبدأ مزامنة البريد بعد.'),
    'high',
    COALESCE(v_traffic_problem, false)
  );

  RETURN jsonb_build_object(
    'companyId', p_company_id,
    'failedJobs', v_failed_jobs,
    'stalledJobs', v_stalled_jobs,
    'trafficMailProblem', COALESCE(v_traffic_problem, false)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.upsert_agent_operational_alert_task_v1(uuid,text,text,text,text,boolean)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_agent_operational_alerts_v1(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_agent_operational_alerts_v1(uuid)
TO service_role;

COMMIT;

;
