-- Keep cancelled invoices financially inert. The legacy balance trigger used to
-- restore total_amount after the canonical cancellation function wrote zero.

CREATE OR REPLACE FUNCTION public.ensure_invoice_balance_due()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
     OR lower(COALESCE(NEW.payment_status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted'
     )
  THEN
    NEW.balance_due := 0;
    RETURN NEW;
  END IF;

  IF (NEW.balance_due IS NULL OR NEW.balance_due = 0)
     AND COALESCE(NEW.paid_amount, 0) = 0
  THEN
    NEW.balance_due := NEW.total_amount;
  END IF;

  RETURN NEW;
END;
$$;

DO $repair$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id constant uuid := '14abf10e-299a-43f3-b4bd-28fafce3aea1';
  v_contract_id constant uuid := '662e4640-2b0a-4a21-a05a-b44681f8c1eb';
  v_invoice_ids constant uuid[] := ARRAY[
    '9f5b4fbd-c21b-4da0-8e1c-4445bbe21277',
    'f5748281-f317-48cd-a810-e99e0a1d07fb',
    'e3368ed0-3411-451f-81e6-c1058d932e95',
    'be6761b4-5382-4355-a731-e1a083baf0cd',
    '1dda9aca-f543-43d4-a0dc-24b308c1834d',
    'f47fb39e-b784-48ed-8477-08fc99aec225',
    'eeb075af-7ca6-4cdf-900a-64b2b516c630',
    '370c41dd-3c2f-409c-bc2f-c321727cae83',
    '0d45278c-c1bc-4cbd-8187-46a543c1d2a3',
    '27ee221a-04d4-4fb5-ace2-ec9ff218146c'
  ]::uuid[];
  v_updated integer;
BEGIN
  IF (
    SELECT count(*) FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND invoice.company_id = v_company_id
      AND invoice.customer_id = v_customer_id
      AND lower(invoice.status) = 'cancelled'
      AND lower(invoice.payment_status) = 'cancelled'
      AND invoice.balance_due = invoice.total_amount
  ) <> 10 THEN
    RAISE EXCEPTION 'Precondition failed: Hamza cancelled placeholder balances drifted';
  END IF;

  UPDATE public.invoices invoice
  SET balance_due = 0,
      updated_at = now()
  WHERE invoice.id = ANY(v_invoice_ids)
    AND invoice.company_id = v_company_id
    AND invoice.customer_id = v_customer_id
    AND lower(invoice.status) = 'cancelled'
    AND lower(invoice.payment_status) = 'cancelled';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 10 OR EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND invoice.balance_due <> 0
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: cancelled invoice balances were not normalized';
  END IF;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, new_values, metadata, status, severity, user_name, notes
  ) VALUES (
    v_company_id,
    'cancelled_invoice_zero_balance_invariant_repaired',
    'invoice_trigger',
    v_contract_id,
    'ensure_invoice_balance_due / LTO202437',
    'إصلاح المشغل القديم ليحافظ على رصيد صفري للفواتير الملغاة وتصفير أرصدة فواتير حمزة الوهمية العشر',
    jsonb_build_object('normalized_invoice_ids', to_jsonb(v_invoice_ids), 'balance_due', 0),
    jsonb_build_object('migration_key', '20260901194000_preserve_zero_balance_on_cancelled_invoices'),
    'completed',
    'high',
    'Codex production repair',
    'هذا الإصلاح يمنع عودة قيمة الفاتورة بعد cancel_invoice_with_reversal.'
  );
END;
$repair$;

COMMENT ON FUNCTION public.ensure_invoice_balance_due() IS
'Ensures open unpaid invoices retain their total balance while cancelled or void invoices always retain zero balance_due.';
