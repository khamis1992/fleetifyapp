-- Durable, idempotent synchronization from current system-agent review findings
-- to user-facing tasks. The browser no longer owns reconciliation.

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_agent_review_task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  finding_id uuid NULL REFERENCES public.system_agent_findings(id) ON DELETE SET NULL,
  run_id uuid NULL REFERENCES public.system_agent_runs(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_agent_review_task_links_company_key_key UNIQUE (company_id, task_key),
  CONSTRAINT system_agent_review_task_links_task_id_key UNIQUE (task_id)
);

CREATE INDEX IF NOT EXISTS idx_system_agent_review_task_links_company_active
  ON public.system_agent_review_task_links(company_id, active, last_seen_at DESC);

ALTER TABLE public.system_agent_review_task_links
  ADD COLUMN IF NOT EXISTS missed_snapshots integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_missing_run_id uuid NULL;

ALTER TABLE public.system_agent_review_task_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.system_agent_review_task_links FROM anon, authenticated;
GRANT ALL ON TABLE public.system_agent_review_task_links TO service_role;

CREATE OR REPLACE FUNCTION public.sync_system_audit_review_tasks_v1(
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_latest_run_id uuid;
  v_owner_profile_id uuid;
  v_current integer := 0;
  v_created integer := 0;
  v_refreshed integer := 0;
  v_archived integer := 0;
  v_missing_advanced integer := 0;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  IF NOT pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtextextended('system-audit-review-task-sync:' || p_company_id::text, 0)
  ) THEN
    RETURN jsonb_build_object('ok', true, 'busy', true, 'companyId', p_company_id);
  END IF;

  SELECT run.id
  INTO v_latest_run_id
  FROM public.system_agent_runs run
  WHERE run.status = 'completed'
    AND run.requested_domains @> ARRAY[
      'contracts', 'accounting', 'fleet', 'customers', 'inventory', 'legal', 'employees'
    ]::text[]
    AND EXISTS (
      SELECT 1
      FROM public.system_agent_jobs job
      WHERE job.run_id = run.id
        AND job.company_id = p_company_id
    )
  ORDER BY COALESCE(run.finished_at, run.created_at) DESC, run.created_at DESC
  LIMIT 1;

  IF v_latest_run_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'companyId', p_company_id,
      'snapshotAvailable', false,
      'created', 0,
      'refreshed', 0,
      'archived', 0,
      'current', 0
    );
  END IF;

  -- Preserve the established owner when review tasks already exist.
  SELECT task.assigned_to
  INTO v_owner_profile_id
  FROM public.tasks task
  JOIN public.profiles profile
    ON profile.id = task.assigned_to
   AND profile.company_id = p_company_id
   AND profile.is_active = true
  WHERE task.company_id = p_company_id
    AND task.category = 'system_audit_review'
    AND task.metadata @> '{"source":"system_audit_agent"}'::jsonb
    AND task.status IN ('pending', 'in_progress', 'on_hold')
    AND task.assigned_to IS NOT NULL
  GROUP BY task.assigned_to
  ORDER BY count(*) DESC, task.assigned_to
  LIMIT 1;

  -- New companies fall back to an active company admin/manager.
  IF v_owner_profile_id IS NULL THEN
    SELECT profile.id
    INTO v_owner_profile_id
    FROM public.profiles profile
    JOIN public.user_roles role
      ON role.user_id = profile.user_id
     AND (role.company_id = p_company_id OR role.role = 'super_admin'::public.user_role)
    WHERE profile.company_id = p_company_id
      AND profile.is_active = true
      AND role.role IN (
        'company_admin'::public.user_role,
        'manager'::public.user_role,
        'super_admin'::public.user_role
      )
    ORDER BY
      CASE role.role
        WHEN 'company_admin'::public.user_role THEN 1
        WHEN 'manager'::public.user_role THEN 2
        ELSE 3
      END,
      profile.created_at,
      profile.id
    LIMIT 1;
  END IF;

  IF v_owner_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'companyId', p_company_id,
      'snapshotAvailable', true,
      'error', 'NO_ACTIVE_REVIEW_OWNER'
    );
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.system_agent_review_sync_snapshot (
    task_key text PRIMARY KEY,
    finding_id uuid NOT NULL,
    run_id uuid NOT NULL,
    domain text NOT NULL,
    code text NOT NULL,
    severity text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    target_month text NOT NULL,
    title text NOT NULL,
    details text NOT NULL,
    evidence jsonb NOT NULL,
    confidence numeric NOT NULL,
    repair_command text NULL,
    ai_decision jsonb NULL,
    updated_at timestamptz NOT NULL
  ) ON COMMIT DROP;

  TRUNCATE TABLE pg_temp.system_agent_review_sync_snapshot;

  INSERT INTO pg_temp.system_agent_review_sync_snapshot (
    task_key,
    finding_id,
    run_id,
    domain,
    code,
    severity,
    entity_type,
    entity_id,
    target_month,
    title,
    details,
    evidence,
    confidence,
    repair_command,
    ai_decision,
    updated_at
  )
  SELECT DISTINCT ON (source.task_key)
    source.task_key,
    source.finding_id,
    source.run_id,
    source.domain,
    source.code,
    source.severity,
    source.entity_type,
    source.entity_id,
    source.target_month,
    source.title,
    source.details,
    source.evidence,
    source.confidence,
    source.repair_command,
    source.ai_decision,
    source.updated_at
  FROM (
    SELECT
      concat(
        'finding:', finding.code, ':', finding.entity_type, ':', finding.entity_id, ':',
        COALESCE(finding.evidence->>'target_month', '')
      ) AS task_key,
      finding.id AS finding_id,
      finding.run_id,
      finding.domain,
      finding.code,
      finding.severity,
      finding.entity_type,
      finding.entity_id,
      COALESCE(finding.evidence->>'target_month', '') AS target_month,
      finding.title,
      finding.details,
      finding.evidence,
      finding.confidence,
      finding.repair_command,
      finding.ai_decision,
      finding.updated_at
    FROM public.system_agent_findings finding
    WHERE finding.company_id = p_company_id
      AND finding.status IN ('review', 'detected')
      AND (
        finding.run_id = v_latest_run_id
        OR finding.code = 'invoice.month_reconciliation_needs_review'
      )
  ) source
  ORDER BY source.task_key, source.updated_at DESC, source.finding_id DESC;

  GET DIAGNOSTICS v_current = ROW_COUNT;

  -- Adopt tasks created by the former browser-side implementation before
  -- creating anything new.
  INSERT INTO public.system_agent_review_task_links (
    company_id,
    task_key,
    task_id,
    active,
    last_seen_at
  )
  SELECT DISTINCT ON (task_key_source.task_key)
    p_company_id,
    task_key_source.task_key,
    task_key_source.task_id,
    true,
    now()
  FROM (
    SELECT
      task.id AS task_id,
      COALESCE(
        NULLIF(task.metadata->>'systemAuditTaskKey', ''),
        CASE
          WHEN task.metadata->>'code' IS NOT NULL
           AND task.metadata->>'entityType' IS NOT NULL
           AND task.metadata->>'entityId' IS NOT NULL
          THEN concat(
            'finding:', task.metadata->>'code', ':',
            task.metadata->>'entityType', ':',
            task.metadata->>'entityId', ':',
            COALESCE(
              task.metadata->>'targetMonth',
              task.metadata#>>'{evidence,target_month}',
              ''
            )
          )
        END
      ) AS task_key,
      task.created_at
    FROM public.tasks task
    WHERE task.company_id = p_company_id
      AND task.category = 'system_audit_review'
      AND task.metadata @> '{"source":"system_audit_agent"}'::jsonb
      AND task.status IN ('pending', 'in_progress', 'on_hold')
  ) task_key_source
  WHERE task_key_source.task_key IS NOT NULL
  ORDER BY task_key_source.task_key, task_key_source.created_at DESC, task_key_source.task_id
  ON CONFLICT (company_id, task_key) DO NOTHING;

  UPDATE public.system_agent_review_task_links link
  SET finding_id = snapshot.finding_id,
      run_id = snapshot.run_id,
      active = true,
      missed_snapshots = 0,
      last_missing_run_id = NULL,
      last_seen_at = now(),
      updated_at = now()
  FROM pg_temp.system_agent_review_sync_snapshot snapshot
  WHERE link.company_id = p_company_id
    AND link.task_key = snapshot.task_key;

  UPDATE public.tasks task
  SET title = left('قرار بشري مطلوب: ' || COALESCE(NULLIF(snapshot.title, ''), snapshot.code), 255),
      description = concat_ws(E'\n',
        'القسم: ' || snapshot.domain,
        'نوع الملاحظة: ' || snapshot.code,
        'الخطورة: ' || snapshot.severity,
        'السجل: ' || snapshot.entity_type || ' / ' || snapshot.entity_id,
        'ثقة الوكيل: ' || round(snapshot.confidence * 100)::text || '%',
        '',
        'تفاصيل الوكيل:',
        COALESCE(NULLIF(snapshot.details, ''), snapshot.title),
        '',
        'الإجراء المطلوب: راجع السجل واتخذ القرار المناسب، ثم أغلق المهمة أو أضف نتيجة المعالجة في التعليقات.'
      ),
      priority = CASE snapshot.severity
        WHEN 'critical' THEN 'urgent'
        WHEN 'high' THEN 'high'
        ELSE 'medium'
      END,
      metadata = jsonb_build_object(
        'systemAgentFindingId', snapshot.finding_id,
        'runId', snapshot.run_id,
        'domain', snapshot.domain,
        'code', snapshot.code,
        'severity', snapshot.severity,
        'entityType', snapshot.entity_type,
        'entityId', snapshot.entity_id,
        'targetMonth', snapshot.target_month,
        'evidence', snapshot.evidence,
        'repairCommand', snapshot.repair_command,
        'aiDecision', snapshot.ai_decision,
        'systemAuditTaskKey', snapshot.task_key,
        'source', 'system_audit_agent',
        'syncOwner', 'server',
        'syncedAt', now()
      )
  FROM public.system_agent_review_task_links link
  JOIN pg_temp.system_agent_review_sync_snapshot snapshot
    ON snapshot.task_key = link.task_key
  WHERE link.company_id = p_company_id
    AND task.id = link.task_id
    AND task.status IN ('pending', 'in_progress', 'on_hold')
    AND (
      task.metadata->>'systemAgentFindingId' IS DISTINCT FROM snapshot.finding_id::text
      OR task.metadata->>'runId' IS DISTINCT FROM snapshot.run_id::text
      OR task.metadata->>'systemAuditTaskKey' IS DISTINCT FROM snapshot.task_key
      OR task.metadata->>'syncOwner' IS DISTINCT FROM 'server'
    );

  GET DIAGNOSTICS v_refreshed = ROW_COUNT;

  WITH inserted_tasks AS (
    INSERT INTO public.tasks (
      company_id,
      created_by,
      assigned_to,
      title,
      description,
      status,
      priority,
      due_date,
      category,
      tags,
      metadata
    )
    SELECT
      p_company_id,
      v_owner_profile_id,
      v_owner_profile_id,
      left('قرار بشري مطلوب: ' || COALESCE(NULLIF(snapshot.title, ''), snapshot.code), 255),
      concat_ws(E'\n',
        'القسم: ' || snapshot.domain,
        'نوع الملاحظة: ' || snapshot.code,
        'الخطورة: ' || snapshot.severity,
        'السجل: ' || snapshot.entity_type || ' / ' || snapshot.entity_id,
        'ثقة الوكيل: ' || round(snapshot.confidence * 100)::text || '%',
        '',
        'تفاصيل الوكيل:',
        COALESCE(NULLIF(snapshot.details, ''), snapshot.title),
        '',
        'الإجراء المطلوب: راجع السجل واتخذ القرار المناسب، ثم أغلق المهمة أو أضف نتيجة المعالجة في التعليقات.'
      ),
      'pending',
      CASE snapshot.severity
        WHEN 'critical' THEN 'urgent'
        WHEN 'high' THEN 'high'
        ELSE 'medium'
      END,
      now() + interval '1 day',
      'system_audit_review',
      ARRAY['system-audit', 'agent-review', 'human-decision']::text[],
      jsonb_build_object(
        'systemAgentFindingId', snapshot.finding_id,
        'runId', snapshot.run_id,
        'domain', snapshot.domain,
        'code', snapshot.code,
        'severity', snapshot.severity,
        'entityType', snapshot.entity_type,
        'entityId', snapshot.entity_id,
        'targetMonth', snapshot.target_month,
        'evidence', snapshot.evidence,
        'repairCommand', snapshot.repair_command,
        'aiDecision', snapshot.ai_decision,
        'systemAuditTaskKey', snapshot.task_key,
        'source', 'system_audit_agent',
        'syncOwner', 'server',
        'syncedAt', now()
      )
    FROM pg_temp.system_agent_review_sync_snapshot snapshot
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.system_agent_review_task_links link
      JOIN public.tasks linked_task ON linked_task.id = link.task_id
      WHERE link.company_id = p_company_id
        AND link.task_key = snapshot.task_key
        AND link.active = true
        AND linked_task.status IN ('pending', 'in_progress', 'on_hold')
    )
    RETURNING id, metadata, title
  ),
  upserted_links AS (
    INSERT INTO public.system_agent_review_task_links (
      company_id,
      task_key,
      task_id,
      finding_id,
      run_id,
      active,
      last_seen_at,
      updated_at
    )
    SELECT
      p_company_id,
      inserted.metadata->>'systemAuditTaskKey',
      inserted.id,
      snapshot.finding_id,
      snapshot.run_id,
      true,
      now(),
      now()
    FROM inserted_tasks inserted
    JOIN pg_temp.system_agent_review_sync_snapshot snapshot
      ON snapshot.task_key = inserted.metadata->>'systemAuditTaskKey'
    ON CONFLICT (company_id, task_key) DO UPDATE
    SET task_id = EXCLUDED.task_id,
        finding_id = EXCLUDED.finding_id,
        run_id = EXCLUDED.run_id,
        active = true,
        missed_snapshots = 0,
        last_missing_run_id = NULL,
        last_seen_at = now(),
        updated_at = now()
    RETURNING task_id
  ),
  logged_creations AS (
    INSERT INTO public.task_activity_log (
      task_id,
      user_id,
      action,
      description,
      new_value
    )
    SELECT
      inserted.id,
      v_owner_profile_id,
      'created',
      'تم إنشاء المهمة تلقائياً من مزامنة وكيل تدقيق النظام على الخادم: ' || inserted.title,
      jsonb_build_object('source', 'system_audit_agent', 'syncOwner', 'server')
    FROM inserted_tasks inserted
    RETURNING task_id
  )
  SELECT count(*)::integer
  INTO v_created
  FROM inserted_tasks;

  -- A task is stale only after it is absent from two distinct completed full
  -- runs. Repeated 15-minute syncs of the same run never advance this guard.
  UPDATE public.system_agent_review_task_links link
  SET missed_snapshots = link.missed_snapshots + 1,
      last_missing_run_id = v_latest_run_id,
      updated_at = now()
  WHERE link.company_id = p_company_id
    AND link.active = true
    AND link.last_missing_run_id IS DISTINCT FROM v_latest_run_id
    AND NOT EXISTS (
      SELECT 1
      FROM pg_temp.system_agent_review_sync_snapshot snapshot
      WHERE snapshot.task_key = link.task_key
    );

  GET DIAGNOSTICS v_missing_advanced = ROW_COUNT;

  UPDATE public.tasks task
  SET status = 'cancelled'
  FROM public.system_agent_review_task_links link
  WHERE link.company_id = p_company_id
    AND link.active = true
    AND link.missed_snapshots >= 2
    AND task.id = link.task_id
    AND task.status IN ('pending', 'in_progress', 'on_hold')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_temp.system_agent_review_sync_snapshot snapshot
      WHERE snapshot.task_key = link.task_key
    );

  GET DIAGNOSTICS v_archived = ROW_COUNT;

  UPDATE public.system_agent_review_task_links link
  SET active = false,
      updated_at = now()
  WHERE link.company_id = p_company_id
    AND link.active = true
    AND link.missed_snapshots >= 2
    AND NOT EXISTS (
      SELECT 1
      FROM pg_temp.system_agent_review_sync_snapshot snapshot
      WHERE snapshot.task_key = link.task_key
    );

  RETURN jsonb_build_object(
    'ok', true,
    'busy', false,
    'companyId', p_company_id,
    'snapshotAvailable', true,
    'runId', v_latest_run_id,
    'ownerProfileId', v_owner_profile_id,
    'current', v_current,
    'created', v_created,
    'refreshed', v_refreshed,
    'missingAdvanced', v_missing_advanced,
    'archived', v_archived
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_all_system_audit_review_tasks_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_company record;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_company IN
    SELECT DISTINCT job.company_id
    FROM public.system_agent_jobs job
    JOIN public.system_agent_runs run ON run.id = job.run_id
    WHERE run.status = 'completed'
      AND run.requested_domains @> ARRAY[
        'contracts', 'accounting', 'fleet', 'customers', 'inventory', 'legal', 'employees'
      ]::text[]
  LOOP
    v_result := public.sync_system_audit_review_tasks_v1(v_company.company_id);
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'companies', jsonb_array_length(v_results), 'results', v_results);
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_system_audit_review_tasks_v1(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_all_system_audit_review_tasks_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_system_audit_review_tasks_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_all_system_audit_review_tasks_v1() TO service_role;

DO $schedule$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'system-audit-review-task-sync-v1';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'system-audit-review-task-sync-v1',
    '*/15 * * * *',
    'SELECT public.sync_all_system_audit_review_tasks_v1();'
  );
END;
$schedule$;

COMMIT;

;
