-- Budget override approval guard: over-budget postings require an approved budget_override request.
-- This migration may be run manually, so keep the financial approval tables available
-- even if the earlier workflow migration has not been applied in this environment yet.

CREATE TABLE IF NOT EXISTS public.financial_approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'invoice_cancel',
    'payment_cancel',
    'journal_post',
    'period_reopen',
    'budget_override',
    'bank_reconcile',
    'report_approve'
  )),
  branch_id UUID,
  currency TEXT NOT NULL DEFAULT 'QAR',
  min_amount NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (min_amount >= 0),
  max_amount NUMERIC(14, 3) CHECK (max_amount IS NULL OR max_amount >= min_amount),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_approval_policy_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.financial_approval_policies(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  required_role TEXT NOT NULL,
  min_amount NUMERIC(14, 3) CHECK (min_amount IS NULL OR min_amount >= 0),
  branch_scope TEXT NOT NULL DEFAULT 'any_branch'
    CHECK (branch_scope IN ('same_branch', 'any_branch', 'head_office')),
  required_approvals INTEGER NOT NULL DEFAULT 1 CHECK (required_approvals > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_approval_policy_step_unique UNIQUE (policy_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.financial_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.financial_approval_policies(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  amount NUMERIC(14, 3) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'QAR',
  branch_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  current_step_order INTEGER NOT NULL DEFAULT 1,
  requested_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.financial_approval_requests(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'cancelled')),
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  actor_branch_id UUID,
  notes TEXT,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_approval_policies_company_action
  ON public.financial_approval_policies(company_id, action, branch_id, min_amount, max_amount)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_financial_approval_requests_company_status
  ON public.financial_approval_requests(company_id, status, requested_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_approval_requests_unique_pending
  ON public.financial_approval_requests(company_id, action, source_table, source_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_financial_approval_actions_request
  ON public.financial_approval_actions(request_id, step_order, acted_at DESC);

ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS budget_override_request_id UUID REFERENCES public.financial_approval_requests(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_budget_override_request
  ON public.journal_entry_lines(budget_override_request_id)
  WHERE budget_override_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assert_budget_override_request_approved(
  p_request_id UUID,
  p_company_id UUID,
  p_cost_center_id UUID,
  p_overage_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.financial_approval_requests%ROWTYPE;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Approved budget override is required for over-budget posting'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_request
  FROM public.financial_approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget override approval request was not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_request.company_id IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Budget override approval belongs to another company'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_request.action <> 'budget_override' THEN
    RAISE EXCEPTION 'Approval request is not a budget override'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_request.status <> 'approved' THEN
    RAISE EXCEPTION 'Budget override approval request is not approved'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_request.source_table <> 'cost_centers' OR v_request.source_id IS DISTINCT FROM p_cost_center_id THEN
    RAISE EXCEPTION 'Budget override approval is not linked to this cost center'
      USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(v_request.amount, 0) + 0.01 < COALESCE(p_overage_amount, 0) THEN
    RAISE EXCEPTION 'Budget override approval amount is lower than the overage amount'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_cost_center_budget_control()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_cost_center_id uuid;
  v_budget_amount numeric;
  v_actual_before numeric;
  v_line_effect numeric;
  v_projected_actual numeric;
  v_overage_amount numeric;
  v_entry_status text;
  v_entry_company_id uuid;
  v_account_type text;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_cost_center_id := COALESCE(NEW.cost_center_id, OLD.cost_center_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF v_cost_center_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status, company_id
  INTO v_entry_status, v_entry_company_id
  FROM public.journal_entries
  WHERE id = NEW.journal_entry_id;

  IF LOWER(COALESCE(v_entry_status, '')) <> 'posted' THEN
    RETURN NEW;
  END IF;

  SELECT account_type
  INTO v_account_type
  FROM public.chart_of_accounts
  WHERE id = NEW.account_id;

  IF LOWER(COALESCE(v_account_type, '')) NOT IN ('expense', 'expenses') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(budget_amount, 0), COALESCE(actual_amount, 0)
  INTO v_budget_amount, v_actual_before
  FROM public.cost_centers
  WHERE id = v_cost_center_id
    AND COALESCE(is_active, true) = true;

  IF COALESCE(v_budget_amount, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  v_line_effect := COALESCE(NEW.debit_amount, 0) - COALESCE(NEW.credit_amount, 0);
  v_projected_actual := v_actual_before + v_line_effect;

  IF v_projected_actual > v_budget_amount + 0.01 THEN
    v_overage_amount := v_projected_actual - v_budget_amount;

    PERFORM public.assert_budget_override_request_approved(
      NEW.budget_override_request_id,
      v_entry_company_id,
      v_cost_center_id,
      v_overage_amount
    );
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_budget_override_request_approved(UUID, UUID, UUID, NUMERIC) TO authenticated;
