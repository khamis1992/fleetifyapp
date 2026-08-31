-- Correct the trailing OCR/data-entry fragment in one verified customer name.
DO $migration$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID;
  v_match_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_match_count
  FROM public.customers c
  WHERE c.company_id = v_company_id
    AND c.customer_code = 'IND-25-0167'
    AND BTRIM(c.first_name) = 'أمير'
    AND BTRIM(c.last_name) = 'عبد الرحمن احمد المهدى بط';

  IF v_match_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one matching customer IND-25-0167, found %', v_match_count;
  END IF;

  UPDATE public.customers c
  SET last_name = 'عبد الرحمن احمد المهدى',
      updated_at = NOW()
  WHERE c.company_id = v_company_id
    AND c.customer_code = 'IND-25-0167'
    AND BTRIM(c.first_name) = 'أمير'
    AND BTRIM(c.last_name) = 'عبد الرحمن احمد المهدى بط';
END;
$migration$;
