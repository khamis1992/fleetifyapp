-- Deterministic integrity guards for customer identity, financial relationships,
-- legal case ownership, canonical signed-document evidence, and close-only
-- system-audit review disposal.

BEGIN;

-- Preserve the prepaid billing invariant in source control as well as in the
-- live database: the due date is the first day of the invoice's own month,
-- never the legacy M+1 month. Replacing the function is safe and idempotent.
CREATE OR REPLACE FUNCTION public.enforce_invoice_date_first_of_month()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.due_date := pg_catalog.date_trunc(
    'month',
    COALESCE(NEW.invoice_month, NEW.invoice_date)::timestamp
  )::date;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_invoice_date_first_of_month ON public.invoices;
CREATE TRIGGER trg_enforce_invoice_date_first_of_month
BEFORE INSERT OR UPDATE OF invoice_month, invoice_date, due_date
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_invoice_date_first_of_month();

REVOKE ALL ON FUNCTION public.enforce_invoice_date_first_of_month() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Customer identity: store one canonical digit representation and enforce it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_national_id(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO ''
AS $function$
  SELECT pg_catalog.regexp_replace(
    pg_catalog.translate(
      COALESCE(p_value, ''),
      '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
      '01234567890123456789'
    ),
    '[^0-9]',
    '',
    'g'
  );
$function$;

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.customers customer
    WHERE public.normalize_national_id(customer.national_id) <> ''
    GROUP BY customer.company_id,
             public.normalize_national_id(customer.national_id)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot normalize customer national IDs: canonical duplicates require review first'
      USING ERRCODE = '23505';
  END IF;
END;
$preflight$;

UPDATE public.customers customer
SET national_id = NULLIF(public.normalize_national_id(customer.national_id), ''),
    updated_at = now()
WHERE customer.national_id IS DISTINCT FROM
      NULLIF(public.normalize_national_id(customer.national_id), '');

CREATE UNIQUE INDEX IF NOT EXISTS customers_company_normalized_national_id_unique
  ON public.customers (
    company_id,
    public.normalize_national_id(national_id)
  )
  WHERE public.normalize_national_id(national_id) <> '';

CREATE OR REPLACE FUNCTION public.normalize_customer_national_id_on_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.national_id := NULLIF(public.normalize_national_id(NEW.national_id), '');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_00_normalize_customer_national_id ON public.customers;
CREATE TRIGGER trg_00_normalize_customer_national_id
BEFORE INSERT OR UPDATE OF national_id
ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.normalize_customer_national_id_on_write();

REVOKE ALL ON FUNCTION public.normalize_national_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_customer_national_id_on_write() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_national_id(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Financial relationship guards: never let a payment or active allocation
-- point across company, customer, or contract boundaries.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_payment_invoice_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_invoice_company_id uuid;
  v_invoice_contract_id uuid;
  v_invoice_customer_id uuid;
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT invoice.company_id, invoice.contract_id, invoice.customer_id
  INTO v_invoice_company_id, v_invoice_contract_id, v_invoice_customer_id
  FROM public.invoices invoice
  WHERE invoice.id = NEW.invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment invoice does not exist (%)', NEW.invoice_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.company_id IS DISTINCT FROM v_invoice_company_id THEN
    RAISE EXCEPTION 'Payment and invoice must belong to the same company'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.contract_id IS NOT NULL
     AND v_invoice_contract_id IS NOT NULL
     AND NEW.contract_id IS DISTINCT FROM v_invoice_contract_id THEN
    RAISE EXCEPTION 'Payment contract does not match invoice contract'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.customer_id IS NOT NULL
     AND v_invoice_customer_id IS NOT NULL
     AND NEW.customer_id IS DISTINCT FROM v_invoice_customer_id THEN
    RAISE EXCEPTION 'Payment customer does not match invoice customer'
      USING ERRCODE = '23514';
  END IF;

  NEW.contract_id := COALESCE(NEW.contract_id, v_invoice_contract_id);
  NEW.customer_id := COALESCE(NEW.customer_id, v_invoice_customer_id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_00_guard_payment_invoice_identity ON public.payments;
CREATE TRIGGER trg_00_guard_payment_invoice_identity
BEFORE INSERT OR UPDATE OF invoice_id, contract_id, customer_id, company_id
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.guard_payment_invoice_identity();

CREATE OR REPLACE FUNCTION public.guard_payment_allocation_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_payment_company_id uuid;
  v_payment_contract_id uuid;
  v_payment_customer_id uuid;
  v_invoice_company_id uuid;
  v_invoice_contract_id uuid;
  v_invoice_customer_id uuid;
BEGIN
  IF NEW.is_active IS DISTINCT FROM true
     OR NEW.allocation_type IS DISTINCT FROM 'invoice' THEN
    RETURN NEW;
  END IF;

  SELECT payment.company_id, payment.contract_id, payment.customer_id
  INTO v_payment_company_id, v_payment_contract_id, v_payment_customer_id
  FROM public.payments payment
  WHERE payment.id = NEW.payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allocation payment does not exist (%)', NEW.payment_id
      USING ERRCODE = '23503';
  END IF;

  SELECT invoice.company_id, invoice.contract_id, invoice.customer_id
  INTO v_invoice_company_id, v_invoice_contract_id, v_invoice_customer_id
  FROM public.invoices invoice
  WHERE invoice.id = NEW.target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allocation invoice does not exist (%)', NEW.target_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.company_id IS DISTINCT FROM v_payment_company_id
     OR NEW.company_id IS DISTINCT FROM v_invoice_company_id THEN
    RAISE EXCEPTION 'Allocation, payment, and invoice must belong to the same company'
      USING ERRCODE = '23514';
  END IF;

  IF v_payment_contract_id IS NOT NULL
     AND v_invoice_contract_id IS NOT NULL
     AND v_payment_contract_id IS DISTINCT FROM v_invoice_contract_id THEN
    RAISE EXCEPTION 'Allocated payment contract does not match invoice contract'
      USING ERRCODE = '23514';
  END IF;

  IF v_payment_customer_id IS NOT NULL
     AND v_invoice_customer_id IS NOT NULL
     AND v_payment_customer_id IS DISTINCT FROM v_invoice_customer_id THEN
    RAISE EXCEPTION 'Allocated payment customer does not match invoice customer'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_00_guard_payment_allocation_identity
  ON public.payment_allocations;
CREATE TRIGGER trg_00_guard_payment_allocation_identity
BEFORE INSERT OR UPDATE OF company_id, payment_id, allocation_type, target_id, is_active
ON public.payment_allocations
FOR EACH ROW
EXECUTE FUNCTION public.guard_payment_allocation_identity();

REVOKE ALL ON FUNCTION public.guard_payment_invoice_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_payment_allocation_identity() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Legal ownership guard: a linked case inherits and must retain the contract's
-- canonical customer and company.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_legal_case_contract_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_contract_company_id uuid;
  v_contract_customer_id uuid;
BEGIN
  IF NEW.contract_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT contract.company_id, contract.customer_id
  INTO v_contract_company_id, v_contract_customer_id
  FROM public.contracts contract
  WHERE contract.id = NEW.contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal case contract does not exist (%)', NEW.contract_id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.company_id IS DISTINCT FROM v_contract_company_id THEN
    RAISE EXCEPTION 'Legal case and contract must belong to the same company'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.client_id IS NOT NULL
     AND v_contract_customer_id IS NOT NULL
     AND NEW.client_id IS DISTINCT FROM v_contract_customer_id THEN
    RAISE EXCEPTION 'Legal case client does not match contract customer'
      USING ERRCODE = '23514';
  END IF;

  NEW.client_id := COALESCE(NEW.client_id, v_contract_customer_id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_00_guard_legal_case_contract_identity
  ON public.legal_cases;
CREATE TRIGGER trg_00_guard_legal_case_contract_identity
BEFORE INSERT OR UPDATE OF contract_id, client_id, company_id
ON public.legal_cases
FOR EACH ROW
EXECUTE FUNCTION public.guard_legal_case_contract_identity();

REVOKE ALL ON FUNCTION public.guard_legal_case_contract_identity() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Signed evidence: retain the original alias attachment while recording its
-- one proven canonical contract. No file or financial row is moved.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contract_document_canonical_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
  source_contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  canonical_contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  link_status text NOT NULL DEFAULT 'confirmed'
    CHECK (link_status IN ('proposed', 'confirmed', 'rejected')),
  confidence numeric NOT NULL DEFAULT 1
    CHECK (confidence >= 0 AND confidence <= 1),
  match_basis jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_by text NOT NULL DEFAULT 'integrity_guard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_document_canonical_links_document_key UNIQUE (document_id),
  CONSTRAINT contract_document_canonical_links_distinct_contracts
    CHECK (source_contract_id <> canonical_contract_id)
);

CREATE INDEX IF NOT EXISTS idx_contract_document_canonical_links_canonical
  ON public.contract_document_canonical_links(company_id, canonical_contract_id, link_status);

ALTER TABLE public.contract_document_canonical_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.contract_document_canonical_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.contract_document_canonical_links TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_signed_document_canonical_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_source public.contracts%ROWTYPE;
  v_canonical_id uuid;
  v_candidate_count integer;
BEGIN
  IF NEW.contract_id IS NULL
     OR NEW.document_type NOT IN ('signed_contract', 'signed_contract_image') THEN
    RETURN NEW;
  END IF;

  SELECT source_contract.*
  INTO v_source
  FROM public.contracts source_contract
  WHERE source_contract.id = NEW.contract_id
    AND source_contract.company_id = NEW.company_id;

  IF NOT FOUND
     OR lower(COALESCE(v_source.status, '')) NOT IN ('cancelled', 'canceled')
     OR COALESCE(v_source.sub_status, '') <> 'duplicate_merged' THEN
    RETURN NEW;
  END IF;

  SELECT
    count(*),
    (array_agg(candidate.canonical_id ORDER BY candidate.canonical_id))[1]
  INTO v_candidate_count, v_canonical_id
  FROM (
    SELECT DISTINCT canonical.id AS canonical_id
    FROM public.contract_number_history history
    JOIN public.contracts canonical
      ON canonical.id = history.contract_id
     AND canonical.company_id = v_source.company_id
     AND canonical.contract_number = history.new_contract_number
    WHERE history.old_contract_number = v_source.contract_number
      AND canonical.customer_id IS NOT DISTINCT FROM v_source.customer_id
      AND public.normalize_vehicle_plate(canonical.license_plate)
          = public.normalize_vehicle_plate(v_source.license_plate)
      AND canonical.start_date IS NOT DISTINCT FROM v_source.start_date
      AND NOT EXISTS (
        SELECT 1 FROM public.invoices invoice
        WHERE invoice.contract_id = v_source.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.payments payment
        WHERE payment.contract_id = v_source.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.legal_cases legal_case
        WHERE legal_case.contract_id = v_source.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.delinquent_customers delinquent
        WHERE delinquent.contract_id = v_source.id
      )
  ) candidate;

  IF v_candidate_count <> 1 OR v_canonical_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.contract_document_canonical_links (
    company_id,
    document_id,
    source_contract_id,
    canonical_contract_id,
    link_status,
    confidence,
    match_basis,
    linked_by,
    updated_at
  ) VALUES (
    NEW.company_id,
    NEW.id,
    NEW.contract_id,
    v_canonical_id,
    'confirmed',
    1,
    jsonb_build_object(
      'contract_number_history', true,
      'same_customer', true,
      'normalized_plate', public.normalize_vehicle_plate(v_source.license_plate),
      'same_start_date', true,
      'source_is_document_only_alias', true
    ),
    'signed_document_trigger',
    now()
  )
  ON CONFLICT (document_id) DO UPDATE
  SET company_id = EXCLUDED.company_id,
      source_contract_id = EXCLUDED.source_contract_id,
      canonical_contract_id = EXCLUDED.canonical_contract_id,
      link_status = EXCLUDED.link_status,
      confidence = EXCLUDED.confidence,
      match_basis = EXCLUDED.match_basis,
      linked_by = EXCLUDED.linked_by,
      updated_at = now();

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_resolve_signed_document_canonical_link
  ON public.contract_documents;
CREATE TRIGGER trg_resolve_signed_document_canonical_link
AFTER INSERT OR UPDATE OF contract_id, document_type, company_id
ON public.contract_documents
FOR EACH ROW
EXECUTE FUNCTION public.resolve_signed_document_canonical_link();

REVOKE ALL ON FUNCTION public.resolve_signed_document_canonical_link() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_vehicle_plate(text)
  TO authenticated, service_role;

-- Backfill previously retained signed evidence through the same trigger logic.
UPDATE public.contract_documents document
SET contract_id = document.contract_id
WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
  AND document.contract_id IS NOT NULL;

CREATE OR REPLACE VIEW public.contract_documents_effective_contract_v1
WITH (security_invoker = true)
AS
SELECT
  document.*,
  link.source_contract_id,
  COALESCE(link.canonical_contract_id, document.contract_id) AS effective_contract_id,
  link.link_status AS canonical_link_status,
  link.match_basis AS canonical_match_basis
FROM public.contract_documents document
LEFT JOIN public.contract_document_canonical_links link
  ON link.document_id = document.id
 AND link.link_status = 'confirmed';

REVOKE ALL ON public.contract_documents_effective_contract_v1
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.contract_documents_effective_contract_v1 TO service_role;

-- ---------------------------------------------------------------------------
-- Close-only review disposal. This function never inserts or refreshes a task
-- and never creates a finding; it only advances the two-snapshot stale guard.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.close_stale_system_audit_reviews_v1(
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_latest_run_id uuid;
  v_missing_advanced integer := 0;
  v_closed_tasks integer := 0;
  v_ignored_findings integer := 0;
  v_closed_links integer := 0;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  IF NOT pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'system-audit-review-task-sync:' || p_company_id::text,
      0
    )
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'busy', true,
      'mode', 'close_only',
      'companyId', p_company_id
    );
  END IF;

  SELECT run.id
  INTO v_latest_run_id
  FROM public.system_agent_runs run
  WHERE run.status = 'completed'
    AND run.requested_domains @> ARRAY[
      'contracts', 'accounting', 'fleet', 'customers', 'inventory', 'legal', 'employees'
    ]::text[]
    AND EXISTS (
      SELECT 1
      FROM public.system_agent_jobs job
      WHERE job.run_id = run.id
        AND job.company_id = p_company_id
    )
  ORDER BY COALESCE(run.finished_at, run.created_at) DESC, run.created_at DESC
  LIMIT 1;

  IF v_latest_run_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'busy', false,
      'mode', 'close_only',
      'companyId', p_company_id,
      'snapshotAvailable', false,
      'closedTasks', 0,
      'ignoredFindings', 0
    );
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.system_agent_close_snapshot (
    task_key text PRIMARY KEY
  ) ON COMMIT DROP;
  TRUNCATE TABLE pg_temp.system_agent_close_snapshot;

  INSERT INTO pg_temp.system_agent_close_snapshot (task_key)
  SELECT DISTINCT concat(
    'finding:', finding.code, ':', finding.entity_type, ':', finding.entity_id, ':',
    COALESCE(finding.evidence->>'target_month', '')
  )
  FROM public.system_agent_findings finding
  WHERE finding.company_id = p_company_id
    AND finding.status IN ('review', 'detected')
    AND (
      finding.run_id = v_latest_run_id
      OR finding.code = 'invoice.month_reconciliation_needs_review'
    );

  UPDATE public.system_agent_review_task_links link
  SET missed_snapshots = link.missed_snapshots + 1,
      last_missing_run_id = v_latest_run_id,
      updated_at = now()
  WHERE link.company_id = p_company_id
    AND link.active = true
    AND link.last_missing_run_id IS DISTINCT FROM v_latest_run_id
    AND NOT EXISTS (
      SELECT 1
      FROM pg_temp.system_agent_close_snapshot snapshot
      WHERE snapshot.task_key = link.task_key
    );
  GET DIAGNOSTICS v_missing_advanced = ROW_COUNT;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.system_agent_close_candidates (
    task_key text PRIMARY KEY,
    task_id uuid NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE TABLE pg_temp.system_agent_close_candidates;

  INSERT INTO pg_temp.system_agent_close_candidates (task_key, task_id)
  SELECT link.task_key, link.task_id
  FROM public.system_agent_review_task_links link
  WHERE link.company_id = p_company_id
    AND link.active = true
    AND link.missed_snapshots >= 2
    AND NOT EXISTS (
      SELECT 1
      FROM pg_temp.system_agent_close_snapshot snapshot
      WHERE snapshot.task_key = link.task_key
    );

  UPDATE public.tasks task
  SET status = 'cancelled'
  FROM pg_temp.system_agent_close_candidates candidate
  WHERE task.id = candidate.task_id
    AND task.company_id = p_company_id
    AND task.status IN ('pending', 'in_progress', 'on_hold');
  GET DIAGNOSTICS v_closed_tasks = ROW_COUNT;

  UPDATE public.system_agent_findings finding
  SET status = 'ignored',
      updated_at = now()
  WHERE finding.company_id = p_company_id
    AND finding.status IN ('review', 'detected')
    AND EXISTS (
      SELECT 1
      FROM pg_temp.system_agent_close_candidates candidate
      WHERE candidate.task_key = concat(
        'finding:', finding.code, ':', finding.entity_type, ':', finding.entity_id, ':',
        COALESCE(finding.evidence->>'target_month', '')
      )
    );
  GET DIAGNOSTICS v_ignored_findings = ROW_COUNT;

  UPDATE public.system_agent_review_task_links link
  SET active = false,
      updated_at = now()
  WHERE link.company_id = p_company_id
    AND link.active = true
    AND EXISTS (
      SELECT 1
      FROM pg_temp.system_agent_close_candidates candidate
      WHERE candidate.task_key = link.task_key
    );
  GET DIAGNOSTICS v_closed_links = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'busy', false,
    'mode', 'close_only',
    'companyId', p_company_id,
    'snapshotAvailable', true,
    'runId', v_latest_run_id,
    'missingAdvanced', v_missing_advanced,
    'closedTasks', v_closed_tasks,
    'ignoredFindings', v_ignored_findings,
    'closedLinks', v_closed_links,
    'created', 0,
    'refreshed', 0
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.close_stale_system_audit_reviews_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_stale_system_audit_reviews_v1(uuid)
  TO service_role;

COMMIT;
