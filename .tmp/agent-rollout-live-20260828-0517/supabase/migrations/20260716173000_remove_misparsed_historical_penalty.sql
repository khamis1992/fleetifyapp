BEGIN;
DO $$
DECLARE
  v_penalty public.penalties%ROWTYPE;
BEGIN
  SELECT *
  INTO v_penalty
  FROM public.penalties
  WHERE id = '19bc22c7-ae24-4332-9acf-54dddcb060aa'::uuid
  FOR UPDATE;

  IF v_penalty.id IS NULL THEN
    RETURN;
  END IF;

  IF v_penalty.company_id <> '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid
     OR v_penalty.penalty_number <> 'HIST-a39f2060-2-2025-01'
     OR v_penalty.amount <> 72002024
     OR v_penalty.reason <> 'استيراد تاريخي من ملف Excel'
  THEN
    RAISE EXCEPTION 'Historical penalty changed after verification; refusing automatic removal';
  END IF;

  DELETE FROM public.penalties
  WHERE id = v_penalty.id;
END;
$$;
ALTER TABLE public.penalties
  DROP CONSTRAINT IF EXISTS penalties_safe_historical_import_amount;
ALTER TABLE public.penalties
  ADD CONSTRAINT penalties_safe_historical_import_amount
  CHECK (
    NOT (
      penalty_number LIKE 'HIST-%'
      AND reason = 'استيراد تاريخي من ملف Excel'
      AND amount > 100000
    )
  );
COMMENT ON CONSTRAINT penalties_safe_historical_import_amount
  ON public.penalties IS
  'Prevents historical Excel references or dates from being stored as implausibly large traffic violation amounts.';
COMMIT;
