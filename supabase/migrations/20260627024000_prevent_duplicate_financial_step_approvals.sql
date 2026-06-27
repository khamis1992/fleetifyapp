-- Segregation of duties: one actor cannot approve the same financial approval step more than once.
-- Keep this migration safe when executed manually after a partial database upgrade.

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_approval_actions_one_actor_per_step
  ON public.financial_approval_actions(request_id, step_order, actor_id)
  WHERE action = 'approved' AND actor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.act_on_financial_approval_step(
  p_request_id UUID,
  p_action TEXT,
  p_actor_role TEXT,
  p_actor_branch_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.financial_approval_requests%ROWTYPE;
  v_step public.financial_approval_policy_steps%ROWTYPE;
  v_approvals INTEGER;
  v_next_step INTEGER;
BEGIN
  SELECT * INTO v_request
  FROM public.financial_approval_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial approval request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending financial approval requests can be acted on';
  END IF;

  IF v_request.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'Requester cannot approve their own financial approval request';
  END IF;

  SELECT * INTO v_step
  FROM public.financial_approval_policy_steps
  WHERE policy_id = v_request.policy_id
    AND step_order = v_request.current_step_order
    AND (min_amount IS NULL OR v_request.amount >= min_amount)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial approval step not found';
  END IF;

  IF v_step.required_role <> p_actor_role THEN
    RAISE EXCEPTION 'Actor role is not allowed for this financial approval step';
  END IF;

  IF v_step.branch_scope = 'same_branch' AND p_actor_branch_id IS DISTINCT FROM v_request.branch_id THEN
    RAISE EXCEPTION 'Actor must approve from the same branch';
  END IF;

  IF v_step.branch_scope = 'head_office' AND p_actor_branch_id IS NOT NULL THEN
    RAISE EXCEPTION 'Head office approval is required';
  END IF;

  IF p_action = 'approved'
    AND EXISTS (
      SELECT 1
      FROM public.financial_approval_actions existing_action
      WHERE existing_action.request_id = p_request_id
        AND existing_action.step_order = v_request.current_step_order
        AND existing_action.action = 'approved'
        AND existing_action.actor_id = auth.uid()
    )
  THEN
    RAISE EXCEPTION 'Actor already approved this financial approval step';
  END IF;

  INSERT INTO public.financial_approval_actions (
    request_id,
    step_order,
    action,
    actor_id,
    actor_role,
    actor_branch_id,
    notes
  )
  VALUES (
    p_request_id,
    v_request.current_step_order,
    p_action,
    auth.uid(),
    p_actor_role,
    p_actor_branch_id,
    p_notes
  );

  IF p_action = 'rejected' THEN
    UPDATE public.financial_approval_requests
    SET status = 'rejected', completed_at = now(), updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('request_id', p_request_id, 'status', 'rejected');
  END IF;

  IF p_action = 'cancelled' THEN
    UPDATE public.financial_approval_requests
    SET status = 'cancelled', completed_at = now(), updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('request_id', p_request_id, 'status', 'cancelled');
  END IF;

  SELECT COUNT(*) INTO v_approvals
  FROM public.financial_approval_actions
  WHERE request_id = p_request_id
    AND step_order = v_request.current_step_order
    AND action = 'approved';

  IF v_approvals < v_step.required_approvals THEN
    RETURN jsonb_build_object('request_id', p_request_id, 'status', 'pending', 'current_step_order', v_request.current_step_order);
  END IF;

  SELECT MIN(step_order) INTO v_next_step
  FROM public.financial_approval_policy_steps
  WHERE policy_id = v_request.policy_id
    AND step_order > v_request.current_step_order
    AND (min_amount IS NULL OR v_request.amount >= min_amount);

  IF v_next_step IS NULL THEN
    UPDATE public.financial_approval_requests
    SET status = 'approved', completed_at = now(), updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('request_id', p_request_id, 'status', 'approved');
  END IF;

  UPDATE public.financial_approval_requests
  SET current_step_order = v_next_step, updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('request_id', p_request_id, 'status', 'pending', 'current_step_order', v_next_step);
END;
$$;
