-- Bank statement duplicate guards: prevent repeated statement files and repeated lines.

ALTER TABLE public.bank_statement_lines
  ADD COLUMN IF NOT EXISTS line_hash TEXT;

UPDATE public.bank_statement_lines
SET line_hash = md5(concat_ws(
  '|',
  statement_date::text,
  COALESCE(value_date::text, ''),
  lower(regexp_replace(COALESCE(description, ''), '\s+', ' ', 'g')),
  lower(COALESCE(reference_number, '')),
  ROUND(COALESCE(debit_amount, 0)::numeric, 3)::text,
  ROUND(COALESCE(credit_amount, 0)::numeric, 3)::text,
  ROUND(COALESCE(amount, 0)::numeric, 3)::text,
  upper(COALESCE(currency, 'QAR'))
))
WHERE line_hash IS NULL;

WITH ranked_imports AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY company_id, bank_id, file_hash
      ORDER BY imported_at, id
    ) AS rn
  FROM public.bank_statement_imports
  WHERE file_hash IS NOT NULL
    AND status <> 'cancelled'
),
duplicate_imports AS (
  SELECT id
  FROM ranked_imports
  WHERE rn > 1
)
UPDATE public.bank_statement_imports imports
SET
  status = 'cancelled',
  notes = concat_ws(' | ', imports.notes, 'Cancelled by duplicate import guard because another import has the same file hash.'),
  updated_at = now()
FROM duplicate_imports
WHERE imports.id = duplicate_imports.id;

WITH ranked_lines AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY company_id, bank_id, line_hash
      ORDER BY created_at, id
    ) AS rn
  FROM public.bank_statement_lines
  WHERE line_hash IS NOT NULL
    AND match_status <> 'duplicate'
),
duplicate_lines AS (
  SELECT id
  FROM ranked_lines
  WHERE rn > 1
)
UPDATE public.bank_statement_lines lines
SET
  match_status = 'duplicate',
  updated_at = now()
FROM duplicate_lines
WHERE lines.id = duplicate_lines.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_statement_imports_file_hash_unique
  ON public.bank_statement_imports(company_id, bank_id, file_hash)
  WHERE file_hash IS NOT NULL
    AND status <> 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_statement_lines_line_hash_unique
  ON public.bank_statement_lines(company_id, bank_id, line_hash)
  WHERE line_hash IS NOT NULL
    AND match_status <> 'duplicate';

CREATE OR REPLACE FUNCTION public.assign_bank_statement_line_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.line_hash := COALESCE(
    NULLIF(NEW.line_hash, ''),
    md5(concat_ws(
      '|',
      NEW.statement_date::text,
      COALESCE(NEW.value_date::text, ''),
      lower(regexp_replace(COALESCE(NEW.description, ''), '\s+', ' ', 'g')),
      lower(COALESCE(NEW.reference_number, '')),
      ROUND(COALESCE(NEW.debit_amount, 0)::numeric, 3)::text,
      ROUND(COALESCE(NEW.credit_amount, 0)::numeric, 3)::text,
      ROUND(COALESCE(NEW.amount, 0)::numeric, 3)::text,
      upper(COALESCE(NEW.currency, 'QAR'))
    ))
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_bank_statement_line_hash_trigger ON public.bank_statement_lines;
CREATE TRIGGER assign_bank_statement_line_hash_trigger
BEFORE INSERT OR UPDATE ON public.bank_statement_lines
FOR EACH ROW
EXECUTE FUNCTION public.assign_bank_statement_line_hash();

COMMENT ON COLUMN public.bank_statement_imports.file_hash IS 'Stable content fingerprint for duplicate bank statement import prevention.';
COMMENT ON COLUMN public.bank_statement_lines.line_hash IS 'Stable normalized line fingerprint for duplicate bank statement line prevention.';
