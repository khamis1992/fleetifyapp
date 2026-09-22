-- Cash flow analysis rebuilt from the LEDGER: movements on the mapped cash/bank
-- accounts (posted journal lines) with counterpart classification, replacing the
-- payments-table heuristic that filtered payment_type='receipt'/'payment' while
-- real rows carry payment_type='cash' + transaction_type='receipt' (missing flow).
-- Financing installments (VEHICLE_INSTALLMENT_PAYABLE / VEHICLE_FINANCE_LONG_TERM
-- role accounts) classify into the financing section.
-- Signature and output columns are unchanged.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.generate_cash_flow_analysis(
  company_id_param uuid, start_date_param date DEFAULT NULL, end_date_param date DEFAULT NULL
) RETURNS TABLE(
  total_inflow numeric, total_outflow numeric, net_cash_flow numeric,
  operating_cash_flow numeric, investing_cash_flow numeric, financing_cash_flow numeric
) LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  v_start date := COALESCE(start_date_param, (CURRENT_DATE - INTERVAL '6 months')::date);
  v_end date := COALESCE(end_date_param, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date);
BEGIN
  IF current_user NOT IN ('postgres','service_role') AND NOT COALESCE(
    auth.uid() IS NOT NULL AND (public.get_user_company(auth.uid()) = company_id_param OR public.is_super_admin(auth.uid())), false
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;
  IF company_id_param IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = company_id_param
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;

  RETURN QUERY
  WITH role_accounts AS (
    SELECT dat.type_code, m.chart_of_accounts_id AS account_id
    FROM public.account_mappings m
    JOIN public.default_account_types dat ON dat.id = m.default_account_type_id
    WHERE m.company_id = company_id_param AND COALESCE(m.is_active, true)
      AND dat.type_code IN ('CASH','BANK','PETTY_CASH','VEHICLE_INSTALLMENT_PAYABLE','VEHICLE_FINANCE_LONG_TERM')
  ),
  cash_accounts AS (
    SELECT account_id FROM role_accounts
    WHERE type_code IN ('CASH','BANK','PETTY_CASH')
    UNION
    SELECT a.id FROM public.chart_of_accounts a
    WHERE a.company_id = company_id_param
      AND NOT EXISTS (SELECT 1 FROM role_accounts ra WHERE ra.type_code IN ('CASH','BANK','PETTY_CASH'))
      AND lower(a.account_type) IN ('asset','assets')
      AND (lower(COALESCE(a.account_subtype,'')) ~ '(cash|bank|petty)'
        OR a.account_code IN ('1010','1101','1102','1110','1120'))
  ),
  financing_accounts AS (
    SELECT account_id FROM role_accounts
    WHERE type_code IN ('VEHICLE_INSTALLMENT_PAYABLE','VEHICLE_FINANCE_LONG_TERM')
  ),
  entries AS (
    SELECT e.id FROM public.journal_entries e
    WHERE e.company_id = company_id_param AND e.status = 'posted'
      AND e.entry_date BETWEEN v_start AND v_end
  ),
  cash_movement AS (
    SELECT l.journal_entry_id,
      SUM(COALESCE(l.debit_amount,0) - COALESCE(l.credit_amount,0)) AS move
    FROM public.journal_entry_lines l JOIN entries en ON en.id = l.journal_entry_id
    WHERE l.account_id IN (SELECT account_id FROM cash_accounts)
    GROUP BY l.journal_entry_id
    HAVING ABS(SUM(COALESCE(l.debit_amount,0) - COALESCE(l.credit_amount,0))) > 0.01
  ),
  counterparts AS (
    SELECT l.journal_entry_id, l.account_id,
      COALESCE(l.debit_amount,0) - COALESCE(l.credit_amount,0) AS net
    FROM public.journal_entry_lines l JOIN entries en ON en.id = l.journal_entry_id
    WHERE l.account_id NOT IN (SELECT account_id FROM cash_accounts)
      AND ABS(COALESCE(l.debit_amount,0) - COALESCE(l.credit_amount,0)) > 0.01
  ),
  weights AS (
    SELECT journal_entry_id, SUM(ABS(net)) AS weight FROM counterparts GROUP BY 1
  ),
  flows AS (
    SELECT
      CASE
        WHEN lower(a.account_type) IN ('equity','equities') THEN 'financing'
        WHEN lower(a.account_type) IN ('liability','liabilities') AND (
          c.account_id IN (SELECT account_id FROM financing_accounts)
          OR lower(COALESCE(a.account_subtype,'')) ~ '(loan|borrow|debt|lease|long.?term|non.?current|installment)'
        ) THEN 'financing'
        WHEN lower(a.account_type) IN ('asset','assets') AND (
          a.account_code ~ '^(15|16|17|18)'
          OR lower(COALESCE(a.account_subtype,'')) ~ '(fixed|non.?current|property|equipment|vehicle)'
        ) THEN 'investing'
        ELSE 'operating'
      END AS category,
      cm.move * ABS(c.net) / w.weight AS amount
    FROM cash_movement cm
    JOIN counterparts c ON c.journal_entry_id = cm.journal_entry_id
    JOIN weights w ON w.journal_entry_id = cm.journal_entry_id
    JOIN public.chart_of_accounts a ON a.id = c.account_id
  )
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0),
    COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0),
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount) FILTER (WHERE category = 'operating'), 0),
    COALESCE(SUM(amount) FILTER (WHERE category = 'investing'), 0),
    COALESCE(SUM(amount) FILTER (WHERE category = 'financing'), 0)
  FROM flows;
END;
$fn$;

REVOKE ALL ON FUNCTION public.generate_cash_flow_analysis(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_cash_flow_analysis(uuid, date, date) TO authenticated, service_role;
COMMENT ON FUNCTION public.generate_cash_flow_analysis(uuid, date, date) IS
  'Ledger-direct cash flow analysis: posted movements on mapped cash/bank accounts; counterparts classified operating/investing/financing, with installment-payable role accounts always financing.';

NOTIFY pgrst,'reload schema';
COMMIT;
