-- Consolidation approval controls: reviewed eliminations, multi-company evidence, immutable approvals.

ALTER TABLE public.financial_consolidation_eliminations
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

CREATE OR REPLACE FUNCTION public.review_financial_consolidation_elimination(
  p_elimination_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_elimination public.financial_consolidation_eliminations%ROWTYPE;
  v_run public.financial_consolidation_runs%ROWTYPE;
BEGIN
  SELECT * INTO v_elimination
  FROM public.financial_consolidation_eliminations
  WHERE id = p_elimination_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial consolidation elimination was not found'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_run
  FROM public.financial_consolidation_runs
  WHERE id = v_elimination.run_id;

  IF v_run.parent_company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot review another company consolidation elimination'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_run.status IN ('approved', 'locked') THEN
    RAISE EXCEPTION 'Approved or locked consolidation eliminations cannot be reviewed again'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_elimination.created_by IS NOT NULL AND v_elimination.created_by = auth.uid() THEN
    RAISE EXCEPTION 'Elimination creator cannot review their own elimination'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.financial_consolidation_eliminations
  SET reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes
  WHERE id = p_elimination_id;

  RETURN jsonb_build_object('elimination_id', p_elimination_id, 'review_status', 'reviewed');
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_financial_consolidation_run(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.financial_consolidation_runs%ROWTYPE;
  v_unreviewed_eliminations INTEGER := 0;
BEGIN
  SELECT * INTO v_run
  FROM public.financial_consolidation_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial consolidation run not found';
  END IF;

  IF v_run.parent_company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot approve another company consolidation run';
  END IF;

  IF v_run.status <> 'calculated' THEN
    RAISE EXCEPTION 'Only calculated consolidation runs can be approved';
  END IF;

  IF v_run.company_count < 2 THEN
    RAISE EXCEPTION 'Consolidation approval requires at least two companies';
  END IF;

  IF ABS(v_run.imbalance) > 0.01 THEN
    RAISE EXCEPTION 'Unbalanced consolidation run cannot be approved';
  END IF;

  IF v_run.created_by = auth.uid() THEN
    RAISE EXCEPTION 'Creator cannot approve their own consolidation run';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_unreviewed_eliminations
  FROM public.financial_consolidation_eliminations
  WHERE run_id = p_run_id
    AND reviewed_at IS NULL;

  IF v_unreviewed_eliminations > 0 THEN
    RAISE EXCEPTION 'All consolidation eliminations must be independently reviewed before approval';
  END IF;

  UPDATE public.financial_consolidation_runs
  SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id = p_run_id;

  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'status', 'approved',
    'reviewed_eliminations', v_run.elimination_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_approved_financial_consolidation_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_status TEXT;
  v_run_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'financial_consolidation_runs' THEN
    IF TG_OP = 'DELETE' THEN
      IF OLD.status IN ('approved', 'locked') THEN
        RAISE EXCEPTION 'Approved or locked consolidation runs cannot be deleted';
      END IF;
      RETURN OLD;
    END IF;

    IF OLD.status IN ('approved', 'locked') AND NEW.status IS DISTINCT FROM 'locked' THEN
      RAISE EXCEPTION 'Approved or locked consolidation runs are immutable';
    END IF;

    RETURN NEW;
  END IF;

  v_run_id := CASE
    WHEN TG_OP = 'INSERT' THEN NEW.run_id
    ELSE OLD.run_id
  END;

  SELECT status INTO v_run_status
  FROM public.financial_consolidation_runs
  WHERE id = v_run_id;

  IF v_run_status IN ('approved', 'locked') THEN
    RAISE EXCEPTION 'Approved or locked consolidation detail rows are immutable';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_approved_financial_consolidation_run_update_trigger ON public.financial_consolidation_runs;
CREATE TRIGGER prevent_approved_financial_consolidation_run_update_trigger
BEFORE UPDATE OR DELETE ON public.financial_consolidation_runs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_financial_consolidation_mutation();

DROP TRIGGER IF EXISTS prevent_approved_financial_consolidation_lines_mutation_trigger ON public.financial_consolidation_lines;
CREATE TRIGGER prevent_approved_financial_consolidation_lines_mutation_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.financial_consolidation_lines
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_financial_consolidation_mutation();

DROP TRIGGER IF EXISTS prevent_approved_financial_consolidation_eliminations_mutation_trigger ON public.financial_consolidation_eliminations;
CREATE TRIGGER prevent_approved_financial_consolidation_eliminations_mutation_trigger
BEFORE INSERT OR UPDATE OR DELETE ON public.financial_consolidation_eliminations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_financial_consolidation_mutation();

GRANT EXECUTE ON FUNCTION public.review_financial_consolidation_elimination(UUID, TEXT) TO authenticated;
