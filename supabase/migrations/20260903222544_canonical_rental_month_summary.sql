-- Read-only monthly obligations. Never synthesizes payment receipts or updates caches.
-- Internal shared settlement source. API roles must use an authorized gateway.
CREATE FUNCTION public.canonical_contract_invoice_settlement_v1(p_company_id uuid)
RETURNS TABLE (
  invoice_id uuid,contract_id uuid,invoice_month date,invoiced_amount numeric,
  paid_amount numeric,outstanding_amount numeric,receipt_ids uuid[],latest_payment_date date,
  invalid boolean,unclassified_service boolean,
  invoice_number text,invoice_type text,penalty_id uuid,is_traffic boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $settlement$
  WITH schedule_links AS MATERIALIZED (
    SELECT s.contract_id,s.invoice_id,count(*) link_count,min(s.amount) amount,min(s.due_date) due_date
    FROM public.contract_payment_schedules s
    WHERE s.company_id=p_company_id AND s.invoice_id IS NOT NULL
      AND lower(btrim(coalesce(s.status,''))) NOT IN ('cancelled','canceled','void','voided','deleted','inactive','reversed')
    GROUP BY s.contract_id,s.invoice_id
  ), contract_invoices AS MATERIALIZED (
    SELECT i.id,i.contract_id,c.customer_id AS contract_customer_id,
      date_trunc('month',coalesce(i.invoice_month,i.invoice_date))::date invoice_month,
      i.total_amount,i.status,i.customer_id IS DISTINCT FROM c.customer_id customer_mismatch,
      i.invoice_number::text,lower(btrim(coalesce(i.invoice_type,''))) invoice_type,i.penalty_id,
      i.penalty_id IS NOT NULL OR upper(btrim(coalesce(i.invoice_number,''))) LIKE 'TV-%' is_traffic,
      lower(btrim(coalesce(i.invoice_type,'')))='service' AND NOT coalesce(
        s.link_count=1 AND s.amount IS NOT NULL AND i.total_amount IS NOT NULL
          AND s.amount=i.total_amount
          AND date_trunc('month',s.due_date)=date_trunc('month',coalesce(i.invoice_month,i.invoice_date)),false
      ) AS unclassified_service
    FROM public.invoices i
    JOIN public.contracts c ON c.id=i.contract_id AND c.company_id=p_company_id
    LEFT JOIN schedule_links s ON s.contract_id=i.contract_id AND s.invoice_id=i.id
    WHERE i.company_id=p_company_id
      AND lower(btrim(coalesce(i.status,''))) NOT IN ('cancelled','canceled','void','voided','deleted','inactive','reversed')
      AND lower(btrim(coalesce(i.payment_status,''))) NOT IN ('cancelled','canceled','void','voided','deleted','inactive','reversed')
  ), payment_sources AS MATERIALIZED (
    SELECT i.id invoice_id,p.id payment_id,a.amount,p.payment_date,
      a.company_id IS DISTINCT FROM p_company_id OR p.company_id IS DISTINCT FROM p_company_id
        OR p.customer_id IS DISTINCT FROM i.contract_customer_id
        OR p.transaction_type IS NULL
        OR a.amount IS NULL OR a.amount<=0 OR p.amount IS NULL OR p.amount<=0 OR a.amount>p.amount
        OR EXISTS (SELECT 1 FROM public.payment_allocations x
          WHERE x.payment_id=p.id AND x.is_active
            AND (x.company_id IS DISTINCT FROM p_company_id OR x.amount IS NULL OR x.amount<=0))
        OR (SELECT coalesce(sum(x.amount),0) FROM public.payment_allocations x
          WHERE x.payment_id=p.id AND x.is_active)>p.amount invalid
    FROM contract_invoices i
    JOIN public.payment_allocations a ON a.target_id=i.id AND a.allocation_type='invoice' AND a.is_active
    JOIN public.payments p ON p.id=a.payment_id
    WHERE lower(coalesce(p.payment_status,'')) IN ('completed','paid','success','succeeded')
      AND lower(coalesce(p.transaction_type::text,'receipt'))='receipt'
    UNION ALL
    SELECT i.id,p.id,p.amount,p.payment_date,
      p.company_id IS DISTINCT FROM p_company_id OR p.customer_id IS DISTINCT FROM i.contract_customer_id
        OR (p.contract_id IS NOT NULL AND p.contract_id IS DISTINCT FROM i.contract_id)
        OR p.transaction_type IS NULL
        OR p.amount IS NULL OR p.amount<=0
    FROM contract_invoices i
    JOIN public.payments p ON p.invoice_id=i.id
    WHERE lower(coalesce(p.payment_status,'')) IN ('completed','paid','success','succeeded')
      AND lower(coalesce(p.transaction_type::text,'receipt'))='receipt'
      AND NOT EXISTS (SELECT 1 FROM public.payment_allocations a WHERE a.payment_id=p.id AND a.is_active)
  ), payment_totals AS (
    SELECT s.invoice_id,sum(s.amount) FILTER(WHERE NOT s.invalid) paid_amount,bool_or(s.invalid) invalid,
      array_agg(DISTINCT s.payment_id) FILTER(WHERE NOT s.invalid) receipt_ids,
      max(s.payment_date) FILTER(WHERE NOT s.invalid) latest_payment_date
    FROM payment_sources s GROUP BY s.invoice_id
  )
  SELECT i.id,i.contract_id,i.invoice_month,coalesce(i.total_amount,0),coalesce(p.paid_amount,0),
    greatest(0,coalesce(i.total_amount,0)-coalesce(p.paid_amount,0)),
    coalesce(p.receipt_ids,ARRAY[]::uuid[]),p.latest_payment_date,
    i.customer_mismatch OR i.total_amount IS NULL OR i.total_amount<0
      OR lower(coalesce(i.status,''))='draft' OR coalesce(p.invalid,false)
      OR EXISTS (SELECT 1 FROM public.payment_allocations orphan
        LEFT JOIN public.payments source_payment ON source_payment.id=orphan.payment_id
        WHERE orphan.target_id=i.id AND orphan.allocation_type='invoice' AND orphan.is_active
          AND source_payment.id IS NULL)
      OR coalesce(p.paid_amount,0)>coalesce(i.total_amount,0),
    i.unclassified_service,i.invoice_number,i.invoice_type,i.penalty_id,i.is_traffic
  FROM contract_invoices i LEFT JOIN payment_totals p ON p.invoice_id=i.id;
$settlement$;

REVOKE ALL ON FUNCTION public.canonical_contract_invoice_settlement_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;

-- Rental consumers retain their existing envelope. Traffic principal remains
-- visible only in the internal common source for its separate legal component;
-- this filter does not certify an unclassified service invoice as rent.
CREATE FUNCTION public.canonical_rental_invoice_settlement_v1(p_company_id uuid)
RETURNS TABLE (
  invoice_id uuid,contract_id uuid,invoice_month date,invoiced_amount numeric,
  paid_amount numeric,outstanding_amount numeric,receipt_ids uuid[],latest_payment_date date,
  invalid boolean,unclassified_service boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $rental$
  SELECT i.invoice_id,i.contract_id,i.invoice_month,i.invoiced_amount,
    i.paid_amount,i.outstanding_amount,i.receipt_ids,i.latest_payment_date,
    i.invalid,i.unclassified_service
  FROM public.canonical_contract_invoice_settlement_v1(p_company_id) i
  WHERE NOT i.is_traffic;
$rental$;

REVOKE ALL ON FUNCTION public.canonical_rental_invoice_settlement_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.get_canonical_rental_month_summary_v1(p_company_id uuid, p_month date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_company_id IS NULL OR p_month IS NULL
     OR p_month <> date_trunc('month', p_month)::date THEN
    RAISE EXCEPTION 'Company and first day of the reporting month are required' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.company_id = p_company_id AND p.is_active IS NOT FALSE
  ) THEN
    RAISE EXCEPTION 'Active company membership is required' USING ERRCODE = '42501';
  END IF;

  WITH active_schedules AS MATERIALIZED (
    SELECT s.contract_id,s.invoice_id,s.due_date,s.amount
    FROM public.contract_payment_schedules s
    WHERE s.company_id=p_company_id
      AND lower(btrim(coalesce(s.status,''))) NOT IN ('cancelled','canceled','void','voided','deleted','inactive','reversed')
  ), rental_invoices AS MATERIALIZED (
    SELECT * FROM public.canonical_rental_invoice_settlement_v1(p_company_id)
  ), month_invoices AS MATERIALIZED (
    SELECT i.* FROM rental_invoices i WHERE i.invoice_month=p_month
  ), invoice_totals AS (
    SELECT i.contract_id, count(*)::int invoice_count,
      bool_or(i.unclassified_service) unclassified_service,
      sum(i.invoiced_amount) invoiced_amount,sum(i.paid_amount) paid_amount,
      sum(i.outstanding_amount) outstanding_amount,bool_or(i.invalid) invalid
    FROM month_invoices i
    GROUP BY i.contract_id
  ), month_schedules AS (
    SELECT s.contract_id,count(*)::int schedule_count,sum(s.amount) scheduled_amount
    FROM active_schedules s
    WHERE date_trunc('month',s.due_date)::date=p_month
    GROUP BY s.contract_id
  ), report AS (
    SELECT c.id contract_id,c.customer_id,c.contract_number,
      coalesce(nullif(trim(concat_ws(' ',coalesce(cu.first_name_ar,cu.first_name),coalesce(cu.last_name_ar,cu.last_name))),''),
        cu.company_name_ar,cu.company_name,'غير معروف') customer_name,
      coalesce(i.invoice_count,0) invoice_count,
      coalesce(i.invoiced_amount,0) invoiced_amount,
      coalesce(i.paid_amount,0) paid_amount,
      coalesce(i.outstanding_amount,0) outstanding_amount,
      (SELECT count(DISTINCT receipt.id)::int FROM month_invoices mi
        CROSS JOIN LATERAL unnest(mi.receipt_ids) receipt(id)
        WHERE mi.contract_id=c.id) receipt_count,
      (SELECT max(mi.latest_payment_date) FROM month_invoices mi
        WHERE mi.contract_id=c.id) latest_payment_date,
      array_remove(ARRAY[
        CASE WHEN i.contract_id IS NULL THEN 'missing_monthly_invoice' END,
        CASE WHEN i.invalid THEN 'invalid_invoice_or_payment' END,
        CASE WHEN cu.id IS NULL THEN 'missing_customer' END,
        CASE WHEN c.start_date IS NULL OR c.end_date IS NULL OR c.start_date>c.end_date
          OR p_month<date_trunc('month',c.start_date)::date OR p_month>date_trunc('month',c.end_date)::date
          THEN 'outside_contract_period' END,
        CASE WHEN s.contract_id IS NOT NULL AND (s.scheduled_amount IS NULL
          OR abs(s.scheduled_amount-coalesce(i.invoiced_amount,0))>0.01) THEN 'schedule_amount_mismatch' END,
        CASE WHEN EXISTS (SELECT 1 FROM rental_invoices x WHERE x.contract_id=c.id
          AND x.invoice_month IS NULL) THEN 'unknown_invoice_month' END,
        CASE WHEN i.unclassified_service THEN 'unclassified_service_invoice' END
      ],NULL) review_reasons
    FROM public.contracts c
    LEFT JOIN public.customers cu ON cu.id=c.customer_id AND cu.company_id=p_company_id
    LEFT JOIN invoice_totals i ON i.contract_id=c.id
    LEFT JOIN month_schedules s ON s.contract_id=c.id
    WHERE c.company_id=p_company_id AND (
      i.contract_id IS NOT NULL OR s.contract_id IS NOT NULL
      -- An undated active invoice is unresolved evidence, even for a finished
      -- contract. Show a review row without assigning its amount to this month.
      OR EXISTS (SELECT 1 FROM rental_invoices x WHERE x.contract_id=c.id
        AND x.invoice_month IS NULL) OR (
        lower(coalesce(c.status,'')) NOT IN ('draft','cancelled','canceled','void','voided','deleted')
        AND c.start_date < (p_month+interval '1 month')::date AND c.end_date>=p_month
      )
    )
  )
  SELECT jsonb_build_object('company_id',p_company_id,'month',to_char(p_month,'YYYY-MM'),
    'rows',coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.contract_number,r.contract_id),'[]'::jsonb))
    INTO v_result FROM report r;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_canonical_rental_month_summary_v1(uuid,date) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_canonical_rental_month_summary_v1(uuid,date) TO authenticated;
COMMENT ON FUNCTION public.get_canonical_rental_month_summary_v1(uuid,date) IS
  'Read-only company-scoped invoice-month report from payment allocations; no receipt synthesis or balance refresh.';
