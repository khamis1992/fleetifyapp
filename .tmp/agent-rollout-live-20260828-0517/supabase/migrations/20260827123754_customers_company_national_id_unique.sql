CREATE UNIQUE INDEX IF NOT EXISTS customers_company_national_id_unique ON customers (company_id, national_id) WHERE national_id IS NOT NULL AND btrim(national_id) <> '';;
