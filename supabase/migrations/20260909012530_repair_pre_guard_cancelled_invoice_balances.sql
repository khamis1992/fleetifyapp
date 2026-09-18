BEGIN;
-- These invoices were cancelled on 2026-08-30 before the balance guard was
-- fixed on 2026-09-01. Do not cancel anything anew or alter receipts/journals.
DO $repair$
DECLARE
  company constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  repair_key constant text := 'repair_pre_guard_cancelled_invoice_balances';
  target record; after_row jsonb; repaired integer := 0; total_balance numeric := 0;
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.ensure_invoice_balance_due()'::regprocedure)
    IS DISTINCT FROM '256815f44cab5fd357202578f04f2e18' THEN
    RAISE EXCEPTION 'Invoice balance guard changed since audit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.invoices'::regclass
    AND tgname='trg_ensure_invoice_balance_due' AND tgenabled='O') THEN
    RAISE EXCEPTION 'Invoice balance guard is not enabled';
  END IF;
  IF EXISTS (SELECT 1 FROM public.audit_logs WHERE company_id=company AND action=repair_key) THEN
    RAISE EXCEPTION 'This historical balance repair has already been recorded';
  END IF;
  FOR target IN
    SELECT i.* FROM public.invoices i
    WHERE i.company_id=company AND i.status='cancelled' AND i.payment_status='unpaid'
      AND i.paid_amount=0 AND i.balance_due=i.total_amount AND i.balance_due>0.01
      AND i.updated_at='2026-08-30T22:53:56.014306+00:00'::timestamptz
      AND strpos(i.notes,'Cancelled through approved reversal:')>0
    ORDER BY i.id FOR UPDATE
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.journal_entries j
      LEFT JOIN public.journal_entries reversal ON reversal.id=j.reversal_entry_id AND reversal.company_id=j.company_id
      WHERE j.id=target.journal_entry_id AND j.company_id=company
        AND j.reference_type='invoice' AND j.reference_id=target.id
        AND (j.status IN ('reversed','cancelled') OR reversal.status='posted')) THEN
      RAISE EXCEPTION 'Cancelled invoice accounting provenance changed: %',target.id;
    END IF;
    IF EXISTS (SELECT 1 FROM public.payment_allocations a WHERE a.company_id=company
      AND a.target_id=target.id AND a.allocation_type='invoice' AND a.is_active) THEN
      RAISE EXCEPTION 'Cancelled invoice has active allocations: %',target.id;
    END IF;
    UPDATE public.invoices SET balance_due=0 WHERE id=target.id AND company_id=company;
    SELECT to_jsonb(i) INTO after_row FROM public.invoices i WHERE i.id=target.id AND i.company_id=company;
    IF after_row->>'balance_due' IS NULL OR (after_row->>'balance_due')::numeric<>0
      OR (after_row-'balance_due'-'updated_at') IS DISTINCT FROM (to_jsonb(target)-'balance_due'-'updated_at') THEN
      RAISE EXCEPTION 'Unexpected change beyond cached balance: %',target.id;
    END IF;
    INSERT INTO public.audit_logs(company_id,action,resource_type,resource_id,old_values,new_values,
      changes_summary,status,severity,user_name,metadata)
    VALUES(company,repair_key,'invoice',target.id,to_jsonb(target),after_row,
      'تصحيح رصيد مخزن لفاتورة ملغاة سابقاً مع حفظ الدفعات وقيود الإلغاء','completed','medium','Codex audited repair',
      jsonb_build_object('source','pre_guard_cancellation','balance_only',true));
    repaired:=repaired+1; total_balance:=total_balance+target.balance_due;
  END LOOP;
  IF repaired<>23 OR total_balance<>35760 THEN
    RAISE EXCEPTION 'Historical cancellation scope changed: % invoices / % QAR',repaired,total_balance;
  END IF;
END;
$repair$;
COMMIT;
