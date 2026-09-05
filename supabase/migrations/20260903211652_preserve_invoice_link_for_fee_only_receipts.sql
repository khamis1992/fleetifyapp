BEGIN;

-- Preserve existing synchronization, locks, flags and ACLs. Refuse schema drift.
DO $patch$
DECLARE
  v_definition text;
  v_source text;
  v_anchor text := E'  PERFORM set_config(''app.financial_controls_bypass'', ''on'', true);';
  v_addition text := $addition$  -- fee_only_invoice_link_v1:start
  IF v_invoice_count = 0 AND v_status = 'fully_allocated'
     AND lower(COALESCE(v_payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
     AND lower(v_payment.transaction_type::text) = 'receipt' THEN
    -- LEFT JOIN + equal counts is intentional: an invalid allocation must not
    -- disappear from the evidence and leave a seemingly unambiguous invoice.
    SELECT (array_agg(invoice.id ORDER BY invoice.id))[1]
    INTO v_primary_invoice_id
    FROM public.payment_allocations allocation
    LEFT JOIN public.late_fees fee ON fee.id = allocation.target_id
      AND allocation.allocation_type = 'late_fee' AND allocation.amount > 0
      AND allocation.company_id = v_payment.company_id
      AND fee.company_id = v_payment.company_id
      AND fee.contract_id IS NOT DISTINCT FROM v_payment.contract_id
    LEFT JOIN public.invoices invoice ON invoice.id = fee.invoice_id
      AND invoice.company_id = v_payment.company_id
      AND invoice.contract_id IS NOT DISTINCT FROM v_payment.contract_id
      AND invoice.customer_id IS NOT DISTINCT FROM v_payment.customer_id
    WHERE allocation.payment_id = p_payment_id AND allocation.is_active = true
    HAVING count(*) > 0 AND count(*) = count(invoice.id)
      AND count(DISTINCT invoice.id) = 1;
  END IF;
  -- fee_only_invoice_link_v1:end

$addition$;
BEGIN
  SELECT replace(pg_get_functiondef(oid), E'\r\n', E'\n'),
    replace(prosrc, E'\r\n', E'\n') INTO v_definition, v_source
  FROM pg_proc WHERE oid = 'public.sync_payment_allocation_state(uuid)'::regprocedure;
  IF md5(v_source) <> 'ce8a7175fe46f375080b854ed2f62fd5'
     OR (length(v_definition) - length(replace(v_definition, v_anchor, ''))) / length(v_anchor) <> 1 THEN
    RAISE EXCEPTION 'Allocation synchronization changed; review fee-only invoice link patch';
  END IF;
  EXECUTE replace(v_definition, v_anchor, v_addition || v_anchor);
END;
$patch$;

COMMIT;
