-- Bank reconciliation reader: module vs ledger balances, unposted transactions,
-- and the unapplied-cash picture for the reconciliation screen.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.get_bank_reconciliation_v1(p_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'asOf', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date,
    'banks', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', b.id, 'nameAr', COALESCE(b.bank_name_ar, b.bank_name), 'iban', b.iban,
        'ledgerAccountId', b.chart_of_accounts_id,
        'openingBalance', COALESCE(b.opening_balance, 0),
        'moduleBalance', COALESCE(b.current_balance, 0),
        'ledgerBalance', COALESCE((
          SELECT sum(l.debit_amount - l.credit_amount) FROM public.journal_entry_lines l
          JOIN public.journal_entries e ON e.id = l.journal_entry_id
          WHERE e.company_id = b.company_id AND e.status = 'posted' AND l.account_id = b.chart_of_accounts_id
        ), 0)
      ) ORDER BY b.bank_name) FROM public.banks b WHERE b.company_id = p_company_id), '[]'::jsonb),
    'unpostedTransactions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', t.id, 'date', t.transaction_date, 'type', t.transaction_type,
        'amount', t.amount, 'description', t.description, 'number', t.transaction_number
      ) ORDER BY t.transaction_date DESC, t.id) FROM public.bank_transactions t
      WHERE t.company_id = p_company_id AND t.status = 'completed' AND t.journal_entry_id IS NULL), '[]'::jsonb),
    'unappliedCash', (SELECT jsonb_build_object(
        'count', count(*), 'amount', COALESCE(sum(p.amount), 0)
      ) FROM public.payments p
      WHERE p.company_id = p_company_id AND p.payment_status = 'completed' AND p.invoice_id IS NULL),
    'unappliedAdvancesBalance', COALESCE((
      SELECT sum(l.credit_amount - l.debit_amount) FROM public.journal_entry_lines l
      JOIN public.journal_entries e ON e.id = l.journal_entry_id
      JOIN public.account_mappings m ON m.chart_of_accounts_id = l.account_id AND m.company_id = p_company_id
      JOIN public.default_account_types t ON t.id = m.default_account_type_id
      WHERE e.company_id = p_company_id AND e.status = 'posted' AND t.type_code = 'CUSTOMER_ADVANCES'
    ), 0)
  ) INTO v_result;
  RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_bank_reconciliation_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bank_reconciliation_v1(uuid) TO authenticated, service_role;

NOTIFY pgrst,'reload schema';
COMMIT;
