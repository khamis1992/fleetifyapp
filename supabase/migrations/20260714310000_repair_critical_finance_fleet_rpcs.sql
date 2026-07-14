-- Repair user-facing finance and fleet RPCs against the current production schema.

CREATE OR REPLACE FUNCTION public.assert_finance_rpc_company_access_v1(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_company_id IS NULL THEN RAISE EXCEPTION 'Company ID is required'; END IF;
  IF COALESCE(auth.role(),'')<>'service_role'
     AND NOT public.validate_company_access_secure(auth.uid(),p_company_id) THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501';
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.assert_finance_rpc_company_access_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_finance_rpc_company_access_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.calculate_customer_outstanding_balance(
  customer_id_param uuid,
  company_id_param uuid
) RETURNS TABLE(
  current_balance numeric,
  overdue_amount numeric,
  days_overdue integer,
  credit_available numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_credit_limit numeric := 0;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  IF NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id=customer_id_param AND c.company_id=company_id_param
  ) THEN
    RAISE EXCEPTION 'Customer was not found in the selected company';
  END IF;

  SELECT COALESCE(c.credit_limit,0) INTO v_credit_limit
  FROM public.customers c
  WHERE c.id=customer_id_param AND c.company_id=company_id_param;

  RETURN QUERY
  SELECT
    COALESCE(SUM(GREATEST(COALESCE(i.balance_due,0),0)),0)::numeric,
    COALESCE(SUM(GREATEST(COALESCE(i.balance_due,0),0))
      FILTER (WHERE i.due_date<CURRENT_DATE),0)::numeric,
    COALESCE(MAX(GREATEST(CURRENT_DATE-i.due_date,0))
      FILTER (WHERE i.due_date<CURRENT_DATE AND COALESCE(i.balance_due,0)>0),0)::integer,
    GREATEST(v_credit_limit-COALESCE(SUM(GREATEST(COALESCE(i.balance_due,0),0)),0),0)::numeric
  FROM public.invoices i
  WHERE i.customer_id=customer_id_param
    AND i.company_id=company_id_param
    AND lower(COALESCE(i.status,'')) NOT IN ('cancelled','canceled','void','reversed');
END; $$;

CREATE OR REPLACE FUNCTION public.check_customer_credit_status(
  customer_id_param uuid,
  company_id_param uuid
) RETURNS TABLE(
  credit_score integer,
  risk_level text,
  credit_available numeric,
  payment_history_score integer,
  can_extend_credit boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_balance record;
  v_payment_score integer := 50;
  v_score integer;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  SELECT * INTO STRICT v_balance
  FROM public.calculate_customer_outstanding_balance(customer_id_param,company_id_param);

  SELECT CASE
    WHEN count(*)=0 THEN 50
    ELSE round(100.0*count(*) FILTER (
      WHERE lower(COALESCE(p.payment_status,'')) IN ('completed','paid','succeeded','success')
    )/count(*))::integer
  END INTO v_payment_score
  FROM public.payments p
  WHERE p.customer_id=customer_id_param AND p.company_id=company_id_param
    AND lower(COALESCE(p.payment_status,'')) NOT IN ('cancelled','canceled','void','reversed');

  v_score:=GREATEST(0,LEAST(100,
    v_payment_score-LEAST(v_balance.days_overdue,30)-
    CASE WHEN v_balance.overdue_amount>0 THEN 20 ELSE 0 END
  ));

  RETURN QUERY SELECT
    v_score,
    CASE WHEN v_score>=80 THEN 'low' WHEN v_score>=60 THEN 'medium' ELSE 'high' END,
    v_balance.credit_available,
    v_payment_score,
    (v_score>=60 AND v_balance.overdue_amount=0);
END; $$;

CREATE OR REPLACE FUNCTION public.generate_customer_statement_data(
  customer_id_param uuid,
  company_id_param uuid,
  start_date_param date DEFAULT NULL,
  end_date_param date DEFAULT NULL
) RETURNS TABLE(
  statement_period text,
  opening_balance numeric,
  total_charges numeric,
  total_payments numeric,
  closing_balance numeric,
  transaction_count integer,
  overdue_amount numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_start date:=COALESCE(start_date_param,date_trunc('month',CURRENT_DATE)::date);
  v_end date:=COALESCE(end_date_param,CURRENT_DATE);
  v_opening numeric;
  v_charges numeric;
  v_payments numeric;
  v_count integer;
  v_overdue numeric;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  IF v_end<v_start THEN RAISE EXCEPTION 'Statement end date precedes start date'; END IF;

  SELECT
    COALESCE((SELECT SUM(i.total_amount) FROM public.invoices i
      WHERE i.customer_id=customer_id_param AND i.company_id=company_id_param
        AND i.invoice_date<v_start
        AND lower(COALESCE(i.status,'')) NOT IN ('cancelled','canceled','void','reversed')),0)
    - COALESCE((SELECT SUM(p.amount) FROM public.payments p
      WHERE p.customer_id=customer_id_param AND p.company_id=company_id_param
        AND p.payment_date<v_start
        AND lower(COALESCE(p.payment_status,'')) IN ('completed','paid','succeeded','success')),0)
  INTO v_opening;

  SELECT COALESCE(SUM(i.total_amount),0),count(*)::integer INTO v_charges,v_count
  FROM public.invoices i
  WHERE i.customer_id=customer_id_param AND i.company_id=company_id_param
    AND i.invoice_date BETWEEN v_start AND v_end
    AND lower(COALESCE(i.status,'')) NOT IN ('cancelled','canceled','void','reversed');

  SELECT COALESCE(SUM(p.amount),0),v_count+count(*)::integer INTO v_payments,v_count
  FROM public.payments p
  WHERE p.customer_id=customer_id_param AND p.company_id=company_id_param
    AND p.payment_date BETWEEN v_start AND v_end
    AND lower(COALESCE(p.payment_status,'')) IN ('completed','paid','succeeded','success');

  SELECT b.overdue_amount INTO v_overdue
  FROM public.calculate_customer_outstanding_balance(customer_id_param,company_id_param) b;

  RETURN QUERY SELECT
    v_start::text||' to '||v_end::text,v_opening,v_charges,v_payments,
    v_opening+v_charges-v_payments,v_count,COALESCE(v_overdue,0);
END; $$;

CREATE OR REPLACE FUNCTION public.update_customer_aging_analysis(
  customer_id_param uuid,
  company_id_param uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v record;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  SELECT
    COALESCE(SUM(i.balance_due) FILTER (WHERE i.due_date>=CURRENT_DATE),0) current_amount,
    COALESCE(SUM(i.balance_due) FILTER (WHERE CURRENT_DATE-i.due_date BETWEEN 1 AND 30),0) days_1_30,
    COALESCE(SUM(i.balance_due) FILTER (WHERE CURRENT_DATE-i.due_date BETWEEN 31 AND 60),0) days_31_60,
    COALESCE(SUM(i.balance_due) FILTER (WHERE CURRENT_DATE-i.due_date BETWEEN 61 AND 90),0) days_61_90,
    COALESCE(SUM(i.balance_due) FILTER (WHERE CURRENT_DATE-i.due_date BETWEEN 91 AND 120),0) days_91_120,
    COALESCE(SUM(i.balance_due) FILTER (WHERE CURRENT_DATE-i.due_date>120),0) days_over_120,
    COALESCE(SUM(i.balance_due),0) total_outstanding
  INTO v
  FROM public.invoices i
  WHERE i.customer_id=customer_id_param AND i.company_id=company_id_param
    AND COALESCE(i.balance_due,0)>0
    AND lower(COALESCE(i.status,'')) NOT IN ('cancelled','canceled','void','reversed');

  INSERT INTO public.customer_aging_analysis(
    company_id,customer_id,analysis_date,current_amount,days_1_30,days_31_60,
    days_61_90,days_91_120,days_over_120,total_outstanding
  ) VALUES(
    company_id_param,customer_id_param,CURRENT_DATE,v.current_amount,v.days_1_30,
    v.days_31_60,v.days_61_90,v.days_91_120,v.days_over_120,v.total_outstanding
  ) ON CONFLICT(company_id,customer_id,analysis_date) DO UPDATE SET
    current_amount=EXCLUDED.current_amount,days_1_30=EXCLUDED.days_1_30,
    days_31_60=EXCLUDED.days_31_60,days_61_90=EXCLUDED.days_61_90,
    days_91_120=EXCLUDED.days_91_120,days_over_120=EXCLUDED.days_over_120,
    total_outstanding=EXCLUDED.total_outstanding;
END; $$;

CREATE OR REPLACE FUNCTION public.get_all_customers_outstanding_balance(company_id_param uuid)
RETURNS TABLE(
  customer_id uuid,customer_name text,monthly_rent numeric,total_paid numeric,
  outstanding_balance numeric,months_behind integer,last_payment_date date
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  RETURN QUERY
  SELECT c.id,
    CASE WHEN c.customer_type::text='individual'
      THEN trim(COALESCE(c.first_name_ar,c.first_name,'')||' '||COALESCE(c.last_name_ar,c.last_name,''))
      ELSE COALESCE(c.company_name_ar,c.company_name,'') END,
    COALESCE((SELECT max(ct.monthly_amount) FROM public.contracts ct
      WHERE ct.customer_id=c.id AND ct.company_id=c.company_id AND ct.status='active'),0),
    COALESCE((SELECT sum(p.amount) FROM public.payments p
      WHERE p.customer_id=c.id AND p.company_id=c.company_id
        AND lower(COALESCE(p.payment_status,'')) IN ('completed','paid','succeeded','success')),0),
    COALESCE((SELECT sum(GREATEST(i.balance_due,0)) FROM public.invoices i
      WHERE i.customer_id=c.id AND i.company_id=c.company_id
        AND lower(COALESCE(i.status,'')) NOT IN ('cancelled','canceled','void','reversed')),0),
    COALESCE((SELECT count(DISTINCT date_trunc('month',i.due_date))::integer FROM public.invoices i
      WHERE i.customer_id=c.id AND i.company_id=c.company_id AND i.due_date<CURRENT_DATE
        AND COALESCE(i.balance_due,0)>0),0),
    (SELECT max(p.payment_date) FROM public.payments p
      WHERE p.customer_id=c.id AND p.company_id=c.company_id
        AND lower(COALESCE(p.payment_status,'')) IN ('completed','paid','succeeded','success'))
  FROM public.customers c
  WHERE c.company_id=company_id_param AND c.is_active
    AND EXISTS(SELECT 1 FROM public.invoices i WHERE i.customer_id=c.id
      AND i.company_id=c.company_id AND COALESCE(i.balance_due,0)>0)
  ORDER BY 5 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_vehicles_for_contracts(
  company_id_param uuid,
  contract_start_date date DEFAULT NULL,
  contract_end_date date DEFAULT NULL
) RETURNS TABLE(
  id uuid,plate_number text,make text,model text,year integer,color text,
  status public.vehicle_status,daily_rate numeric,weekly_rate numeric,monthly_rate numeric,
  minimum_rental_price numeric,enforce_minimum_price boolean,company_id uuid
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  RETURN QUERY
  SELECT v.id,v.plate_number,v.make,v.model,v.year,v.color,v.status,v.daily_rate,
    v.weekly_rate,v.monthly_rate,v.minimum_rental_price,v.enforce_minimum_price,v.company_id
  FROM public.vehicles v
  WHERE v.company_id=company_id_param AND v.is_active AND v.status='available'::public.vehicle_status
    AND (contract_start_date IS NULL OR contract_end_date IS NULL OR NOT EXISTS(
      SELECT 1 FROM public.contracts c
      WHERE c.vehicle_id=v.id AND c.company_id=company_id_param
        AND c.status IN ('active','draft')
        AND c.start_date<=contract_end_date AND COALESCE(c.end_date,'infinity'::date)>=contract_start_date
    ))
  ORDER BY v.plate_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_vehicle_total_costs(vehicle_id_param uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company_id uuid; v_maintenance numeric; v_insurance numeric;
BEGIN
  SELECT v.company_id INTO STRICT v_company_id FROM public.vehicles v WHERE v.id=vehicle_id_param;
  PERFORM public.assert_finance_rpc_company_access_v1(v_company_id);
  SELECT COALESCE(SUM(m.actual_cost),0) INTO v_maintenance
  FROM public.vehicle_maintenance m
  WHERE m.vehicle_id=vehicle_id_param AND m.company_id=v_company_id
    AND m.status='completed'::public.maintenance_status;
  SELECT COALESCE(SUM(i.premium_amount),0) INTO v_insurance
  FROM public.vehicle_insurance i WHERE i.vehicle_id=vehicle_id_param AND i.is_active;
  UPDATE public.vehicles SET total_maintenance_cost=v_maintenance,
    total_insurance_cost=v_insurance,total_operating_cost=v_maintenance+v_insurance,
    updated_at=now() WHERE id=vehicle_id_param AND company_id=v_company_id;
END; $$;

CREATE OR REPLACE FUNCTION public.is_aggregate_account(account_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_company_id uuid; v_result boolean;
BEGIN
  SELECT a.company_id,COALESCE(a.is_header,false) OR COALESCE(a.account_level,0)<3
  INTO v_company_id,v_result FROM public.chart_of_accounts a
  WHERE a.id=account_id_param AND a.is_active;
  IF v_company_id IS NULL THEN RETURN false; END IF;
  PERFORM public.assert_finance_rpc_company_access_v1(v_company_id);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_customer_financial_account_fixed(
  customer_id_param uuid,company_id_param uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_customer public.customers%ROWTYPE; v_parent uuid; v_account uuid; v_code text; v_name text;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-account:'||company_id_param,0));
  SELECT ca.account_id INTO v_account FROM public.customer_accounts ca
  WHERE ca.customer_id=customer_id_param AND ca.company_id=company_id_param AND ca.is_active LIMIT 1;
  IF v_account IS NOT NULL THEN RETURN v_account; END IF;
  SELECT * INTO v_customer FROM public.customers c
  WHERE c.id=customer_id_param AND c.company_id=company_id_param AND c.is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer was not found in the selected company'; END IF;
  SELECT a.id INTO v_parent FROM public.chart_of_accounts a
  WHERE a.company_id=company_id_param AND a.is_active AND a.is_header
    AND (a.account_code='1201' OR a.account_name ILIKE '%receivable%')
  ORDER BY (a.account_code='1201') DESC,a.account_level DESC LIMIT 1;
  SELECT '1201'||lpad((COALESCE(max((regexp_match(a.account_code,'([0-9]+)$'))[1]::bigint),0)+1)::text,4,'0')
  INTO v_code FROM public.chart_of_accounts a
  WHERE a.company_id=company_id_param AND a.account_code LIKE '1201%';
  v_name:=CASE WHEN v_customer.customer_type::text='individual'
    THEN trim(COALESCE(v_customer.first_name,'')||' '||COALESCE(v_customer.last_name,''))
    ELSE COALESCE(v_customer.company_name,'Customer') END;
  INSERT INTO public.chart_of_accounts(company_id,account_code,account_name,account_name_ar,
    account_type,account_subtype,balance_type,parent_account_id,account_level,is_header,is_system,
    description,current_balance,is_active,can_link_customers)
  VALUES(company_id_param,v_code,'Customer - '||v_name,'العميل - '||v_name,'assets',
    'accounts_receivable','debit',v_parent,CASE WHEN v_parent IS NULL THEN 3 ELSE 4 END,
    false,false,'Customer receivables account',0,true,true) RETURNING id INTO v_account;
  INSERT INTO public.customer_accounts(company_id,customer_id,account_id,is_default,currency,
    credit_limit,account_purpose,is_active)
  VALUES(company_id_param,customer_id_param,v_account,true,'QAR',COALESCE(v_customer.credit_limit,0),
    'accounts_receivable',true);
  RETURN v_account;
END; $$;

CREATE OR REPLACE FUNCTION public.create_vendor_financial_account(
  vendor_id_param uuid,company_id_param uuid,vendor_data jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_vendor public.vendors%ROWTYPE; v_parent uuid; v_account uuid; v_code text; v_name text;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(company_id_param);
  PERFORM pg_advisory_xact_lock(hashtextextended('vendor-account:'||company_id_param,0));
  SELECT va.account_id INTO v_account FROM public.vendor_accounts va
  WHERE va.vendor_id=vendor_id_param AND va.company_id=company_id_param AND va.account_type='payable' LIMIT 1;
  IF v_account IS NOT NULL THEN RETURN v_account; END IF;
  SELECT * INTO v_vendor FROM public.vendors v
  WHERE v.id=vendor_id_param AND v.company_id=company_id_param AND v.is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor was not found in the selected company'; END IF;
  SELECT a.id INTO v_parent FROM public.chart_of_accounts a
  WHERE a.company_id=company_id_param AND a.is_active AND a.is_header
    AND (a.account_code LIKE '21%' OR a.account_name ILIKE '%payable%')
  ORDER BY a.account_level DESC,a.account_code LIMIT 1;
  IF v_parent IS NULL THEN RAISE EXCEPTION 'Create an active trade-payables header account first'; END IF;
  SELECT '2111-'||lpad((count(*)+1)::text,4,'0') INTO v_code
  FROM public.chart_of_accounts a WHERE a.company_id=company_id_param AND a.parent_account_id=v_parent;
  v_name:=COALESCE(NULLIF(vendor_data->>'vendor_name',''),v_vendor.vendor_name,'Vendor');
  INSERT INTO public.chart_of_accounts(company_id,account_code,account_name,account_name_ar,
    account_type,account_subtype,balance_type,parent_account_id,account_level,is_header,is_system,
    description,current_balance,is_active,can_link_vendors)
  VALUES(company_id_param,v_code,v_name,COALESCE(v_vendor.vendor_name_ar,v_name),'liabilities',
    'accounts_payable','credit',v_parent,LEAST(COALESCE((SELECT account_level FROM public.chart_of_accounts WHERE id=v_parent),2)+1,6),
    false,false,'Vendor payable account',0,true,true) RETURNING id INTO v_account;
  INSERT INTO public.vendor_accounts(company_id,vendor_id,account_id,account_type,is_default)
  VALUES(company_id_param,vendor_id_param,v_account,'payable',true);
  RETURN v_account;
END; $$;

CREATE OR REPLACE FUNCTION public.fix_chart_hierarchy(target_company_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_orphans integer:=0; v_cycles integer:=0; v_levels integer:=0;
BEGIN
  PERFORM public.assert_finance_rpc_company_access_v1(target_company_id);
  UPDATE public.chart_of_accounts a SET parent_account_id=NULL,updated_at=now()
  WHERE a.company_id=target_company_id AND a.parent_account_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.chart_of_accounts p
      WHERE p.id=a.parent_account_id AND p.company_id=target_company_id AND p.is_active);
  GET DIAGNOSTICS v_orphans=ROW_COUNT;
  WITH RECURSIVE ancestry AS (
    SELECT a.id start_id,a.parent_account_id,ARRAY[a.id] path,false cycle
    FROM public.chart_of_accounts a WHERE a.company_id=target_company_id AND a.is_active
    UNION ALL
    SELECT x.start_id,p.parent_account_id,x.path||p.id,p.id=ANY(x.path)
    FROM ancestry x JOIN public.chart_of_accounts p ON p.id=x.parent_account_id
    WHERE NOT x.cycle AND cardinality(x.path)<100 AND p.company_id=target_company_id
  ), cyclic AS (SELECT DISTINCT start_id FROM ancestry WHERE cycle)
  UPDATE public.chart_of_accounts a SET parent_account_id=NULL,updated_at=now()
  WHERE a.company_id=target_company_id AND a.id IN(SELECT start_id FROM cyclic);
  GET DIAGNOSTICS v_cycles=ROW_COUNT;
  SELECT public.recalculate_account_levels(target_company_id) INTO v_levels;
  RETURN json_build_object('success',true,'orphaned_accounts_fixed',v_orphans,
    'circular_references_fixed',v_cycles,'level_corrections',COALESCE(v_levels,0),
    'total_fixes',v_orphans+v_cycles+COALESCE(v_levels,0));
END; $$;

REVOKE ALL ON FUNCTION public.calculate_customer_outstanding_balance(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.check_customer_credit_status(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.generate_customer_statement_data(uuid,uuid,date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.update_customer_aging_analysis(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_all_customers_outstanding_balance(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_available_vehicles_for_contracts(uuid,date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.calculate_vehicle_total_costs(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.is_aggregate_account(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_customer_financial_account_fixed(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_vendor_financial_account(uuid,uuid,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.fix_chart_hierarchy(uuid) FROM PUBLIC,anon;

GRANT EXECUTE ON FUNCTION public.calculate_customer_outstanding_balance(uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.check_customer_credit_status(uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.generate_customer_statement_data(uuid,uuid,date,date) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.update_customer_aging_analysis(uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_all_customers_outstanding_balance(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_available_vehicles_for_contracts(uuid,date,date) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.calculate_vehicle_total_costs(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.is_aggregate_account(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_customer_financial_account_fixed(uuid,uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_vendor_financial_account(uuid,uuid,jsonb) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.fix_chart_hierarchy(uuid) TO authenticated,service_role;
