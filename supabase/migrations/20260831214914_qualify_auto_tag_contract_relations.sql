-- The atomic contract RPC intentionally executes with an empty search_path.
-- Keep this trigger compatible with that security boundary by schema-qualifying
-- every application relation it touches.
CREATE OR REPLACE FUNCTION public.auto_tag_contract()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_company_id uuid;
  v_zero_amount_tag_id uuid;
BEGIN
  v_company_id := NEW.company_id;

  SELECT tag.id
  INTO v_zero_amount_tag_id
  FROM public.contract_tags AS tag
  WHERE tag.name = 'zero_amount'
    AND tag.company_id = v_company_id;

  IF v_zero_amount_tag_id IS NULL THEN
    INSERT INTO public.contract_tags (name, name_ar, color, icon, company_id)
    VALUES ('zero_amount', 'قيمة صفرية', 'orange', 'alert-triangle', v_company_id)
    RETURNING id INTO v_zero_amount_tag_id;
  END IF;

  IF (NEW.contract_amount = 0 OR NEW.contract_amount IS NULL)
     AND (NEW.monthly_amount = 0 OR NEW.monthly_amount IS NULL)
  THEN
    INSERT INTO public.contract_tag_assignments (contract_id, tag_id)
    VALUES (NEW.id, v_zero_amount_tag_id)
    ON CONFLICT DO NOTHING;

    IF NEW.sub_status IS NULL THEN
      NEW.sub_status := 'zero_amount';
    END IF;
  ELSE
    DELETE FROM public.contract_tag_assignments AS assignment
    WHERE assignment.contract_id = NEW.id
      AND assignment.tag_id = v_zero_amount_tag_id;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.auto_tag_contract() IS
  'Automatically tags zero-amount contracts; safe under empty-search-path atomic contract creation.';
