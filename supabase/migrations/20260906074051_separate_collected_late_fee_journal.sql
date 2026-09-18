BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.invoice_fee_payment_context') IS NULL
    OR to_regprocedure('public.create_invoice_payment_with_late_fee_v2(uuid,uuid,numeric,numeric,uuid,date,text,text,text,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Install the replay-safe fee command and principal guard before changing receipt posting';
  END IF;
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.create_payment_receipt_journal(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid)'))
    IS DISTINCT FROM '5f8ce69bb7149a64ccd441dd699a11bd'
    OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('public.trg_payment_journal_entry_fn()'))
    IS DISTINCT FROM '451868d045e2cf8f5730a6a3dd7b54f0' THEN
    RAISE EXCEPTION 'Receipt posting differs from the inspected schema; review before replacing helpers';
  END IF;
END;
$preflight$;

-- Local proposal: recognize separately assessed, unaccrued fees on collection.
-- No historical journals/assessments are rewritten and no company is auto-mapped.
-- Configure LATE_FEE_REVENUE explicitly before enabling fee collection.
INSERT INTO public.default_account_types(type_code,type_name,type_name_ar,account_category,description,is_system)
SELECT 'LATE_FEE_REVENUE','Collected late fee revenue','إيرادات رسوم التأخير المحصّلة','revenue',
  'Separately assessed late fees recognized on collection; excludes rental principal.',true
WHERE NOT EXISTS (SELECT 1 FROM public.default_account_types WHERE type_code='LATE_FEE_REVENUE');

CREATE FUNCTION public.resolve_receipt_posting_account_v1(p_company_id uuid,p_type_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_accounts uuid[]; v_valid integer; v_category text; v_balance text;
BEGIN
  IF p_type_code NOT IN ('CASH','BANK','RECEIVABLES','CUSTOMER_ADVANCES','LATE_FEE_REVENUE') THEN
    RAISE EXCEPTION 'Unsupported receipt posting mapping' USING ERRCODE='22023';
  END IF;
  v_category := CASE p_type_code WHEN 'CUSTOMER_ADVANCES' THEN 'liabilities'
    WHEN 'LATE_FEE_REVENUE' THEN 'revenue' ELSE 'assets' END;
  v_balance := CASE WHEN v_category='assets' THEN 'debit' ELSE 'credit' END;
  SELECT array_agg(DISTINCT m.chart_of_accounts_id), count(*) FILTER (WHERE
    a.company_id=p_company_id AND a.is_active AND a.is_header=false AND a.account_level>=3
    AND lower(a.account_type)=v_category AND lower(a.balance_type)=v_balance)
  INTO v_accounts,v_valid
  FROM public.account_mappings m
  JOIN public.default_account_types t ON t.id=m.default_account_type_id
  LEFT JOIN public.chart_of_accounts a ON a.id=m.chart_of_accounts_id
  WHERE m.company_id=p_company_id AND m.is_active AND t.type_code=p_type_code;
  IF coalesce(cardinality(v_accounts),0)<>1 OR v_valid=0 OR v_accounts[1] IS NULL THEN
    RAISE EXCEPTION 'Required % posting mapping is missing, ambiguous or invalid',p_type_code
      USING ERRCODE='23514';
  END IF;
  RETURN v_accounts[1];
END;
$function$;

CREATE FUNCTION public.create_payment_receipt_journal_v2(
  p_payment_id uuid,p_company_id uuid,p_payment_number text,p_payment_date date,
  p_amount numeric,p_payment_method text,p_invoice_id uuid,p_account_id uuid,
  p_actor_id uuid,p_cost_center_id uuid,p_late_fee_amount numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE
  v_journal_id uuid; v_cash uuid; v_offset uuid; v_fee uuid; v_principal numeric;
  v_existing_count integer; v_existing public.journal_entries%ROWTYPE;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL OR p_payment_date IS NULL
    OR p_amount IS NULL OR p_late_fee_amount IS NULL
    OR p_amount::text IN ('NaN','Infinity','-Infinity')
    OR p_late_fee_amount::text IN ('NaN','Infinity','-Infinity')
    OR p_amount<>round(p_amount,2) OR p_late_fee_amount<>round(p_late_fee_amount,2)
    OR p_amount<=0 OR p_late_fee_amount<0 OR p_late_fee_amount>p_amount
    OR (p_late_fee_amount>0 AND p_invoice_id IS NULL) THEN
    RAISE EXCEPTION 'Valid receipt identity and principal/fee amounts are required' USING ERRCODE='22023';
  END IF;
  v_principal := p_amount-p_late_fee_amount;
  -- Serialize helper callers as well as the invoice command; never duplicate a journal.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'receipt-journal:'||p_company_id::text||':'||p_payment_id::text,0));
  SELECT count(*) INTO v_existing_count FROM public.journal_entries
  WHERE company_id=p_company_id AND reference_type='payment' AND reference_id=p_payment_id;
  IF v_existing_count>1 THEN
    RAISE EXCEPTION 'Receipt has multiple journals; reconcile before posting' USING ERRCODE='23514';
  ELSIF v_existing_count=1 THEN
    SELECT * INTO v_existing FROM public.journal_entries
    WHERE company_id=p_company_id AND reference_type='payment' AND reference_id=p_payment_id;
    IF v_existing.status<>'posted' OR v_existing.entry_date IS DISTINCT FROM p_payment_date
      OR v_existing.total_debit IS DISTINCT FROM p_amount OR v_existing.total_credit IS DISTINCT FROM p_amount
      OR (SELECT count(*)<2 OR coalesce(sum(debit_amount),0)<>p_amount OR coalesce(sum(credit_amount),0)<>p_amount
          FROM public.journal_entry_lines WHERE journal_entry_id=v_existing.id) THEN
      RAISE EXCEPTION 'Receipt journal does not match its recorded payment' USING ERRCODE='23514';
    END IF;
    RETURN v_existing.id;
  END IF;
  PERFORM public.assert_financial_period_is_open(p_company_id,p_payment_date);
  IF p_invoice_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.invoices WHERE id=p_invoice_id AND company_id=p_company_id
  ) THEN RAISE EXCEPTION 'Invoice does not belong to receipt company' USING ERRCODE='23514'; END IF;
  IF p_cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers WHERE id=p_cost_center_id AND company_id=p_company_id AND coalesce(is_active,true)
  ) THEN RAISE EXCEPTION 'Cost center does not belong to receipt company or is inactive' USING ERRCODE='23514'; END IF;
  IF p_account_id IS NOT NULL THEN
    SELECT id INTO v_cash FROM public.chart_of_accounts WHERE id=p_account_id AND company_id=p_company_id
      AND is_active AND is_header=false AND account_level>=3 AND lower(account_type)='assets' AND lower(balance_type)='debit';
    IF v_cash IS NULL THEN RAISE EXCEPTION 'Selected receipt account is not an active posting asset' USING ERRCODE='23514'; END IF;
  ELSE
    v_cash := public.resolve_receipt_posting_account_v1(p_company_id,
      CASE WHEN public.payment_method_uses_bank(p_payment_method) THEN 'BANK' ELSE 'CASH' END);
  END IF;
  IF v_principal>0 THEN
    v_offset := public.resolve_receipt_posting_account_v1(p_company_id,
      CASE WHEN p_invoice_id IS NULL THEN 'CUSTOMER_ADVANCES' ELSE 'RECEIVABLES' END);
  END IF;
  IF p_late_fee_amount>0 THEN
    v_fee := public.resolve_receipt_posting_account_v1(p_company_id,'LATE_FEE_REVENUE');
  END IF;
  IF v_cash=v_offset OR v_cash=v_fee OR v_offset=v_fee THEN
    RAISE EXCEPTION 'Receipt debit, principal and fee accounts must be distinct' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.journal_entries(company_id,entry_number,entry_date,description,total_debit,total_credit,
    status,reference_type,reference_id,created_by,created_at,updated_at)
  VALUES(p_company_id,'JE-PAY-'||p_payment_id::text,p_payment_date,
    'Payment receipt: '||coalesce(p_payment_number,p_payment_id::text),p_amount,p_amount,
    'draft','payment',p_payment_id,p_actor_id,now(),now()) RETURNING id INTO v_journal_id;
  INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,line_number,line_description,debit_amount,credit_amount,cost_center_id)
  VALUES(v_journal_id,v_cash,1,'Payment received',p_amount,0,p_cost_center_id);
  IF v_principal>0 THEN
    INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,line_number,line_description,debit_amount,credit_amount,cost_center_id)
    VALUES(v_journal_id,v_offset,2,CASE WHEN p_invoice_id IS NULL THEN 'Customer advance' ELSE 'Rental principal settlement' END,
      0,v_principal,p_cost_center_id);
  END IF;
  IF p_late_fee_amount>0 THEN
    INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,line_number,line_description,debit_amount,credit_amount,cost_center_id)
    VALUES(v_journal_id,v_fee,CASE WHEN v_principal>0 THEN 3 ELSE 2 END,'Collected late fee revenue',0,p_late_fee_amount,p_cost_center_id);
  END IF;
  UPDATE public.journal_entries SET status='posted',posted_by=p_actor_id,posted_at=now(),updated_at=now()
  WHERE id=v_journal_id AND company_id=p_company_id;
  RETURN v_journal_id;
END;
$function$;

-- Preserve old helper signature for existing payment/repair callers. Before-insert
-- triggers cannot query the new payment yet, so they pass NEW.late_fee_amount below.
CREATE OR REPLACE FUNCTION public.create_payment_receipt_journal(
  p_payment_id uuid,p_company_id uuid,p_payment_number text,p_payment_date date,p_amount numeric,
  p_payment_method text,p_invoice_id uuid,p_account_id uuid,p_actor_id uuid,p_cost_center_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  RETURN public.create_payment_receipt_journal_v2(p_payment_id,p_company_id,p_payment_number,p_payment_date,
    p_amount,p_payment_method,p_invoice_id,p_account_id,p_actor_id,p_cost_center_id,
    coalesce((SELECT late_fee_amount FROM public.payments WHERE id=p_payment_id AND company_id=p_company_id),0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_payment_journal_entry_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
BEGIN
  IF lower(coalesce(NEW.payment_status,'')) NOT IN ('completed','paid','success','succeeded')
    OR lower(coalesce(NEW.transaction_type::text,'receipt'))<>'receipt' OR NEW.journal_entry_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  NEW.journal_entry_id := public.create_payment_receipt_journal_v2(NEW.id,NEW.company_id,NEW.payment_number,
    NEW.payment_date,NEW.amount,NEW.payment_method,NEW.invoice_id,NEW.account_id,NEW.created_by,
    NEW.cost_center_id,coalesce(NEW.late_fee_amount,0));
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.resolve_receipt_posting_account_v1(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_payment_receipt_journal_v2(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid,numeric) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_payment_receipt_journal(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.trg_payment_journal_entry_fn() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_receipt_posting_account_v1(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_payment_receipt_journal_v2(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_payment_receipt_journal(uuid,uuid,text,date,numeric,text,uuid,uuid,uuid,uuid) TO service_role;
COMMIT;
