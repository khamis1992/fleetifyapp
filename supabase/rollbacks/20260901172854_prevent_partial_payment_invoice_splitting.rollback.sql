BEGIN;

GRANT EXECUTE ON FUNCTION public.create_invoice_from_payment(
  uuid,
  uuid,
  uuid,
  numeric,
  date,
  text
) TO PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.create_invoice_from_payment(
  uuid,
  uuid,
  uuid,
  numeric,
  date,
  text
) IS NULL;

COMMIT;
