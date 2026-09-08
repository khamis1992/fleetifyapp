-- Read-only claim settlement. No invoice, receipt, allocation or case DML.
-- Preserve the reviewed live classification rules and keep public facades invoker.
BEGIN;
CREATE SCHEMA legal_memo_calc_private;
REVOKE ALL ON SCHEMA legal_memo_calc_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA legal_memo_calc_private TO authenticated,service_role;

CREATE FUNCTION legal_memo_calc_private.authorize_company(p_company_id uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $auth$
BEGIN
  IF p_company_id IS NULL THEN RAISE EXCEPTION 'Company is required' USING ERRCODE='22023'; END IF;
  IF coalesce(auth.jwt()->>'role','')='service_role' THEN RETURN; END IF;
  IF auth.uid() IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id
    OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=auth.uid()
      AND p.company_id=p_company_id AND p.is_active IS NOT FALSE) THEN
    RAISE EXCEPTION 'Not authorized to read this company claim' USING ERRCODE='42501';
  END IF;
END;
$auth$;

CREATE FUNCTION legal_memo_calc_private.invoice_paid(p_company_id uuid,p_invoice_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $paid$
DECLARE v_total numeric; v_customer uuid; v_contract uuid; v_paid numeric; v_invalid boolean;
BEGIN
  SELECT i.total_amount,c.customer_id,i.contract_id INTO v_total,v_customer,v_contract
  FROM public.invoices i JOIN public.contracts c ON c.id=i.contract_id AND c.company_id=i.company_id
  WHERE i.company_id=p_company_id AND i.id=p_invoice_id;
  IF NOT FOUND OR v_total IS NULL OR v_total<0 OR v_total::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'Invoice requires reconciliation' USING ERRCODE='22023';
  END IF;
  WITH sources AS (
    SELECT a.amount,
      a.company_id IS DISTINCT FROM p_company_id OR p.company_id IS DISTINCT FROM p_company_id
      OR p.customer_id IS DISTINCT FROM v_customer OR p.transaction_type IS NULL
      OR a.amount IS NULL OR a.amount<=0 OR a.amount::text IN ('NaN','Infinity','-Infinity')
      OR p.amount IS NULL OR p.amount<=0 OR p.amount::text IN ('NaN','Infinity','-Infinity')
      OR EXISTS(SELECT 1 FROM public.payment_allocations x WHERE x.payment_id=p.id AND x.is_active
        AND (x.company_id IS DISTINCT FROM p_company_id OR x.amount IS NULL OR x.amount<=0))
      OR (SELECT coalesce(sum(x.amount),0) FROM public.payment_allocations x WHERE x.payment_id=p.id AND x.is_active)>p.amount
      AS invalid
    FROM public.payment_allocations a JOIN public.payments p ON p.id=a.payment_id
    WHERE a.target_id=p_invoice_id AND a.allocation_type='invoice' AND a.is_active
      AND lower(coalesce(p.payment_status,'')) IN ('completed','paid','success','succeeded')
      AND lower(coalesce(p.transaction_type::text,'receipt'))='receipt'
    UNION ALL
    SELECT p.amount,p.company_id IS DISTINCT FROM p_company_id OR p.customer_id IS DISTINCT FROM v_customer
      OR (p.contract_id IS NOT NULL AND p.contract_id IS DISTINCT FROM v_contract)
      OR p.transaction_type IS NULL OR p.amount IS NULL OR p.amount<=0
      OR p.amount::text IN ('NaN','Infinity','-Infinity')
    FROM public.payments p WHERE p.invoice_id=p_invoice_id
      AND lower(coalesce(p.payment_status,'')) IN ('completed','paid','success','succeeded')
      AND lower(coalesce(p.transaction_type::text,'receipt'))='receipt'
      AND NOT EXISTS(SELECT 1 FROM public.payment_allocations a WHERE a.payment_id=p.id AND a.is_active)
  ) SELECT coalesce(sum(amount),0),coalesce(bool_or(invalid),false) INTO v_paid,v_invalid FROM sources;
  IF v_invalid OR v_paid>v_total OR v_paid<>round(v_paid,2) OR EXISTS(
    SELECT 1 FROM public.payment_allocations a LEFT JOIN public.payments p ON p.id=a.payment_id
    WHERE a.target_id=p_invoice_id AND a.allocation_type='invoice' AND a.is_active AND p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Invoice receipts require reconciliation' USING ERRCODE='22023';
  END IF;
  RETURN v_paid;
END;
$paid$;

DO $install$
DECLARE v_name text; v_oid regprocedure; v_original text; v_updated text; v_alias text; v_pattern text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['calculate_legal_claim_breakdown_v3','calculate_legal_claim_statement_v4'] LOOP
    v_oid:=CASE WHEN v_name='calculate_legal_claim_breakdown_v3'
      THEN 'public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)'::regprocedure
      ELSE 'public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure END;
    IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=v_oid) IS DISTINCT FROM
      CASE WHEN v_name='calculate_legal_claim_breakdown_v3' THEN '5c5211093c5cd8d6fae58618cde44462'
      ELSE '5ca5b12767113a97b0e841198b878357' END THEN
      RAISE EXCEPTION 'Claim engine changed since review: %',v_name;
    END IF;
    v_original:=pg_get_functiondef(v_oid);
    -- Backup is private and non-executable by API roles. Rollback restores this exact body.
    EXECUTE replace(v_original,'public.'||v_name||'(', 'legal_memo_calc_private.before_'||v_name||'(');
    v_updated:=replace(v_original,'public.'||v_name||'(', 'legal_memo_calc_private.'||v_name||'(');
    v_alias:=CASE WHEN v_name='calculate_legal_claim_breakdown_v3' THEN 'i' ELSE 'invoice' END;
    v_pattern:='COALESCE\('||v_alias||'\.balance_due,\s*'||v_alias||'\.total_amount - COALESCE\('||v_alias||'\.paid_amount, 0\)\)';
    v_updated:=regexp_replace(v_updated,v_pattern,
      '('||v_alias||'.total_amount - legal_memo_calc_private.invoice_paid(p_company_id,'||v_alias||'.id))','g');
    IF v_updated=replace(v_original,'public.'||v_name||'(', 'legal_memo_calc_private.'||v_name||'(')
      OR strpos(v_updated,v_alias||'.balance_due')>0 THEN RAISE EXCEPTION 'Incomplete settlement patch'; END IF;
    IF v_name='calculate_legal_claim_statement_v4' THEN
      v_updated:=replace(v_updated,'        invoice.invoice_number,',
        '        invoice.invoice_number, invoice.total_amount AS gross_amount,
        legal_memo_calc_private.invoice_paid(p_company_id,invoice.id) AS counted_payments,
        coalesce(invoice.invoice_month,invoice.due_date) AS billing_month,');
      v_updated:=replace(v_updated,$old$            'due_date', due_date,$old$,
        $new$            'due_date', due_date, 'invoice_month', billing_month,
            'total_amount', gross_amount, 'paid_amount', counted_payments,$new$);
      v_updated:=replace(v_updated,$old$      'version', 'v4',$old$,
        $new$      'version', 'v4', 'settlement_source', 'completed_receipt_allocations_v1',
      'extension_start_date', final.value->'extension_start_date',$new$);
      IF strpos(v_updated,'''paid_amount'', counted_payments')=0
        OR strpos(v_updated,'''settlement_source''')=0 THEN RAISE EXCEPTION 'Missing disclosed settlement metadata'; END IF;
    END IF;
    EXECUTE v_updated;
  END LOOP;
END;
$install$;

CREATE FUNCTION legal_memo_calc_private.read_breakdown(p_company_id uuid,p_contract_id uuid,p_as_of_date date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $gateway$
BEGIN
  PERFORM legal_memo_calc_private.authorize_company(p_company_id);
  RETURN legal_memo_calc_private.calculate_legal_claim_breakdown_v3(p_company_id,p_contract_id,p_as_of_date);
END;
$gateway$;
CREATE FUNCTION legal_memo_calc_private.read_statement(p_company_id uuid,p_contract_id uuid,p_as_of_date date,p_claim_scope text,p_excluded_invoice_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $gateway$
BEGIN
  PERFORM legal_memo_calc_private.authorize_company(p_company_id);
  RETURN legal_memo_calc_private.calculate_legal_claim_statement_v4(p_company_id,p_contract_id,p_as_of_date,p_claim_scope,p_excluded_invoice_ids);
END;
$gateway$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA legal_memo_calc_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION legal_memo_calc_private.read_breakdown(uuid,uuid,date),
  legal_memo_calc_private.read_statement(uuid,uuid,date,text,uuid[]) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_breakdown_v3(p_company_id uuid,p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date))
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $facade$
  SELECT legal_memo_calc_private.read_breakdown(p_company_id,p_contract_id,p_as_of_date);
$facade$;
CREATE OR REPLACE FUNCTION public.calculate_legal_claim_statement_v4(p_company_id uuid,p_contract_id uuid,
  p_as_of_date date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date),
  p_claim_scope text DEFAULT 'full_outstanding',p_excluded_invoice_ids uuid[] DEFAULT ARRAY[]::uuid[])
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $facade$
  SELECT legal_memo_calc_private.read_statement(p_company_id,p_contract_id,p_as_of_date,p_claim_scope,p_excluded_invoice_ids);
$facade$;
COMMIT;
