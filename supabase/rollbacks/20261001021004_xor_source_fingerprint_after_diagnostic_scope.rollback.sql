-- Restore the source_fingerprint definition captured read-only from live
-- on 2026-09-30 23:10:04 UTC, including its original bit_or fold.
-- CREATE OR REPLACE retains dependencies, function OID, owner and execution ACL.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION balance_sheet_private.source_fingerprint(p_company uuid, p_as_of date)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
 SET "TimeZone" TO 'UTC'
AS $function$
  WITH entries AS (
    SELECT e.id, e.entry_number, e.entry_date, e.status, e.total_debit, e.total_credit,
      e.posted_at, e.reversed_at, e.reversal_entry_id, e.reference_type, e.reference_id,
      r.id AS reversal_id, r.entry_date AS reversal_date, r.status AS reversal_status
    FROM public.journal_entries e
    LEFT JOIN public.journal_entries r ON r.id = e.reversal_entry_id AND r.company_id = e.company_id
    WHERE e.company_id = p_company AND e.entry_date <= p_as_of
  ), lines AS (
    SELECT l.id, l.journal_entry_id, l.account_id, l.line_number, l.debit_amount, l.credit_amount,
      l.line_description, e.status, ca.id AS owned_account_id
    FROM public.journal_entry_lines l
    JOIN entries e ON e.id = l.journal_entry_id
    LEFT JOIN public.chart_of_accounts ca ON ca.id = l.account_id AND ca.company_id = p_company
  ), row_hashes AS (
    SELECT balance_sheet_private.record_hash(concat_ws('|', 'account', a.id, a.code, a.name,
      COALESCE(a.name_ar, '\N'), COALESCE(a.type, '\N'), COALESCE(a.raw_type, '\N'),
      COALESCE(a.subtype, '\N'), COALESCE(a.balance_type, '\N'), COALESCE(a.level::text, '\N'),
      COALESCE(a.is_header::text, '\N'), COALESCE(a.is_active::text, '\N'),
      COALESCE(a.parent_account_id::text, '\N'), COALESCE(a.parent_account_code, '\N'))) AS h
    FROM (
      SELECT a2.id, a2.account_code AS code, a2.account_name AS name, a2.account_name_ar AS name_ar,
        balance_sheet_private.account_type(a2.account_type) AS type, a2.account_type AS raw_type,
        a2.account_subtype AS subtype, a2.balance_type, a2.account_level AS level,
        COALESCE(a2.is_header, false) AS is_header, COALESCE(a2.is_active, true) AS is_active,
        a2.parent_account_id, a2.parent_account_code
      FROM public.chart_of_accounts a2 WHERE a2.company_id = p_company
    ) a
    UNION ALL
    SELECT balance_sheet_private.record_hash(concat_ws('|', 'entry', e.id, COALESCE(e.entry_number, '\N'),
      e.entry_date, e.status, COALESCE(e.total_debit::text, '\N'), COALESCE(e.total_credit::text, '\N'),
      COALESCE(to_char(e.posted_at, 'YYYY-MM-DD HH24:MI:SS.US'), '\N'),
      COALESCE(to_char(e.reversed_at, 'YYYY-MM-DD HH24:MI:SS.US'), '\N'),
      COALESCE(e.reversal_entry_id::text, '\N'), COALESCE(e.reference_type, '\N'),
      COALESCE(e.reference_id::text, '\N'), COALESCE(e.reversal_id::text, '\N'),
      COALESCE(e.reversal_date::text, '\N'), COALESCE(e.reversal_status, '\N')))
    FROM entries e
    UNION ALL
    SELECT balance_sheet_private.record_hash(concat_ws('|', 'line', l.id, l.journal_entry_id,
      COALESCE(l.account_id::text, '\N'), COALESCE(l.line_number::text, '\N'),
      COALESCE(l.debit_amount::text, '\N'), COALESCE(l.credit_amount::text, '\N'),
      COALESCE(l.line_description, '\N'), l.status, COALESCE(l.owned_account_id::text, '\N')))
    FROM lines l
  )
  SELECT encode(sha256(convert_to(COALESCE(
    (SELECT bit_or(('x' || lpad(h, 64, '0'))::bit(256))::text FROM row_hashes),
    'none'), 'UTF8')), 'hex');
$function$;

COMMIT;

