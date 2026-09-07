-- Correct only rental invoice classification in the existing read-only claim engines.
-- No invoice/payment/snapshot updates and no approval or permission bypass.
BEGIN;
DO $repair$
DECLARE
  v3 regprocedure := 'public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)'::regprocedure;
  v4 regprocedure := 'public.calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])'::regprocedure;
  original text;
  updated text;
  predicate text := $predicate$(
  %1$s.penalty_id IS NULL
  AND upper(btrim(coalesce(%1$s.invoice_number, ''))) NOT LIKE 'TV-%%'
  AND (
    lower(btrim(coalesce(%1$s.invoice_type, ''))) = 'sales'
    OR (
      lower(btrim(coalesce(%1$s.invoice_type, ''))) = 'service'
      AND (SELECT count(*) FROM public.contract_payment_schedules linked
        WHERE linked.company_id = %1$s.company_id AND linked.invoice_id = %1$s.id
          AND lower(btrim(coalesce(linked.status, ''))) NOT IN
            ('cancelled','canceled','void','voided','reversed','deleted','inactive')) = 1
      AND EXISTS (SELECT 1 FROM public.contract_payment_schedules linked
        WHERE linked.company_id = %1$s.company_id AND linked.contract_id = %1$s.contract_id
          AND linked.invoice_id = %1$s.id AND linked.amount = %1$s.total_amount
          AND date_trunc('month', linked.due_date::timestamp)
            = date_trunc('month', coalesce(%1$s.invoice_month, %1$s.due_date)::timestamp)
          AND lower(btrim(coalesce(linked.status, ''))) NOT IN
            ('cancelled','canceled','void','voided','reversed','deleted','inactive'))
    )
  )
)$predicate$;
  old_filter text;
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=v3) <> '4a27cf9dcd1bfd202ffb80834de3f1a9'
     OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=v4) <> '36b78342a4ecc47adcdc6f9c5825f641' THEN
    RAISE EXCEPTION 'Legal claim calculator changed after review; refusing classification patch';
  END IF;
  original := pg_get_functiondef(v3);
  updated := replace(original,
    $old$LOWER(COALESCE(i.invoice_type, '')) AS invoice_type$old$,
    'CASE WHEN ' || format(predicate,'i') || ' THEN ''sales'' ELSE ''non_rent'' END AS invoice_type');
  IF updated=original THEN RAISE EXCEPTION 'Missing invoice component classification'; END IF;
  old_filter := $old$LOWER(COALESCE(i.invoice_type, '')) = 'sales'$old$;
  IF (length(updated)-length(replace(updated,old_filter,'')))/length(old_filter) <> 2 THEN
    RAISE EXCEPTION 'Unexpected v3 rental predicate count';
  END IF;
  updated := replace(updated,old_filter,format(predicate,'i'));
  EXECUTE updated;

  original := pg_get_functiondef(v4);
  old_filter := $old$LOWER(COALESCE(invoice.invoice_type, '')) = 'sales'$old$;
  IF (length(original)-length(replace(original,old_filter,'')))/length(old_filter) <> 2 THEN
    RAISE EXCEPTION 'Unexpected v4 rental predicate count';
  END IF;
  updated := replace(original,old_filter,format(predicate,'invoice'));
  EXECUTE updated;
END;
$repair$;
COMMIT;
