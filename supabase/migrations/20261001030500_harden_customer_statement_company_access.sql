-- Harden the live customer statement RPC without changing monetary calculations.
-- Verified against pg_proc, information_schema and the current customer-details caller.
-- No source rows are changed; the existing period-only running balance is preserved.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.get_customer_account_statement_by_code(p_company_id uuid, p_customer_code text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS TABLE(transaction_id text, transaction_date date, transaction_type text, description text, reference_number character varying, debit_amount numeric, credit_amount numeric, running_balance numeric, source_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_customer_id UUID;
  v_running_balance DECIMAL(15,3) := 0;
BEGIN
  -- The SQL execution role is authoritative; JWT role text cannot grant service access.
  -- SECURITY DEFINER makes current_user the owner, so it must never be used here.
  IF current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND session_user <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required for customer account statement' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_company_id IS NULL OR NULLIF(btrim(p_customer_code), '') IS NULL
     OR (p_date_from IS NOT NULL AND (NOT isfinite(p_date_from) OR p_date_from < DATE '0001-01-01'))
     OR (p_date_to IS NOT NULL AND (NOT isfinite(p_date_to) OR p_date_to < DATE '0001-01-01'))
     OR (p_date_from IS NOT NULL AND p_date_to IS NOT NULL AND p_date_from > p_date_to) THEN
    RAISE EXCEPTION 'Invalid customer account statement parameters' USING ERRCODE = '22023';
  END IF;

  IF current_setting('role', true) IS DISTINCT FROM 'service_role'
     AND session_user <> 'service_role' THEN
    IF public.get_user_company_id() IS DISTINCT FROM p_company_id
       OR NOT EXISTS (
         SELECT 1 FROM public.profiles profile
         WHERE profile.user_id = auth.uid() AND profile.company_id = p_company_id
           AND COALESCE(profile.is_active, true)
       )
       OR EXISTS (
         SELECT 1 FROM public.employees employee
         WHERE employee.user_id = auth.uid() AND employee.company_id = p_company_id
           AND (employee.has_system_access = false
             OR (NULLIF(btrim(employee.account_status), '') IS NOT NULL
               AND lower(btrim(employee.account_status)) <> 'active'))
       )
       OR NOT COALESCE(public.is_finance_action_authorized(
         auth.uid(), p_company_id, ARRAY['operations.customers.read'],
         ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'fleet_manager', 'sales_agent']
       ), false) THEN
      RAISE EXCEPTION 'Not authorized to read customer account statement in company' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Find customer by code
  SELECT id INTO v_customer_id
  FROM public.customers 
  WHERE customer_code = p_customer_code 
    AND company_id = p_company_id 
    AND is_active = true;

  -- If customer not found, return empty result
  IF v_customer_id IS NULL THEN
    RAISE NOTICE 'Customer with code % not found', p_customer_code;
    RETURN;
  END IF;

  -- Return simple transaction statement (invoices + payments only)
  RETURN QUERY
  WITH all_transactions AS (
    -- Invoices (debit)
    SELECT 
      i.id::TEXT as trans_id,
      i.invoice_date::DATE as trans_date,
      'invoice'::TEXT as trans_type,
      COALESCE(i.notes, 'فاتورة رقم ' || i.invoice_number) as trans_desc,
      i.invoice_number as ref_num,
      i.total_amount as debit_amt,
      0::DECIMAL(15,3) as credit_amt,
      'invoices'::TEXT as source,
      i.invoice_date::TIMESTAMP as sort_time
    FROM public.invoices i
    WHERE i.customer_id = v_customer_id
      AND i.company_id = p_company_id
      AND (p_date_from IS NULL OR i.invoice_date >= p_date_from)
      AND (p_date_to IS NULL OR i.invoice_date <= p_date_to)
      AND COALESCE(i.status, 'active') != 'cancelled'

    UNION ALL

    -- Payments (credit)
    SELECT 
      p.id::TEXT as trans_id,
      p.payment_date::DATE as trans_date,
      'payment'::TEXT as trans_type,
      COALESCE(p.notes, 'دفعة رقم ' || p.payment_number) as trans_desc,
      p.payment_number as ref_num,
      0::DECIMAL(15,3) as debit_amt,
      p.amount as credit_amt,
      'payments'::TEXT as source,
      p.payment_date::TIMESTAMP as sort_time
    FROM public.payments p
    WHERE p.customer_id = v_customer_id
      AND p.company_id = p_company_id
      AND (p_date_from IS NULL OR p.payment_date >= p_date_from)
      AND (p_date_to IS NULL OR p.payment_date <= p_date_to)
      AND p.payment_status IN ('completed', 'paid', 'approved')
  ),
  
  ordered AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY trans_date, sort_time) as row_num
    FROM all_transactions
  )
  
  SELECT 
    o.trans_id,
    o.trans_date,
    o.trans_type,
    o.trans_desc,
    o.ref_num,
    o.debit_amt,
    o.credit_amt,
    -- Simple running balance calculation
    (
      SELECT SUM(o2.debit_amt - o2.credit_amt)
      FROM ordered o2
      WHERE o2.row_num <= o.row_num
    ) as running_balance,
    o.source
  FROM ordered o
  ORDER BY o.trans_date, o.sort_time;

END;
$function$;

REVOKE ALL ON FUNCTION public.get_customer_account_statement_by_code(uuid,text,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_account_statement_by_code(uuid,text,date,date) TO authenticated, service_role;

COMMIT;

