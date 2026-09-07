BEGIN;

-- Collection facts are completed receipts, never cumulative receipt documents.
-- One SQL snapshot, explicit company/currency scope, invoker RLS, no writes.
CREATE FUNCTION public.get_customer_collection_summary_v1(p_company_id uuid, p_as_of date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_company_id IS NULL OR p_as_of IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies WHERE id=p_company_id
  ) OR (current_user NOT IN ('postgres','service_role') AND NOT coalesce(
    auth.uid() IS NOT NULL AND (public.get_user_company(auth.uid())=p_company_id OR public.is_super_admin(auth.uid())),false
  )) THEN RAISE EXCEPTION 'Company reporting access required' USING ERRCODE='42501'; END IF;

  WITH completed_payments AS MATERIALIZED (
    SELECT p.* FROM public.payments p
    WHERE p.company_id=p_company_id
      AND p.payment_date<=p_as_of AND upper(coalesce(p.currency,'QAR'))='QAR'
      AND lower(coalesce(p.payment_status,'')) IN ('completed','paid','success','succeeded')
      AND lower(coalesce(p.transaction_type::text,'receipt'))='receipt'
  ), allocation_owners AS (
    -- A unique invoice-allocation owner can fill missing historical pointers.
    -- Ambiguous cross-customer allocations never choose an arbitrary customer.
    SELECT a.payment_id,(array_agg(DISTINCT i.customer_id))[1] customer_id
    FROM public.payment_allocations a JOIN completed_payments p ON p.id=a.payment_id
    JOIN public.invoices i ON i.id=a.target_id AND i.company_id=p_company_id
    WHERE a.company_id=p_company_id AND a.is_active AND a.allocation_type='invoice'
    GROUP BY a.payment_id HAVING count(DISTINCT i.customer_id)=1 AND count(*)=count(i.customer_id)
  ), receipts AS MATERIALIZED (
    SELECT p.id,p.company_id,coalesce(p.customer_id,i.customer_id,o.customer_id) customer_id,
      p.invoice_id,p.payment_date,p.amount
    FROM completed_payments p LEFT JOIN public.invoices i
      ON i.id=p.invoice_id AND i.company_id=p_company_id
    LEFT JOIN allocation_owners o ON o.payment_id=p.id
    WHERE coalesce(p.customer_id,i.customer_id,o.customer_id) IS NOT NULL
  ), allocations AS (
    SELECT a.payment_id,count(*) count,sum(a.amount) total,
      coalesce(sum(a.amount) FILTER (WHERE
        (a.allocation_type='invoice' AND i.id IS NOT NULL AND i.penalty_id IS NULL
          AND i.contract_id IS NOT NULL AND lower(coalesce(i.status,'')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive'))
        OR (a.allocation_type='contract' AND c.id IS NOT NULL)),0) rent,
      coalesce(sum(a.amount) FILTER (WHERE a.allocation_type='late_fee' AND f.id IS NOT NULL),0) fines,
      count(*) FILTER (WHERE a.company_id IS DISTINCT FROM p.company_id OR a.amount<=0 OR a.amount IS NULL) invalid
    FROM public.payment_allocations a JOIN receipts p ON p.id=a.payment_id
    LEFT JOIN public.invoices i ON a.allocation_type='invoice' AND i.id=a.target_id AND i.company_id=p_company_id
      AND i.invoice_type IN ('sales','service') AND upper(coalesce(i.currency,'QAR'))='QAR'
    LEFT JOIN public.contracts c ON a.allocation_type='contract' AND c.id=a.target_id AND c.company_id=p_company_id
    LEFT JOIN public.late_fees f ON a.allocation_type='late_fee' AND f.id=a.target_id AND f.company_id=p_company_id
    WHERE a.is_active GROUP BY a.payment_id
  ), classified AS (
    SELECT p.id,p.customer_id,p.payment_date,p.amount total,
      CASE WHEN a.count IS NOT NULL THEN a.rent
        WHEN i.id IS NOT NULL AND i.contract_id IS NOT NULL AND i.penalty_id IS NULL
          AND lower(coalesce(i.status,'')) NOT IN ('cancelled','canceled','void','voided','deleted','inactive') THEN p.amount ELSE 0 END rent,
      coalesce(a.fines,0) fines,
      CASE WHEN a.count IS NOT NULL THEN greatest(p.amount-a.total,0)
        WHEN p.invoice_id IS NULL THEN p.amount ELSE 0 END advances,
      coalesce(a.invalid,0)>0 OR coalesce(a.total,0)>p.amount+0.01
        OR p.amount IS NULL OR p.amount<0 OR p.amount::text IN ('NaN','Infinity','-Infinity') invalid
    FROM receipts p LEFT JOIN allocations a ON a.payment_id=p.id
    LEFT JOIN public.invoices i ON i.id=p.invoice_id AND i.company_id=p_company_id
      AND i.invoice_type IN ('sales','service') AND upper(coalesce(i.currency,'QAR'))='QAR'
  ), monthly AS (
    SELECT to_char(payment_date,'YYYY-MM') month_key,sum(total) total,sum(rent) rent,sum(fines) fines,
      sum(advances) advances,sum(total-rent-fines-advances) other,count(*) count
    FROM classified GROUP BY to_char(payment_date,'YYYY-MM')
  ), principal AS (
    SELECT a.target_id invoice_id,a.amount FROM public.payment_allocations a JOIN completed_payments p ON p.id=a.payment_id
    WHERE a.is_active AND a.allocation_type='invoice' AND a.company_id=p_company_id
    UNION ALL
    SELECT p.invoice_id,p.amount FROM completed_payments p WHERE p.invoice_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.payment_allocations a WHERE a.payment_id=p.id AND a.is_active)
  ), invoice_paid AS (SELECT invoice_id,sum(amount) amount FROM principal GROUP BY invoice_id),
  open_invoices AS (
    SELECT i.id invoice_id,i.customer_id,i.invoice_number,i.due_date,
      greatest(i.total_amount-coalesce(p.amount,0),0) balance,
      coalesce(p.amount,0)>0.01 partial
    FROM public.invoices i LEFT JOIN invoice_paid p ON p.invoice_id=i.id
    WHERE i.company_id=p_company_id AND i.customer_id IS NOT NULL AND i.invoice_date<=p_as_of
      AND upper(coalesce(i.currency,'QAR'))='QAR'
      AND i.invoice_type IN ('sales','service') AND lower(coalesce(i.status,'')) IN ('sent','paid','overdue')
      AND i.total_amount-coalesce(p.amount,0)>0.01
  ), receivables AS (
    SELECT customer_id,sum(balance) pending,count(*) FILTER(WHERE partial) partial_count
    FROM open_invoices GROUP BY customer_id
  ), customer_cash AS (
    SELECT customer_id,sum(total) total,sum(rent) rent,sum(fines) fines,sum(advances) advances,
      sum(total-rent-fines-advances) other,count(*) count,max(payment_date) last_payment_date
    FROM classified GROUP BY customer_id
  ), customers AS (
    SELECT coalesce(c.customer_id,r.customer_id) customer_id,coalesce(c.total,0) total,
      coalesce(c.rent,0) rent,coalesce(c.fines,0) fines,coalesce(c.advances,0) advances,
      coalesce(c.other,0) other,coalesce(c.count,0) count,c.last_payment_date,
      coalesce(r.pending,0) pending,coalesce(r.partial_count,0) partial_count
    FROM customer_cash c FULL JOIN receivables r ON r.customer_id=c.customer_id
  )
  SELECT jsonb_build_object('company_id',p_company_id,'as_of',p_as_of,'currency','QAR','complete',true,
    'invalid_receipts',(SELECT count(*) FROM classified WHERE invalid OR total-rent-fines-advances < -0.01),
    'monthly',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY month_key DESC) FROM monthly m),'[]'::jsonb),
    'open_invoices',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY due_date,invoice_id) FROM open_invoices i),'[]'::jsonb),
    'customers',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY customer_id) FROM customers c),'[]'::jsonb)) INTO v_result;
  IF (v_result->>'invalid_receipts')::integer>0 THEN
    RAISE EXCEPTION 'Receipt allocations need reconciliation before reporting collection totals' USING ERRCODE='23514';
  END IF;
  RETURN v_result-'invalid_receipts';
END;
$function$;
REVOKE ALL ON FUNCTION public.get_customer_collection_summary_v1(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_collection_summary_v1(uuid,date) TO authenticated,service_role;
COMMIT;
