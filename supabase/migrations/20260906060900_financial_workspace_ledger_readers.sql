BEGIN;

-- current_balance is a derived cache, never an opening journal. Keep historical
-- postings on inactive/legacy accounts in the reports; surface configuration
-- violations separately instead of silently discarding real ledger movements.
CREATE OR REPLACE FUNCTION public.get_account_balances(
  company_id_param uuid, as_of_date date DEFAULT CURRENT_DATE,
  account_type_filter text DEFAULT NULL
) RETURNS TABLE (
  account_id uuid, account_code varchar, account_name text, account_name_ar text,
  account_type text, balance_type text, opening_balance numeric,
  total_debits numeric, total_credits numeric, closing_balance numeric
) LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role') AND NOT coalesce(
    auth.uid() IS NOT NULL AND (public.get_user_company(auth.uid())=company_id_param OR public.is_super_admin(auth.uid())),false
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;
  IF company_id_param IS NULL OR as_of_date IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id = company_id_param
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  WITH movements AS (
    SELECT l.account_id, sum(coalesce(l.debit_amount,0)) debit,
      sum(coalesce(l.credit_amount,0)) credit
    FROM public.journal_entry_lines l JOIN public.journal_entries e ON e.id = l.journal_entry_id
    WHERE e.company_id = company_id_param AND e.status = 'posted' AND e.entry_date <= as_of_date
    GROUP BY l.account_id
  )
  SELECT a.id, a.account_code, a.account_name, a.account_name_ar, a.account_type,
    a.balance_type, 0::numeric, coalesce(m.debit,0), coalesce(m.credit,0),
    CASE WHEN a.balance_type = 'debit' THEN coalesce(m.debit,0)-coalesce(m.credit,0)
      ELSE coalesce(m.credit,0)-coalesce(m.debit,0) END
  FROM public.chart_of_accounts a LEFT JOIN movements m ON m.account_id = a.id
  WHERE a.company_id = company_id_param AND (a.is_active OR m.account_id IS NOT NULL)
    AND (account_type_filter IS NULL OR a.account_type = account_type_filter)
  ORDER BY a.account_code, a.id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_trial_balance(
  company_id_param uuid, as_of_date date DEFAULT CURRENT_DATE
) RETURNS TABLE (
  account_id uuid, account_code varchar, account_name text, account_name_ar text,
  account_type text, account_level integer, debit_balance numeric, credit_balance numeric
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT b.account_id,b.account_code,b.account_name,b.account_name_ar,b.account_type,
    a.account_level,greatest(b.total_debits-b.total_credits,0),greatest(b.total_credits-b.total_debits,0)
  FROM public.get_account_balances(company_id_param,as_of_date,NULL) b
  JOIN public.chart_of_accounts a ON a.id=b.account_id AND a.company_id=company_id_param
  ORDER BY a.account_level,b.account_code,b.account_id;
$$;

CREATE OR REPLACE FUNCTION public.get_financial_summary(
  company_id_param uuid, date_from date DEFAULT NULL, date_to date DEFAULT CURRENT_DATE
) RETURNS TABLE (
  total_assets numeric,total_liabilities numeric,total_equity numeric,
  total_revenue numeric,total_expenses numeric,net_income numeric,unbalanced_entries_count bigint
) LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role') AND NOT coalesce(
    auth.uid() IS NOT NULL AND (public.get_user_company(auth.uid())=company_id_param OR public.is_super_admin(auth.uid())),false
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;
  IF company_id_param IS NULL OR date_to IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id=company_id_param
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;
  IF date_from > date_to THEN RAISE EXCEPTION 'Invalid reporting date range' USING ERRCODE = '22023'; END IF;
  RETURN QUERY
  WITH RECURSIVE closing_ids(id) AS (
    SELECT e.id FROM public.journal_entries e WHERE e.company_id=company_id_param
      AND e.reference_type IN ('closing','annual_close','annual_close_opening')
    UNION
    SELECT e.id FROM public.journal_entries e JOIN closing_ids c ON c.id=e.reference_id
      WHERE e.company_id=company_id_param AND e.reference_type IN ('journal_reversal','reversal')
  ), movements AS (
    SELECT lower(a.account_type) kind,e.entry_date,c.id IS NULL AS performance_entry,
      coalesce(l.debit_amount,0)-coalesce(l.credit_amount,0) movement
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id=l.journal_entry_id AND e.company_id=company_id_param
    JOIN public.chart_of_accounts a ON a.id=l.account_id AND a.company_id=e.company_id
    LEFT JOIN closing_ids c ON c.id=e.id
    WHERE e.status='posted' AND e.entry_date <= date_to
  ), totals AS (
    SELECT coalesce(sum(movement) FILTER (WHERE kind IN ('asset','assets')),0) assets,
      coalesce(sum(-movement) FILTER (WHERE kind IN ('liability','liabilities')),0) liabilities,
      -- Equity includes earnings not yet transferred by a closing entry.
      coalesce(sum(-movement) FILTER (WHERE kind IN ('equity','revenue','income','expense','expenses')),0) equity,
      coalesce(sum(-movement) FILTER (WHERE performance_entry AND kind IN ('revenue','income') AND (date_from IS NULL OR entry_date>=date_from)),0) revenue,
      coalesce(sum(movement) FILTER (WHERE performance_entry AND kind IN ('expense','expenses') AND (date_from IS NULL OR entry_date>=date_from)),0) expenses
    FROM movements
  )
  SELECT t.assets,t.liabilities,t.equity,t.revenue,t.expenses,t.revenue-t.expenses,
    (SELECT count(*) FROM public.journal_entries e WHERE e.company_id=company_id_param
      AND e.status='posted' AND e.entry_date<=date_to AND (date_from IS NULL OR e.entry_date>=date_from)
      AND abs(e.total_debit-e.total_credit)>0.01)
  FROM totals t;
END; $$;

-- One statement provides a consistent company snapshot, independent of the
-- PostgREST row limit. Balance sheet is cumulative; P&L is the selected month.
CREATE OR REPLACE FUNCTION public.get_financial_workspace_v1(
  p_company_id uuid, p_as_of date DEFAULT CURRENT_DATE
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF current_user NOT IN ('postgres','service_role') AND NOT coalesce(
    auth.uid() IS NOT NULL AND (public.get_user_company(auth.uid())=p_company_id OR public.is_super_admin(auth.uid())),false
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;
  IF p_company_id IS NULL OR p_as_of IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.id=p_company_id
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;
  WITH RECURSIVE closing_ids(id) AS (
    SELECT e.id FROM public.journal_entries e WHERE e.company_id=p_company_id
      AND e.reference_type IN ('closing','annual_close','annual_close_opening')
    UNION
    SELECT e.id FROM public.journal_entries e JOIN closing_ids c ON c.id=e.reference_id
      WHERE e.company_id=p_company_id AND e.reference_type IN ('journal_reversal','reversal')
  ), journals AS MATERIALIZED (
    SELECT * FROM public.journal_entries WHERE company_id=p_company_id AND entry_date<=p_as_of
  ), ledger AS MATERIALIZED (
    SELECT l.id,l.account_id,l.debit_amount,l.credit_amount,e.id journal_id,
      e.entry_date,e.reference_type,a.account_type,a.account_level,a.is_header,
      a.company_id account_company_id,c.id IS NULL AS performance_entry
    FROM journals e JOIN public.journal_entry_lines l ON l.journal_entry_id=e.id
    LEFT JOIN public.chart_of_accounts a ON a.id=l.account_id
    LEFT JOIN closing_ids c ON c.id=e.id
    WHERE e.status='posted'
  ), journal_totals AS (
    SELECT e.id,e.total_debit,e.total_credit,count(l.id) lines,
      coalesce(sum(l.debit_amount),0) debit,coalesce(sum(l.credit_amount),0) credit
    FROM journals e LEFT JOIN ledger l ON l.journal_id=e.id
    WHERE e.status='posted' GROUP BY e.id,e.total_debit,e.total_credit
  ), invoice_scope AS MATERIALIZED (
    SELECT * FROM public.invoices WHERE company_id=p_company_id
      AND coalesce(invoice_month,invoice_date)<=p_as_of
      AND lower(coalesce(status,'draft')) NOT IN ('draft','cancelled','canceled','rejected','void','voided')
      AND lower(coalesce(payment_status,'')) NOT IN ('cancelled','canceled','void','voided')
  ), receipts AS MATERIALIZED (
    SELECT * FROM public.payments WHERE company_id=p_company_id AND payment_date<=p_as_of
      AND payment_status IN ('completed','paid','confirmed') AND transaction_type::text='receipt'
  ), checks AS (
    SELECT 'journal_balance'::text code,'critical'::text severity,count(*) count
      FROM journal_totals WHERE lines<2 OR abs(debit-credit)>0.01
        OR abs(debit-total_debit)>0.01 OR abs(credit-total_credit)>0.01
    UNION ALL SELECT 'posting_accounts','critical',count(*) FROM ledger
      WHERE account_company_id IS DISTINCT FROM p_company_id OR is_header IS DISTINCT FROM false
        OR coalesce(account_level,0)<3
    UNION ALL SELECT 'account_classification','warning',count(*) FROM public.chart_of_accounts a
      WHERE a.company_id=p_company_id AND a.is_active AND NOT a.is_header
        AND lower(a.account_type) IN ('asset','assets','liability','liabilities') AND a.account_subtype IS NULL
    UNION ALL SELECT 'receipt_journal','critical',count(*) FROM receipts p
      WHERE NOT EXISTS (SELECT 1 FROM journals e WHERE e.status='posted'
        AND (e.id=p.journal_entry_id OR (e.reference_type='payment' AND e.reference_id=p.id)))
    UNION ALL SELECT 'invoice_balance','critical',count(*) FROM invoice_scope
      WHERE paid_amount<0 OR paid_amount>total_amount+0.01
        OR abs(coalesce(balance_due,0)-greatest(total_amount-coalesce(paid_amount,0),0))>0.01
    UNION ALL SELECT 'prepaid_due_date','warning',count(*) FROM invoice_scope
      WHERE due_date IS DISTINCT FROM date_trunc('month',coalesce(invoice_month,invoice_date))::date
    UNION ALL SELECT 'allocation_overflow','critical',count(*) FROM (
      SELECT p.id FROM receipts p JOIN public.payment_allocations a ON a.payment_id=p.id
        AND a.company_id=p_company_id AND a.is_active
      GROUP BY p.id,p.amount HAVING sum(a.amount)>p.amount+0.01
    ) overflow
    UNION ALL SELECT 'payroll_journal','critical',count(*) FROM public.payroll p
      WHERE p.company_id=p_company_id AND p.payroll_date<=p_as_of AND p.status IN ('paid','processed')
        AND NOT EXISTS (SELECT 1 FROM journals e WHERE e.id=p.journal_entry_id AND e.status='posted')
    UNION ALL SELECT 'maintenance_journal','critical',count(*) FROM public.vehicle_maintenance m
      WHERE m.company_id=p_company_id AND m.completed_date<=p_as_of AND m.status::text='completed'
        AND coalesce(m.actual_cost,0)>0 AND NOT EXISTS (
          SELECT 1 FROM journals e WHERE e.id=m.journal_entry_id AND e.status='posted')
    UNION ALL SELECT 'property_journal','critical',count(*) FROM public.property_payments p
      WHERE p.company_id=p_company_id AND p.payment_date<=p_as_of AND p.status='paid'
        AND NOT EXISTS (SELECT 1 FROM journals e WHERE e.id=p.journal_entry_id AND e.status='posted')
  ), months AS (
    SELECT generate_series(date_trunc('month',p_as_of)-interval '5 months',date_trunc('month',p_as_of),interval '1 month')::date AS month
  ), trend AS (
    SELECT m.month,
      coalesce(sum(coalesce(l.credit_amount,0)-coalesce(l.debit_amount,0)) FILTER (WHERE l.performance_entry AND lower(l.account_type) IN ('revenue','income')),0) revenue,
      coalesce(sum(coalesce(l.debit_amount,0)-coalesce(l.credit_amount,0)) FILTER (WHERE l.performance_entry AND lower(l.account_type) IN ('expense','expenses')),0) expenses
    FROM months m LEFT JOIN ledger l ON l.entry_date>=m.month AND l.entry_date<(m.month+interval '1 month')
      AND l.account_company_id=p_company_id GROUP BY m.month ORDER BY m.month
  ), sources AS (
    SELECT coalesce(reference_type,'manual') source,count(*) entries
    FROM journals WHERE status='posted' GROUP BY reference_type
  )
  SELECT jsonb_build_object(
    'company_id',p_company_id,'as_of',p_as_of,'checked_at',statement_timestamp(),'basis','posted_ledger',
    'summary',(SELECT to_jsonb(s) FROM public.get_financial_summary(p_company_id,date_trunc('month',p_as_of)::date,p_as_of) s),
    'receivables',jsonb_build_object(
      'outstanding',coalesce((SELECT sum(greatest(total_amount-coalesce(paid_amount,0),0)) FROM invoice_scope WHERE invoice_type IN ('sales','service')),0),
      'overdue',coalesce((SELECT sum(greatest(total_amount-coalesce(paid_amount,0),0)) FROM invoice_scope WHERE invoice_type IN ('sales','service') AND due_date<p_as_of),0),
      'overdue_count',(SELECT count(*) FROM invoice_scope WHERE invoice_type IN ('sales','service') AND due_date<p_as_of AND total_amount-coalesce(paid_amount,0)>0.01),
      'invoiced',coalesce((SELECT sum(total_amount) FROM invoice_scope WHERE invoice_type IN ('sales','service')),0),
      'settled',coalesce((SELECT sum(coalesce(paid_amount,0)) FROM invoice_scope WHERE invoice_type IN ('sales','service')),0)
    ),
    'monthly_receipts',coalesce((SELECT sum(amount) FROM receipts WHERE payment_date>=date_trunc('month',p_as_of)),0),
    'posted_entries',(SELECT count(*) FROM journals WHERE status='posted'),
    'draft_entries',(SELECT count(*) FROM journals WHERE status='draft'),
    'trend',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.month) FROM trend t),'[]'::jsonb),
    'checks',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.severity,c.code) FROM checks c),
    'sources',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.entries DESC,s.source) FROM sources s),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END; $$;

CREATE OR REPLACE FUNCTION public.get_income_statement_accounts_v1(
  p_company_id uuid,p_date_from date,p_date_to date DEFAULT CURRENT_DATE
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF current_user NOT IN ('postgres','service_role') AND NOT coalesce(
    auth.uid() IS NOT NULL AND (public.get_user_company(auth.uid())=p_company_id OR public.is_super_admin(auth.uid())),false
  ) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE = '42501'; END IF;
  IF p_company_id IS NULL OR p_date_from IS NULL OR p_date_to IS NULL OR p_date_from>p_date_to THEN
    RAISE EXCEPTION 'Invalid income statement scope' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id=p_company_id) THEN
    RAISE EXCEPTION 'Company reporting access required' USING ERRCODE='42501'; END IF;
  WITH RECURSIVE closing_ids(id) AS (
    SELECT e.id FROM public.journal_entries e WHERE e.company_id=p_company_id
      AND e.reference_type IN ('closing','annual_close','annual_close_opening')
    UNION
    SELECT e.id FROM public.journal_entries e JOIN closing_ids c ON c.id=e.reference_id
      WHERE e.company_id=p_company_id AND e.reference_type IN ('journal_reversal','reversal')
  ), movements AS (
    SELECT l.account_id,sum(coalesce(l.debit_amount,0)-coalesce(l.credit_amount,0)) movement
    FROM public.journal_entry_lines l JOIN public.journal_entries e ON e.id=l.journal_entry_id
    LEFT JOIN closing_ids c ON c.id=e.id
    WHERE e.company_id=p_company_id AND e.status='posted' AND c.id IS NULL
      AND e.entry_date BETWEEN p_date_from AND p_date_to GROUP BY l.account_id
  )
  SELECT coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('current_balance',
    CASE WHEN lower(a.account_type) IN ('revenue','income') THEN -coalesce(m.movement,0) ELSE coalesce(m.movement,0) END
  ) ORDER BY a.account_code,a.id),'[]'::jsonb) INTO v_result
  FROM public.chart_of_accounts a LEFT JOIN movements m ON m.account_id=a.id
  WHERE a.company_id=p_company_id AND lower(a.account_type) IN ('revenue','income','expense','expenses')
    AND (a.is_active OR m.account_id IS NOT NULL);
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.get_income_statement_accounts_v1(uuid,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_income_statement_accounts_v1(uuid,date,date) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.get_account_balances(uuid,date,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_trial_balance(uuid,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_financial_summary(uuid,date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_financial_workspace_v1(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_account_balances(uuid,date,text) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_trial_balance(uuid,date) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(uuid,date,date) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_workspace_v1(uuid,date) TO authenticated,service_role;
COMMIT;
