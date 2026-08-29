-- An invoice INSERT trigger can create a posted journal by reference while the
-- AFTER trigger fails to persist invoices.journal_entry_id. Therefore a null
-- link never proves that an invoice has no accounting impact. Disable the
-- in-place repricing command; workers now emit review findings instead.

BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.system_agent_command_registry registry
    WHERE registry.command = 'invoice.sync_zero_impact_amount'
  ) THEN
    RAISE EXCEPTION 'invoice.sync_zero_impact_amount registry dependency is missing';
  END IF;
END;
$$;
UPDATE public.system_agent_command_registry
SET enabled = false,
    approval_required = true,
    description = 'Disabled: invoice source amounts require canonical cancel/reissue or adjustment; a null journal_entry_id is not proof of zero accounting impact.',
    updated_at = now()
WHERE command = 'invoice.sync_zero_impact_amount';
-- A finding that was queued before this migration must not remain stuck in a
-- planned/repairing state for a command that can no longer execute. Preserve
-- its original repair metadata in evidence so rollback remains possible, then
-- route it to an explicit financial review.
UPDATE public.system_agent_findings finding
SET status = 'review',
    evidence = COALESCE(finding.evidence, '{}'::jsonb) || jsonb_build_object(
      'disabled_by_migration', '20260803164500',
      'disabled_repair_command', finding.repair_command,
      'disabled_repair_payload', finding.repair_payload,
      'status_before_command_disable', finding.status
    ),
    repair_command = NULL,
    repair_payload = NULL,
    error = NULL,
    details = concat_ws(
      E'\n',
      NULLIF(BTRIM(COALESCE(finding.details, '')), ''),
      'Automatic invoice repricing was disabled; canonical cancel/reissue or a reviewed accounting adjustment is required.'
    ),
    updated_at = now()
WHERE finding.repair_command = 'invoice.sync_zero_impact_amount'
  AND finding.status IN ('detected', 'planned', 'repairing', 'failed');
COMMIT;
