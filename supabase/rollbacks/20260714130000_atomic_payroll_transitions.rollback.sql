DROP TRIGGER IF EXISTS guard_payroll_financial_state_v1 ON public.payroll;
DROP FUNCTION IF EXISTS public.transition_payroll_status_v1(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.guard_payroll_financial_state_v1();

CREATE TRIGGER handle_payroll_changes_trigger
BEFORE INSERT OR UPDATE ON public.payroll
FOR EACH ROW EXECUTE FUNCTION public.handle_payroll_changes();

DELETE FROM public.default_account_types account_type
WHERE account_type.type_code IN (
  'PAYROLL_EXPENSE', 'PAYROLL_PAYABLE',
  'PAYROLL_DEDUCTION_PAYABLE', 'PAYROLL_TAX_PAYABLE'
)
AND NOT EXISTS (
  SELECT 1 FROM public.account_mappings mapping
  WHERE mapping.default_account_type_id = account_type.id
);
