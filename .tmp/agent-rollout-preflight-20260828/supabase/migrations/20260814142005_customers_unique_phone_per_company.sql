CREATE UNIQUE INDEX IF NOT EXISTS customers_company_phone_unique
ON public.customers (
  company_id,
  regexp_replace(phone, '[^0-9]', '', 'g')
)
WHERE phone IS NOT NULL AND btrim(phone) <> '';

COMMENT ON INDEX public.customers_company_phone_unique IS
  'Prevents duplicate customer mobile numbers within a company. Empty phones are allowed.';;
