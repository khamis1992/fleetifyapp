-- Current payment evidence, restricted to rent due before the supplied date.
-- This is not a historical payment snapshot or a legal claim authorization.
-- Requires canonical_rental_invoice_settlement_v1 from the monthly reader migration.
CREATE FUNCTION public.get_canonical_rental_arrears_v1(
  p_company_id uuid,
  p_due_as_of date DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date)
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_company_id IS NULL OR p_due_as_of IS NULL OR NOT isfinite(p_due_as_of) THEN
    RAISE EXCEPTION 'Company and due-as-of date are required' USING ERRCODE='22023';
  END IF;
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id=auth.uid() AND p.company_id=p_company_id AND p.is_active IS NOT FALSE
  ) THEN
    RAISE EXCEPTION 'Active company membership is required' USING ERRCODE='42501';
  END IF;

  WITH legal_profiles AS MATERIALIZED (
    SELECT p.contract_id,count(*) profile_count,min(p.vehicle_returned_at) returned_at,
      min(p.termination_date) FILTER(WHERE p.termination_date_status='confirmed') termination_date
    FROM public.legal_case_litigation_profile p WHERE p.company_id=p_company_id GROUP BY p.contract_id
  ), case_cutoffs AS MATERIALIZED (
    SELECT c.contract_id,
      min((c.judgment_final_at AT TIME ZONE 'Asia/Qatar')::date) judgment_date,
      min(c.outcome_date) FILTER(WHERE c.workflow_stage IN ('judgment_issued','appeal','enforcement','collection','closed')) outcome_date
    FROM public.legal_cases c WHERE c.company_id=p_company_id
      AND lower(coalesce(c.case_status,'')) NOT IN ('cancelled','canceled') GROUP BY c.contract_id
  ), scoped_contracts AS MATERIALIZED (
    SELECT c.id,c.company_id,c.customer_id,c.contract_number,c.start_date,c.end_date,c.status,c.contract_amount,c.monthly_amount,c.vehicle_id,
      least(p_due_as_of,c.end_date,p.returned_at,p.termination_date,l.judgment_date,l.outcome_date) cutoff_date,
      coalesce(p.profile_count,0)>1 duplicate_legal_profile
    FROM public.contracts c
    LEFT JOIN legal_profiles p ON p.contract_id=c.id
    LEFT JOIN case_cutoffs l ON l.contract_id=c.id WHERE c.company_id=p_company_id
  ), settlements AS MATERIALIZED (
    SELECT s.*,s.unclassified_service OR lower(btrim(coalesce(i.invoice_type,'')))
      NOT IN ('','sales','rental','rent','service') unclassified_invoice
    FROM public.canonical_rental_invoice_settlement_v1(p_company_id) s
    JOIN public.invoices i ON i.id=s.invoice_id AND i.company_id=p_company_id
  ), schedules AS MATERIALIZED (
    SELECT s.* FROM public.contract_payment_schedules s WHERE s.company_id=p_company_id
      AND lower(btrim(coalesce(s.status,''))) NOT IN ('cancelled','canceled','void','voided','deleted','inactive','reversed')
  ), invoice_evidence AS (
    SELECT s.contract_id,bool_or(s.invalid) invalid,bool_or(s.unclassified_invoice) unclassified,
      bool_or(s.invoice_month IS NULL) unknown_month,
      count(s.invoice_month)>count(DISTINCT s.invoice_month) duplicate_month,
      bool_or(s.invoice_month<date_trunc('month',c.start_date)::date
        OR s.invoice_month>date_trunc('month',c.end_date)::date
        OR (s.invoice_month>date_trunc('month',c.cutoff_date)::date AND s.invoice_month<p_due_as_of)) outside_cutoff
    FROM settlements s JOIN scoped_contracts c ON c.id=s.contract_id GROUP BY s.contract_id
  ), schedule_evidence AS (
    SELECT s.contract_id,count(*) schedule_count,count(DISTINCT date_trunc('month',s.due_date)) month_count,
      sum(s.amount) scheduled_amount,min(s.due_date) first_due,max(s.due_date) last_due,
      bool_or(s.due_date IS NULL OR s.amount IS NULL OR s.amount<=0
        OR s.due_date<date_trunc('month',c.start_date)::date OR s.due_date>c.end_date) invalid,
      bool_or(s.due_date<p_due_as_of AND date_trunc('month',s.due_date)>date_trunc('month',c.cutoff_date)) outside_cutoff,
      bool_or(s.due_date<p_due_as_of AND (i.invoice_id IS NULL
        OR i.invoice_month IS DISTINCT FROM date_trunc('month',s.due_date)::date
        OR i.invoiced_amount IS DISTINCT FROM s.amount)) missing_invoice
    FROM schedules s JOIN scoped_contracts c ON c.id=s.contract_id
    LEFT JOIN settlements i ON i.contract_id=s.contract_id AND i.invoice_id=s.invoice_id
    GROUP BY s.contract_id
  ), due_invoices AS MATERIALIZED (
    SELECT s.* FROM settlements s JOIN scoped_contracts c ON c.id=s.contract_id
    WHERE s.invoice_month<p_due_as_of
      AND s.invoice_month>=date_trunc('month',c.start_date)::date
      AND s.invoice_month<=date_trunc('month',c.cutoff_date)::date
  ), totals AS (
    SELECT s.contract_id,sum(s.invoiced_amount) invoiced_amount,sum(s.paid_amount) paid_amount,
      sum(s.outstanding_amount) outstanding_amount,
      min(s.invoice_month) FILTER(WHERE s.outstanding_amount>0) oldest_unpaid_date,
      count(DISTINCT s.invoice_month) FILTER(WHERE s.outstanding_amount>0)::int unpaid_months,
      count(*)::int invoice_count,max(s.latest_payment_date) latest_payment_date
    FROM due_invoices s GROUP BY s.contract_id
  ), evidence AS (
    SELECT c.id contract_id,c.customer_id,c.contract_number,c.cutoff_date,
      cu.phone customer_phone,cu.email customer_email,v.id vehicle_id,v.plate_number vehicle_plate,c.monthly_amount monthly_rent,
      coalesce(nullif(trim(concat_ws(' ',coalesce(cu.first_name_ar,cu.first_name),coalesce(cu.last_name_ar,cu.last_name))),''),
        cu.company_name_ar,cu.company_name,'غير معروف') customer_name,
      coalesce(t.invoiced_amount,0) invoiced_amount,coalesce(t.paid_amount,0) paid_amount,
      coalesce(t.outstanding_amount,0) outstanding_amount,t.oldest_unpaid_date,
      coalesce(t.unpaid_months,0) unpaid_months,coalesce(t.invoice_count,0) invoice_count,t.latest_payment_date,
      array_remove(ARRAY[
        CASE WHEN cu.id IS NULL THEN 'missing_customer' END,
        CASE WHEN c.start_date IS NULL OR c.end_date IS NULL OR c.start_date>c.end_date
          OR (c.cutoff_date<c.start_date AND c.start_date<=p_due_as_of)
          THEN 'invalid_contract_period' END,
        CASE WHEN c.duplicate_legal_profile THEN 'duplicate_legal_profile' END,
        CASE WHEN ie.invalid THEN 'invalid_invoice_or_payment' END,
        CASE WHEN ie.unclassified THEN 'unclassified_invoice' END,
        CASE WHEN ie.unknown_month THEN 'unknown_invoice_month' END,
        CASE WHEN ie.outside_cutoff THEN 'outside_rent_cutoff' END,
        CASE WHEN se.outside_cutoff THEN 'outside_rent_cutoff_schedule' END,
        CASE WHEN se.invalid THEN 'invalid_schedule' END,
        CASE WHEN se.missing_invoice THEN 'missing_or_mismatched_invoice' END,
        CASE WHEN se.schedule_count>se.month_count THEN 'duplicate_schedule_month' END,
        CASE WHEN ie.duplicate_month THEN 'duplicate_invoice_month' END,
        CASE WHEN c.contract_amount IS NULL OR c.contract_amount<=0 OR
          se.contract_id IS NULL OR se.scheduled_amount IS DISTINCT FROM c.contract_amount OR
          se.month_count IS DISTINCT FROM ((extract(year FROM se.last_due)::int-extract(year FROM se.first_due)::int)*12
            +extract(month FROM se.last_due)::int-extract(month FROM se.first_due)::int+1)
          THEN 'incomplete_schedule' END,
        CASE WHEN ie.contract_id IS NULL AND se.contract_id IS NULL
          THEN 'missing_billing_evidence' END
      ],NULL) review_reasons
    FROM scoped_contracts c LEFT JOIN totals t ON t.contract_id=c.id
    LEFT JOIN invoice_evidence ie ON ie.contract_id=c.id
    LEFT JOIN schedule_evidence se ON se.contract_id=c.id
    LEFT JOIN public.customers cu ON cu.id=c.customer_id AND cu.company_id=p_company_id
    LEFT JOIN public.vehicles v ON v.id=c.vehicle_id AND v.company_id=p_company_id
    WHERE ie.contract_id IS NOT NULL OR se.contract_id IS NOT NULL
      OR (lower(coalesce(c.status,'')) IN ('active','expired','under_legal_procedure')
        AND (c.start_date IS NULL OR c.start_date<=p_due_as_of))
  ), report AS (
    SELECT e.contract_id,e.customer_id,e.contract_number,e.customer_name,e.cutoff_date,e.review_reasons,
      e.customer_phone,e.customer_email,e.vehicle_id,e.vehicle_plate,e.monthly_rent,
      CASE WHEN cardinality(e.review_reasons)=0 THEN e.invoiced_amount END invoiced_amount,
      CASE WHEN cardinality(e.review_reasons)=0 THEN e.paid_amount END paid_amount,
      CASE WHEN cardinality(e.review_reasons)=0 THEN e.outstanding_amount END outstanding_amount,
      CASE WHEN cardinality(e.review_reasons)=0 THEN e.oldest_unpaid_date END oldest_unpaid_date,
      CASE WHEN cardinality(e.review_reasons)=0 THEN (p_due_as_of-e.oldest_unpaid_date) END days_overdue,
      CASE WHEN cardinality(e.review_reasons)=0 THEN e.unpaid_months END unpaid_months,
      e.invoice_count,e.latest_payment_date
    FROM evidence e WHERE cardinality(e.review_reasons)>0 OR e.outstanding_amount>0
  )
  SELECT jsonb_build_object('company_id',p_company_id,'due_as_of',p_due_as_of,
    'settlement_basis','current_payment_allocations','fees_scope','excluded',
    'rows',coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.oldest_unpaid_date NULLS LAST,r.contract_id),'[]'::jsonb))
    INTO v_result FROM report r;
  RETURN v_result;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_canonical_rental_arrears_v1(uuid,date) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_canonical_rental_arrears_v1(uuid,date) TO authenticated;
