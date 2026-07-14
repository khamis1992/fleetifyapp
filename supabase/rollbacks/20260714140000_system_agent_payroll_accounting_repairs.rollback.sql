BEGIN;

DROP FUNCTION IF EXISTS public.system_agent_rollback_repair(uuid, text);
ALTER FUNCTION public.system_agent_rollback_repair_before_payroll_v1(uuid, text)
  RENAME TO system_agent_rollback_repair;

REVOKE ALL ON FUNCTION public.system_agent_reverse_payroll_repair_journal_v1(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.system_agent_reverse_payroll_repair_journal_v1(uuid, uuid);

REVOKE ALL ON FUNCTION public.system_agent_apply_payroll_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.system_agent_apply_payroll_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
);

REVOKE ALL ON FUNCTION public.system_agent_payroll_accounting_state_v1(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.system_agent_payroll_accounting_state_v1(uuid, uuid);

DELETE FROM public.system_agent_command_registry
WHERE command IN ('payroll.ensure_accrual', 'payroll.ensure_payment');

COMMIT;
