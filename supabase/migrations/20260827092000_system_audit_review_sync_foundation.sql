-- Read-only foundation for server-side review-task synchronization.
-- This migration creates the durable mapping table and a preview RPC only. It
-- does not create/update/cancel tasks and does not schedule recurring writes.

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

ALTER TABLE public.system_agent_review_task_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.system_agent_review_task_links FROM anon, authenticated;
GRANT ALL ON TABLE public.system_agent_review_task_links TO service_role;

CREATE OR REPLACE FUNCTION public.preview_system_audit_review_task_sync_v1(
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH latest_run AS (
    SELECT run.id
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
    LIMIT 1
  ),
  current_findings AS (
    SELECT DISTINCT ON (source.task_key)
      source.task_key
    FROM (
      SELECT
        concat(
          'finding:', finding.code, ':', finding.entity_type, ':', finding.entity_id, ':',
          COALESCE(finding.evidence->>'target_month', '')
        ) AS task_key,
        finding.updated_at,
        finding.id
      FROM public.system_agent_findings finding
      CROSS JOIN latest_run
      WHERE finding.company_id = p_company_id
        AND finding.status IN ('review', 'detected')
        AND (
          finding.run_id = latest_run.id
          OR finding.code = 'invoice.month_reconciliation_needs_review'
        )
    ) source
    ORDER BY source.task_key, source.updated_at DESC, source.id DESC
  ),
  existing_tasks AS (
    SELECT DISTINCT
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
      ) AS task_key
    FROM public.tasks task
    WHERE task.company_id = p_company_id
      AND task.category = 'system_audit_review'
      AND task.metadata @> '{"source":"system_audit_agent"}'::jsonb
      AND task.status IN ('pending', 'in_progress', 'on_hold')
  )
  SELECT jsonb_build_object(
    'ok', true,
    'companyId', p_company_id,
    'snapshotAvailable', EXISTS (SELECT 1 FROM latest_run),
    'currentFindings', (SELECT count(*) FROM current_findings),
    'existingOpenTasks', (SELECT count(*) FROM existing_tasks WHERE task_key IS NOT NULL),
    'tasksToCreate', (
      SELECT count(*)
      FROM current_findings current_finding
      WHERE NOT EXISTS (
        SELECT 1 FROM existing_tasks existing_task
        WHERE existing_task.task_key = current_finding.task_key
      )
    ),
    'tasksToArchive', (
      SELECT count(*)
      FROM existing_tasks existing_task
      WHERE existing_task.task_key IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM current_findings current_finding
          WHERE current_finding.task_key = existing_task.task_key
        )
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.preview_system_audit_review_task_sync_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_system_audit_review_task_sync_v1(uuid)
  TO service_role;

COMMIT;

