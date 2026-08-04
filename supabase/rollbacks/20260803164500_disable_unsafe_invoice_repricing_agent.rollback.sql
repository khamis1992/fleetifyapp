BEGIN;

UPDATE public.system_agent_command_registry
SET enabled = true,
    approval_required = false,
    description = 'Align a history-free invoice amount with its one linked payment schedule.',
    updated_at = now()
WHERE command = 'invoice.sync_zero_impact_amount';

UPDATE public.system_agent_findings finding
SET status = CASE
      WHEN finding.evidence ->> 'status_before_command_disable'
        IN ('detected', 'planned', 'repairing', 'failed')
      THEN finding.evidence ->> 'status_before_command_disable'
      ELSE 'review'
    END,
    repair_command = finding.evidence ->> 'disabled_repair_command',
    repair_payload = CASE
      WHEN jsonb_typeof(finding.evidence -> 'disabled_repair_payload') = 'null'
        THEN NULL
      ELSE finding.evidence -> 'disabled_repair_payload'
    END,
    evidence = finding.evidence
      - 'disabled_by_migration'
      - 'disabled_repair_command'
      - 'disabled_repair_payload'
      - 'status_before_command_disable',
    updated_at = now()
WHERE finding.evidence ->> 'disabled_by_migration' = '20260803164500'
  AND finding.status = 'review';

COMMIT;
