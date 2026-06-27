-- Controlled reopening for closed accounting periods.
CREATE TABLE IF NOT EXISTS public.financial_period_reopening_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  accounting_period_id uuid NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  reason text NOT NULL,
  requested_by uuid NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  expires_at timestamptz NULL,
  closed_again_at timestamptz NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_period_reopening_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_financial_period_reopening_company
  ON public.financial_period_reopening_requests(company_id, accounting_period_id, status);

CREATE OR REPLACE FUNCTION public.request_financial_period_reopening(
  p_company_id uuid,
  p_accounting_period_id uuid,
  p_reason text,
  p_requested_by uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A clear reopening reason is required.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.accounting_periods
    WHERE id = p_accounting_period_id
      AND company_id = p_company_id
      AND LOWER(status) IN ('closed', 'locked')
  ) THEN
    RAISE EXCEPTION 'Only closed or locked periods can be reopened.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.financial_period_reopening_requests (
    company_id,
    accounting_period_id,
    reason,
    requested_by
  )
  VALUES (
    p_company_id,
    p_accounting_period_id,
    trim(p_reason),
    p_requested_by
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_financial_period_reopening(
  p_request_id uuid,
  p_approved_by uuid DEFAULT auth.uid(),
  p_hours integer DEFAULT 24
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
BEGIN
  IF p_hours IS NULL OR p_hours < 1 OR p_hours > 72 THEN
    RAISE EXCEPTION 'Reopening window must be between 1 and 72 hours.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_request
  FROM public.financial_period_reopening_requests
  WHERE id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending reopening request was not found.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_request.requested_by IS NOT NULL AND v_request.requested_by = p_approved_by THEN
    RAISE EXCEPTION 'Requester cannot approve their own period reopening request.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.financial_period_reopening_requests
  SET status = 'approved',
      approved_by = p_approved_by,
      approved_at = now(),
      expires_at = now() + make_interval(hours => p_hours),
      updated_at = now()
  WHERE id = p_request_id;

  UPDATE public.accounting_periods
  SET status = 'reopened',
      updated_at = now()
  WHERE id = v_request.accounting_period_id
    AND company_id = v_request.company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_reopened_financial_period(
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
BEGIN
  SELECT *
  INTO v_request
  FROM public.financial_period_reopening_requests
  WHERE id = p_request_id
    AND status = 'approved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approved reopening request was not found.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.accounting_periods
  SET status = 'closed',
      updated_at = now()
  WHERE id = v_request.accounting_period_id
    AND company_id = v_request.company_id;

  UPDATE public.financial_period_reopening_requests
  SET status = 'closed',
      closed_again_at = now(),
      updated_at = now()
  WHERE id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_financial_period_reopenings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.financial_period_reopening_requests
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'approved'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    RETURNING accounting_period_id, company_id
  )
  UPDATE public.accounting_periods ap
  SET status = 'closed',
      updated_at = now()
  FROM expired e
  WHERE ap.id = e.accounting_period_id
    AND ap.company_id = e.company_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
