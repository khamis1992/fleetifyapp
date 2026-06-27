-- Budget control: cost-center expenses cannot exceed approved limits without controlled bypass.
CREATE OR REPLACE FUNCTION public.recalculate_cost_center_actual_amount(p_cost_center_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_actual numeric;
BEGIN
  IF p_cost_center_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)), 0)
  INTO v_actual
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE jel.cost_center_id = p_cost_center_id
    AND LOWER(COALESCE(je.status, '')) = 'posted'
    AND LOWER(COALESCE(coa.account_type, '')) IN ('expense', 'expenses');

  UPDATE public.cost_centers
  SET actual_amount = GREATEST(v_actual, 0),
      updated_at = NOW()
  WHERE id = p_cost_center_id;
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
  v_entry_status text;
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

  SELECT status
  INTO v_entry_status
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

  IF v_actual_before + v_line_effect > v_budget_amount + 0.01 THEN
    RAISE EXCEPTION 'Cost center budget exceeded. Budget: %, projected actual: %.',
      ROUND(v_budget_amount::numeric, 2),
      ROUND((v_actual_before + v_line_effect)::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_cost_center_actual_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_cost_center_actual_amount(COALESCE(NEW.cost_center_id, OLD.cost_center_id));

  IF TG_OP = 'UPDATE' AND OLD.cost_center_id IS DISTINCT FROM NEW.cost_center_id THEN
    PERFORM public.recalculate_cost_center_actual_amount(OLD.cost_center_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_cost_center_budget_control_trigger ON public.journal_entry_lines;
CREATE TRIGGER enforce_cost_center_budget_control_trigger
BEFORE INSERT OR UPDATE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cost_center_budget_control();

DROP TRIGGER IF EXISTS sync_cost_center_actual_amount_trigger ON public.journal_entry_lines;
CREATE TRIGGER sync_cost_center_actual_amount_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_cost_center_actual_amount();
