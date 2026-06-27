-- Finance permission conflict rules for segregation of duties before role assignment.

CREATE TABLE IF NOT EXISTS public.finance_permission_conflict_rules (
  id TEXT PRIMARY KEY,
  primary_action TEXT NOT NULL,
  conflicting_action TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'critical')),
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT finance_permission_conflict_pair_unique UNIQUE (primary_action, conflicting_action)
);

INSERT INTO public.finance_permission_conflict_rules (id, primary_action, conflicting_action, severity, label)
VALUES
  ('payment_create_cancel_conflict', 'finance.payment.create', 'finance.payment.cancel', 'critical', 'Payment creator cannot also cancel payments without controlled approval'),
  ('invoice_create_cancel_conflict', 'finance.invoice.create', 'finance.invoice.cancel', 'critical', 'Invoice creator cannot also cancel invoices without controlled approval'),
  ('journal_create_approve_conflict', 'finance.journal.create_draft', 'finance.journal.approve', 'critical', 'Journal creator cannot also approve journal entries'),
  ('journal_create_post_conflict', 'finance.journal.create_draft', 'finance.journal.post', 'critical', 'Journal creator cannot also post journal entries'),
  ('bank_import_reconcile_conflict', 'finance.bank.import_statement', 'finance.bank.reconcile', 'high', 'Bank statement importer cannot also approve reconciliation'),
  ('budget_override_approve_conflict', 'finance.budget.override', 'finance.budget.approve', 'high', 'Budget override requester should be separated from budget approval'),
  ('period_close_reopen_conflict', 'finance.period.close', 'finance.period.reopen', 'critical', 'Period closer should be separated from controlled reopening approval')
ON CONFLICT (id)
DO UPDATE SET
  primary_action = EXCLUDED.primary_action,
  conflicting_action = EXCLUDED.conflicting_action,
  severity = EXCLUDED.severity,
  label = EXCLUDED.label,
  is_active = true,
  updated_at = now();

ALTER TABLE public.finance_permission_conflict_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_permission_conflict_rules_read ON public.finance_permission_conflict_rules;
CREATE POLICY finance_permission_conflict_rules_read
  ON public.finance_permission_conflict_rules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.evaluate_finance_permission_conflicts(p_permissions TEXT[])
RETURNS TABLE (
  rule_id TEXT,
  primary_action TEXT,
  conflicting_action TEXT,
  severity TEXT,
  label TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rule.id AS rule_id,
    rule.primary_action,
    rule.conflicting_action,
    rule.severity,
    rule.label
  FROM public.finance_permission_conflict_rules rule
  WHERE rule.is_active = true
    AND rule.primary_action = ANY(COALESCE(p_permissions, ARRAY[]::TEXT[]))
    AND rule.conflicting_action = ANY(COALESCE(p_permissions, ARRAY[]::TEXT[]))
  ORDER BY
    CASE rule.severity WHEN 'critical' THEN 0 ELSE 1 END,
    rule.id;
$$;

CREATE OR REPLACE FUNCTION public.assert_no_finance_permission_conflicts(p_permissions TEXT[])
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflicts TEXT;
BEGIN
  SELECT string_agg(rule_id, ', ')
  INTO v_conflicts
  FROM public.evaluate_finance_permission_conflicts(p_permissions);

  IF v_conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Finance permission bundle violates segregation of duties: %', v_conflicts
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_finance_permission_conflicts(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_no_finance_permission_conflicts(TEXT[]) TO authenticated;
