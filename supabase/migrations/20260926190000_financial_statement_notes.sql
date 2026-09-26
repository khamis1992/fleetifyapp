-- Automatic financial statement notes (إيضاحات) for balance sheet.
-- Notes only; no journal entries. Applied to project qwhunliohlkkahbspfiu 2026-09-26.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.financial_statement_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  as_of_date date NOT NULL,
  account_code text NULL,
  note_key text NOT NULL,
  title_ar text NOT NULL,
  body_ar text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_statement_notes_unique UNIQUE (company_id, as_of_date, note_key),
  CONSTRAINT financial_statement_notes_date CHECK (isfinite(as_of_date) AND as_of_date >= DATE '1900-01-01'),
  CONSTRAINT financial_statement_notes_title_len CHECK (length(btrim(title_ar)) >= 3 AND length(title_ar) <= 300),
  CONSTRAINT financial_statement_notes_body_len CHECK (length(btrim(body_ar)) >= 20 AND length(body_ar) <= 20000),
  CONSTRAINT financial_statement_notes_account_code_len CHECK (
    account_code IS NULL OR length(btrim(account_code)) BETWEEN 1 AND 32
  ),
  CONSTRAINT financial_statement_notes_note_key_len CHECK (length(btrim(note_key)) BETWEEN 2 AND 64)
);

CREATE INDEX IF NOT EXISTS financial_statement_notes_company_as_of
  ON public.financial_statement_notes (company_id, as_of_date DESC, sort_order, note_key);

ALTER TABLE public.financial_statement_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.financial_statement_notes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_statement_notes TO authenticated, service_role;

DROP POLICY IF EXISTS financial_statement_notes_read ON public.financial_statement_notes;
CREATE POLICY financial_statement_notes_read ON public.financial_statement_notes
  FOR SELECT TO authenticated
  USING (company_id = (SELECT public.get_user_company_id()));

DROP POLICY IF EXISTS financial_statement_notes_insert ON public.financial_statement_notes;
CREATE POLICY financial_statement_notes_insert ON public.financial_statement_notes
  FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT public.get_user_company_id()));

DROP POLICY IF EXISTS financial_statement_notes_update ON public.financial_statement_notes;
CREATE POLICY financial_statement_notes_update ON public.financial_statement_notes
  FOR UPDATE TO authenticated
  USING (company_id = (SELECT public.get_user_company_id()))
  WITH CHECK (company_id = (SELECT public.get_user_company_id()));

DROP POLICY IF EXISTS financial_statement_notes_delete ON public.financial_statement_notes;
CREATE POLICY financial_statement_notes_delete ON public.financial_statement_notes
  FOR DELETE TO authenticated
  USING (company_id = (SELECT public.get_user_company_id()));

DROP TRIGGER IF EXISTS financial_statement_notes_updated_at ON public.financial_statement_notes;
CREATE TRIGGER financial_statement_notes_updated_at
  BEFORE UPDATE ON public.financial_statement_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.financial_statement_notes (
  company_id, as_of_date, account_code, note_key, title_ar, body_ar, sort_order, is_active
) VALUES (
  '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
  DATE '2025-12-31',
  '1200',
  'trade_ar_1200',
  'إيضاح — الذمم المدينة التجارية',
  $note$
بلغ رصيد الذمم المدينة (حساب 1200) في 31 ديسمبر 2025 مبلغ 1,290,359.70 ريالاً قطرياً وفق الأستاذ العام. يُطابق هذا الرصيد كالتالي: الفواتير القائمة غير المرتبطة بعقود التأجير المنتهي بالتمليك، مضافاً إليها أرصدة مدينة كانت قائمة في تاريخ الإقفال على فواتير تم تحصيلها لاحقاً خلال عام 2026 (فروقات توقيت التحصيل)، بالإضافة إلى صافي بنود تسوية عزو موثّقة. لا تُجرى قيود إقفال إضافية لإخفاء فروقات التوقيت؛ وتُفصح الشركة عن سياسة المطابقة أعلاه.

رصيد عقود التأجير المنتهي بالتمليك يُعرض عبر الحساب ذي الصلة (12001) ويُفصل عن الذمم التجارية العادية عند الإفصاح.
$note$,
  10,
  true
)
ON CONFLICT (company_id, as_of_date, note_key) DO UPDATE SET
  account_code = EXCLUDED.account_code,
  title_ar = EXCLUDED.title_ar,
  body_ar = EXCLUDED.body_ar,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
