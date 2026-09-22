-- Vendor master enrichment + subtype-gated posting:
--  * vendors: CR number, IBAN, payment terms, default payable account;
--  * posting requires every journal-line account to carry account_subtype
--    (reports already block approval on missing subtype; this stops the leak
--    at posting time so bad data cannot accumulate further).
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS commercial_register text,
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS default_payable_account_id uuid
    REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_company_cr
  ON public.vendors(company_id, commercial_register);

-- Posting gate: every postable line account must have a subtype.
CREATE OR REPLACE FUNCTION public.require_account_subtype_on_posting()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
DECLARE v_missing text;
BEGIN
  IF COALESCE(NEW.status, '') <> 'posted' THEN RETURN NEW; END IF;
  IF COALESCE(current_setting('app.financial_controls_bypass', true), '') = 'on' THEN RETURN NEW; END IF;
  SELECT a.account_code INTO v_missing
  FROM public.journal_entry_lines l
  JOIN public.chart_of_accounts a ON a.id = l.account_id
  WHERE l.journal_entry_id = NEW.id
    AND NULLIF(btrim(COALESCE(a.account_subtype, '')), '') IS NULL
    AND a.account_type IN ('asset','assets','liability','liabilities','equity','revenue','income','expense','expenses')
  LIMIT 1;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'لا يمكن الترحيل: الحساب % بلا تصنيف فرعي (متداول/غير متداول) — صنّفه من دليل الحسابات أولاً', v_missing
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.require_account_subtype_on_posting() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS require_account_subtype_on_posting ON public.journal_entries;
CREATE TRIGGER require_account_subtype_on_posting
  BEFORE UPDATE OF status ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.require_account_subtype_on_posting();

NOTIFY pgrst,'reload schema';
COMMIT;
