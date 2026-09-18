-- Transaction-local maintenance helper. Runs with the migration connection's privileges.
-- No RPC grants, JWT impersonation, posted-entry edits or receipt deletions.
CREATE OR REPLACE FUNCTION pg_temp.reissue_reviewed_unpaid_rental_invoice(
 p_company uuid,p_contract uuid,p_number text,p_expected numeric,p_correct numeric,p_reason text)
RETURNS jsonb LANGUAGE plpgsql AS $helper$
DECLARE i public.invoices%ROWTYPE;s public.contract_payment_schedules%ROWTYPE;j public.journal_entries%ROWTYPE;
 before_i jsonb;before_s jsonb;new_id uuid;reversal_id uuid;
 prior text:=COALESCE(current_setting('app.financial_controls_bypass',true),'');
BEGIN
 IF p_correct<=0 OR p_expected<=0 OR length(btrim(p_reason))<10 THEN RAISE EXCEPTION 'Invalid reviewed correction'; END IF;
 SELECT * INTO STRICT i FROM public.invoices WHERE company_id=p_company AND contract_id=p_contract AND invoice_number=p_number FOR UPDATE;
 PERFORM 1 FROM public.contracts WHERE company_id=p_company AND id=p_contract FOR UPDATE;
 SELECT * INTO STRICT s FROM public.contract_payment_schedules WHERE company_id=p_company AND contract_id=p_contract
  AND invoice_id=i.id AND public.financial_record_is_active_v1(status) FOR UPDATE;
 IF i.total_amount<>p_expected OR i.paid_amount<>0 OR i.penalty_id IS NOT NULL OR i.invoice_type NOT IN('sales','service')
  OR NOT public.financial_record_is_active_v1(i.status) OR NOT public.financial_record_is_active_v1(i.payment_status)
  OR s.amount<>p_expected OR s.due_date<>i.invoice_month OR s.paid_amount<>0
  OR public.canonical_invoice_paid_amount(i.id,NULL)<>0
  OR EXISTS(SELECT 1 FROM public.payments p WHERE p.company_id=p_company AND p.invoice_id=i.id)
  OR EXISTS(SELECT 1 FROM public.payment_allocations a WHERE a.company_id=p_company AND a.target_id=i.id)
  OR NOT public.system_invoice_has_single_balanced_posted_journal(p_company,i.id,p_expected) THEN
  RAISE EXCEPTION 'Invoice % no longer matches the reviewed unpaid state',p_number;
 END IF;
 SELECT * INTO STRICT j FROM public.journal_entries WHERE id=i.journal_entry_id AND company_id=p_company FOR UPDATE;
 IF j.status<>'posted' OR j.reversal_entry_id IS NOT NULL THEN RAISE EXCEPTION 'Original journal already changed'; END IF;
 -- Validate both accounting dates before enabling the normal internal write flag.
 PERFORM set_config('app.financial_controls_bypass','off',true);
 PERFORM public.assert_financial_period_is_open(p_company,CURRENT_DATE);
 PERFORM public.assert_financial_period_is_open(p_company,i.invoice_month);
 before_i:=to_jsonb(i);before_s:=to_jsonb(s);
 PERFORM set_config('app.financial_controls_bypass','on',true);
 INSERT INTO public.journal_entries(company_id,entry_number,entry_date,reference_type,reference_id,description,total_debit,total_credit,status)
 VALUES(p_company,'REV-JE-'||j.id::text,CURRENT_DATE,'journal_reversal',j.id,p_reason,j.total_credit,j.total_debit,'draft')
 RETURNING id INTO reversal_id;
 INSERT INTO public.journal_entry_lines(journal_entry_id,account_id,debit_amount,credit_amount,line_description,line_number,cost_center_id,asset_id,employee_id)
 SELECT reversal_id,l.account_id,l.credit_amount,l.debit_amount,p_reason,row_number() OVER(ORDER BY l.line_number,l.id),l.cost_center_id,l.asset_id,l.employee_id
 FROM public.journal_entry_lines l WHERE l.journal_entry_id=j.id;
 UPDATE public.journal_entries SET status='posted',posted_at=now(),updated_at=now() WHERE id=reversal_id AND company_id=p_company;
 IF NOT public.journal_entries_are_exact_reversals(j.id,reversal_id) THEN RAISE EXCEPTION 'Correction reversal does not exactly offset original'; END IF;
 UPDATE public.journal_entries SET status='reversed',reversal_entry_id=reversal_id,reversed_at=now(),updated_at=now() WHERE id=j.id AND company_id=p_company;
 UPDATE public.invoices SET status='cancelled',payment_status='cancelled',paid_amount=0,balance_due=0,
  notes=concat_ws(E'\n',NULLIF(notes,''),'Cancelled through approved reversal: '||p_reason,'Reversal entry: '||reversal_id::text),updated_at=now()
 WHERE id=i.id AND company_id=p_company;
 UPDATE public.contract_payment_schedules SET invoice_id=NULL,amount=p_correct,paid_amount=0,paid_date=NULL,
  financial_hold_reason=NULL,cancelled_invoice_id=i.id,updated_at=now()
 WHERE id=s.id AND company_id=p_company;
 PERFORM set_config('app.financial_controls_bypass',prior,true);
 new_id:=public.system_generate_invoice_for_contract_month_core(p_contract,i.invoice_month);
 IF new_id IS NULL OR NOT public.system_invoice_has_single_balanced_posted_journal(p_company,new_id,p_correct) THEN
  RAISE EXCEPTION 'Replacement invoice is missing its exact balanced journal';
 END IF;
 UPDATE public.invoices SET notes=concat_ws(E'\n',notes,p_reason,'Replaces invoice: '||i.invoice_number),updated_at=now()
 WHERE id=new_id AND company_id=p_company;
 UPDATE public.contract_payment_schedules SET notes=concat_ws(E'\n',NULLIF(notes,''),p_reason),updated_at=now()
 WHERE id=s.id AND company_id=p_company;
 RETURN jsonb_build_object('original_invoice_id',i.id,'replacement_invoice_id',new_id,'reversal_journal_id',reversal_id,
  'before_invoice',before_i,'before_schedule',before_s,
  'after_invoice',(SELECT to_jsonb(x) FROM public.invoices x WHERE x.company_id=p_company AND x.id=i.id),
  'replacement_invoice',(SELECT to_jsonb(x) FROM public.invoices x WHERE x.company_id=p_company AND x.id=new_id),
  'after_schedule',(SELECT to_jsonb(x) FROM public.contract_payment_schedules x WHERE x.company_id=p_company AND x.id=s.id));
EXCEPTION WHEN OTHERS THEN PERFORM set_config('app.financial_controls_bypass',prior,true);RAISE;
END;$helper$;

