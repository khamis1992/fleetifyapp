-- trigger to sync verification status across all tasks for the same contract
-- when one employee verifies, others are auto-verified

CREATE OR REPLACE FUNCTION public.sync_verification_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent infinite recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Update other pending tasks for the same contract
  UPDATE public.customer_verification_tasks
  SET 
    status = 'verified',
    verified_at = NEW.verified_at,
    verified_by = NEW.verified_by,
    verifier_name = NEW.verifier_name,
    notes = COALESCE(notes, '') || E'\n(تم التدقيق من قبل زميل: ' || NEW.verifier_name || ')'
  WHERE 
    contract_id = NEW.contract_id 
    AND id != NEW.id 
    AND status IN ('pending', 'in_progress');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_verification_task_completed ON public.customer_verification_tasks;

CREATE TRIGGER on_verification_task_completed
  AFTER UPDATE OF status ON public.customer_verification_tasks
  FOR EACH ROW
  WHEN (NEW.status = 'verified' AND OLD.status != 'verified')
  EXECUTE FUNCTION public.sync_verification_task_completion();
