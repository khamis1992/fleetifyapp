BEGIN;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname = 'automatic-formal-notice-agent';

UPDATE public.agent_invocation_registry
SET enabled = false,
    updated_at = now()
WHERE agent_id = 'legal-notice-agent';

DROP FUNCTION IF EXISTS public.finalize_automatic_formal_notice_delivery_v1(
  uuid, text, timestamptz, uuid, jsonb
);
DROP FUNCTION IF EXISTS public.finalize_automatic_formal_notice_dispatch_v1(
  uuid, text, jsonb
);
DROP FUNCTION IF EXISTS public.verify_ultramsg_webhook_secret_v1(text);
DROP FUNCTION IF EXISTS public.get_legal_notice_webhook_configuration_v1();
DROP FUNCTION IF EXISTS public.get_automatic_formal_notice_live_invoices_v1(
  uuid, uuid, uuid, uuid[]
);

DROP TRIGGER IF EXISTS trg_touch_legal_notice_agent_job
ON public.legal_notice_agent_jobs;
DROP FUNCTION IF EXISTS public.touch_legal_notice_agent_job_v1();

-- Formal notices and proof documents already produced are retained. Dropping
-- the workflow ledger does not erase evidence already linked to a legal file.
DROP TABLE IF EXISTS public.legal_notice_agent_jobs;

COMMIT;
