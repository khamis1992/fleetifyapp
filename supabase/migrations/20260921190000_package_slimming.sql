-- Payload slimming + remaining approval blockers:
--  * the statement-package response now ships only journals that need reviewer
--    attention (cash-flow/equity review, canonical closing) instead of every
--    posted journal of both periods — the full-detail computation, checks and
--    fingerprint are unchanged;
--  * three legacy posted entries with fewer than two lines are retired;
--  * vehicle fixed-asset accounts created and role-mapped so the fleet bridge
--    can capitalize (non-current section currently empty).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- 1. Slim package payload: keep only notable journals in the response.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION financial_statement_private.get_report(p_company uuid, p_configuration jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $f$
DECLARE v_payload jsonb; v_total integer;
BEGIN
 IF NOT balance_sheet_private.has_access(p_company,'view') THEN
   RAISE EXCEPTION 'Not authorized to view financial statements' USING ERRCODE = '42501';
 END IF;
 v_payload := financial_statement_private.calculate(p_company, p_configuration);
 v_total := jsonb_array_length(COALESCE(v_payload->'journals','[]'::jsonb));
 -- First response ships only journals needing review; the treatments tab can
 -- still work from these, and totals stay visible via journalsTotal.
 v_payload := jsonb_set(v_payload, '{journals}', COALESCE((
   SELECT jsonb_agg(j ORDER BY (j->>'date'), (j->>'id'))
   FROM jsonb_array_elements(v_payload->'journals') j
   WHERE COALESCE((j->>'requiresCashFlowReview')::boolean, false)
      OR COALESCE((j->>'requiresEquityReview')::boolean, false)
      OR COALESCE((j->>'isCanonicalClosing')::boolean, false)
 ), '[]'::jsonb));
 v_payload := v_payload || jsonb_build_object('journalsTotal', v_total, 'journalsTrimmed', true);
 RETURN v_payload;
END;
$f$;

CREATE OR REPLACE FUNCTION public.get_financial_statement_package_v1(p_company_id uuid, p_configuration jsonb)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $f$ SELECT financial_statement_private.get_report(p_company_id, p_configuration) $f$;
REVOKE ALL ON FUNCTION public.get_financial_statement_package_v1(uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_statement_package_v1(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Retire legacy posted entries with fewer than two lines.
-- ---------------------------------------------------------------------------
SET LOCAL app.financial_controls_bypass = 'on';
UPDATE public.journal_entries e
SET status = 'cancelled', updated_at = now(),
  workflow_notes = CASE
    WHEN COALESCE(btrim(workflow_notes), '') = ''
      THEN 'INSUFFICIENT_LINES_RETIRED by migration 20260921190000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
    ELSE workflow_notes || E'\n' || 'INSUFFICIENT_LINES_RETIRED by migration 20260921190000 at ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
  END
WHERE e.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND e.status = 'posted'
  AND (SELECT count(*) FROM public.journal_entry_lines l WHERE l.journal_entry_id = e.id) < 2;
SET LOCAL app.financial_controls_bypass = '';

-- ---------------------------------------------------------------------------
-- 3. Vehicle fixed-asset accounts + role mappings (non-current section).
-- ---------------------------------------------------------------------------
INSERT INTO public.chart_of_accounts (
  company_id, account_code, account_name, account_name_ar, account_type, account_subtype,
  balance_type, account_level, is_header, is_active, parent_account_code
)
SELECT v.company_id, v.code, v.name_en, v.name_ar, 'assets', v.subtype,
       'debit', 3, false, true, v.parent
FROM (VALUES
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, '1510', 'Vehicles', 'أصول المركبات', 'non_current_asset', '15'),
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, '1520', 'Accumulated Depreciation - Vehicles', 'مجمع إهلاك المركبات', 'contra_non_current_asset', '15')
) AS v(company_id, code, name_en, name_ar, subtype, parent)
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts a WHERE a.company_id = v.company_id AND a.account_code = v.code);

INSERT INTO public.account_mappings (company_id, default_account_type_id, chart_of_accounts_id, is_active)
SELECT v.company_id, t.id, a.id, true
FROM (VALUES
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 'VEHICLES_ASSET', '1510'),
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 'ACCUMULATED_DEPRECIATION', '1520')
) AS v(company_id, type_code, account_code)
JOIN public.default_account_types t ON t.type_code = v.type_code
JOIN public.chart_of_accounts a ON a.company_id = v.company_id AND a.account_code = v.account_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_mappings m WHERE m.company_id = v.company_id AND m.default_account_type_id = t.id
);

NOTIFY pgrst,'reload schema';
COMMIT;
