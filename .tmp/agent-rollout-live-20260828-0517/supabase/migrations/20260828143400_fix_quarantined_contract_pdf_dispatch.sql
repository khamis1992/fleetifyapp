-- A quarantined document is evidence to preserve for audit, not evidence that
-- can satisfy legal readiness or close a request for a correct signed PDF.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.contract_documents') IS NULL
     OR to_regclass('public.missing_contract_pdf_requests') IS NULL
     OR to_regclass('public.missing_contract_pdf_deliveries') IS NULL
     OR to_regprocedure('public.enqueue_missing_contract_pdf_request_v1(uuid,uuid,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Missing contract-PDF agent prerequisites';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.enqueue_missing_contract_pdf_request_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_contract record;
  v_request public.missing_contract_pdf_requests%ROWTYPE;
  v_reason text;
  v_has_matched boolean;
  v_has_pending boolean;
  v_has_invalid boolean;
  v_created boolean := false;
BEGIN
  SELECT
    contract.id,
    contract.company_id,
    contract.customer_id,
    contract.contract_number,
    concat_ws(' ',
      NULLIF(customer.first_name_ar, ''),
      NULLIF(customer.last_name_ar, '')
    ) AS customer_name,
    vehicle.plate_number
  INTO v_contract
  FROM public.contracts contract
  JOIN public.customers customer
    ON customer.id = contract.customer_id
   AND customer.company_id = contract.company_id
  LEFT JOIN public.vehicles vehicle
    ON vehicle.id = contract.vehicle_id
   AND vehicle.company_id = contract.company_id
  WHERE contract.id = p_contract_id
    AND contract.company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract was not found in the requested company'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    bool_or(
      document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
    ),
    bool_or(
      document.legal_identity_match_status IN ('pending', 'unverified')
      AND document.legal_evidence_state = 'active'
    ),
    bool_or(
      document.legal_identity_match_status IN ('mismatch', 'failed')
      OR document.legal_evidence_state = 'quarantined'
    )
  INTO v_has_matched, v_has_pending, v_has_invalid
  FROM public.contract_documents document
  WHERE document.company_id = p_company_id
    AND document.contract_id = p_contract_id
    AND document.document_type IN ('signed_contract', 'signed_contract_image')
    AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL;

  IF COALESCE(v_has_matched, false) THEN
    UPDATE public.missing_contract_pdf_requests request
    SET status = 'fulfilled',
        fulfilled_at = COALESCE(request.fulfilled_at, now()),
        last_error = NULL,
        updated_at = now()
    WHERE request.company_id = p_company_id
      AND request.contract_id = p_contract_id
      AND request.status NOT IN ('fulfilled', 'cancelled');

    UPDATE public.missing_contract_pdf_deliveries delivery
    SET status = 'cancelled',
        updated_at = now()
    WHERE delivery.company_id = p_company_id
      AND delivery.request_id IN (
        SELECT request.id
        FROM public.missing_contract_pdf_requests request
        WHERE request.company_id = p_company_id
          AND request.contract_id = p_contract_id
          AND request.status = 'fulfilled'
      )
      AND delivery.status IN ('pending', 'failed');

    RETURN jsonb_build_object('status', 'not_required', 'ready', true);
  END IF;

  IF COALESCE(v_has_pending, false) THEN
    RETURN jsonb_build_object(
      'status', 'identity_verification_pending',
      'ready', false,
      'reason', 'identity_verification_pending'
    );
  END IF;

  v_reason := CASE
    WHEN COALESCE(v_has_invalid, false) THEN 'identity_mismatch'
    ELSE 'missing'
  END;
  IF p_reason IN ('missing', 'identity_mismatch') THEN
    v_reason := p_reason;
  END IF;

  SELECT request.*
  INTO v_request
  FROM public.missing_contract_pdf_requests request
  WHERE request.company_id = p_company_id
    AND request.contract_id = p_contract_id
    AND request.request_kind = 'signed_contract_pdf'
    AND request.status NOT IN ('fulfilled', 'cancelled')
  ORDER BY request.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.missing_contract_pdf_requests (
        company_id,
        contract_id,
        customer_id,
        reason,
        contract_number,
        customer_name,
        vehicle_plate,
        requested_by
      ) VALUES (
        p_company_id,
        p_contract_id,
        v_contract.customer_id,
        v_reason,
        v_contract.contract_number,
        COALESCE(NULLIF(v_contract.customer_name, ''), 'العميل'),
        v_contract.plate_number,
        p_actor_id
      )
      RETURNING * INTO v_request;
      v_created := true;
    EXCEPTION WHEN unique_violation THEN
      SELECT request.*
      INTO v_request
      FROM public.missing_contract_pdf_requests request
      WHERE request.company_id = p_company_id
        AND request.contract_id = p_contract_id
        AND request.request_kind = 'signed_contract_pdf'
        AND request.status NOT IN ('fulfilled', 'cancelled')
      ORDER BY request.created_at DESC
      LIMIT 1;
    END;
  ELSE
    UPDATE public.missing_contract_pdf_requests request
    SET reason = v_reason,
        last_requested_at = now(),
        requested_by = COALESCE(p_actor_id, request.requested_by),
        last_error = CASE WHEN request.status = 'failed' THEN NULL ELSE request.last_error END,
        status = CASE WHEN request.status = 'failed' THEN 'pending' ELSE request.status END,
        updated_at = now()
    WHERE request.id = v_request.id
    RETURNING * INTO v_request;
  END IF;

  INSERT INTO public.missing_contract_pdf_deliveries (
    company_id,
    request_id,
    phone_e164
  )
  SELECT recipient.company_id, v_request.id, recipient.phone_e164
  FROM public.missing_contract_pdf_recipients recipient
  WHERE recipient.company_id = p_company_id
    AND recipient.active = true
  ON CONFLICT (request_id, phone_e164) DO NOTHING;

  IF v_created THEN
    INSERT INTO public.contract_operations_log (
      contract_id,
      company_id,
      operation_type,
      operation_details,
      notes,
      performed_by
    ) VALUES (
      p_contract_id,
      p_company_id,
      'signed_contract_pdf_request_queued',
      jsonb_build_object(
        'request_id', v_request.id,
        'reason', v_reason,
        'recipient_count', (
          SELECT count(*)
          FROM public.missing_contract_pdf_deliveries delivery
          WHERE delivery.request_id = v_request.id
        ),
        'source', 'automatic_missing_contract_pdf_agent'
      ),
      CASE
        WHEN v_reason = 'identity_mismatch'
          THEN 'تم إنشاء طلب تلقائي لنسخة عقد PDF صحيحة بعد اكتشاف عدم تطابق الهوية.'
        ELSE 'تم إنشاء طلب تلقائي لنسخة العقد الموقعة بصيغة PDF.'
      END,
      p_actor_id
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_request.id,
    'status', v_request.status,
    'reason', v_request.reason,
    'ready', false,
    'created', v_created,
    'recipient_count', (
      SELECT count(*)
      FROM public.missing_contract_pdf_deliveries delivery
      WHERE delivery.request_id = v_request.id
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_missing_contract_pdf_request_v1(
  uuid, uuid, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_missing_contract_pdf_request_v1(
  uuid, uuid, text, uuid
) TO service_role;

CREATE OR REPLACE FUNCTION public.fulfill_missing_contract_pdf_request_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_request_id uuid;
BEGIN
  IF NEW.contract_id IS NULL
     OR NEW.document_type NOT IN ('signed_contract', 'signed_contract_image')
     OR NULLIF(BTRIM(NEW.file_path), '') IS NULL
     OR NEW.legal_identity_match_status <> 'matched'
     OR NEW.legal_evidence_state <> 'active' THEN
    RETURN NEW;
  END IF;

  UPDATE public.missing_contract_pdf_requests request
  SET status = 'fulfilled',
      fulfilled_at = COALESCE(request.fulfilled_at, now()),
      last_error = NULL,
      updated_at = now()
  WHERE request.company_id = NEW.company_id
    AND request.contract_id = NEW.contract_id
    AND request.status NOT IN ('fulfilled', 'cancelled')
  RETURNING request.id INTO v_request_id;

  IF v_request_id IS NOT NULL THEN
    UPDATE public.missing_contract_pdf_deliveries delivery
    SET status = 'cancelled',
        updated_at = now()
    WHERE delivery.request_id = v_request_id
      AND delivery.status IN ('pending', 'failed');

    INSERT INTO public.contract_operations_log (
      contract_id,
      company_id,
      operation_type,
      operation_details,
      notes,
      performed_by
    ) VALUES (
      NEW.contract_id,
      NEW.company_id,
      'signed_contract_pdf_request_fulfilled',
      jsonb_build_object(
        'request_id', v_request_id,
        'document_id', NEW.id,
        'identity_status', NEW.legal_identity_match_status,
        'evidence_state', NEW.legal_evidence_state,
        'source', 'automatic_missing_contract_pdf_agent'
      ),
      'أُغلق طلب نسخة العقد تلقائياً بعد حفظ نسخة نشطة ومطابقة لهوية المستأجر.',
      NEW.uploaded_by
    );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.fulfill_missing_contract_pdf_request_v1()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_missing_contract_pdf_request_v1()
TO service_role;

DROP TRIGGER IF EXISTS trg_fulfill_missing_contract_pdf_request
ON public.contract_documents;
CREATE TRIGGER trg_fulfill_missing_contract_pdf_request
AFTER INSERT OR UPDATE OF file_path, document_type,
  legal_identity_match_status, legal_evidence_state
ON public.contract_documents
FOR EACH ROW
EXECUTE FUNCTION public.fulfill_missing_contract_pdf_request_v1();

CREATE OR REPLACE FUNCTION public.queue_quarantined_contract_pdf_request_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF NEW.contract_id IS NOT NULL
     AND NEW.document_type IN ('signed_contract', 'signed_contract_image')
     AND NULLIF(BTRIM(NEW.file_path), '') IS NOT NULL
     AND NEW.legal_evidence_state = 'quarantined'
     AND (
       TG_OP = 'INSERT'
       OR OLD.legal_evidence_state IS DISTINCT FROM NEW.legal_evidence_state
     ) THEN
    PERFORM public.enqueue_missing_contract_pdf_request_v1(
      NEW.company_id,
      NEW.contract_id,
      'identity_mismatch',
      NEW.uploaded_by
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.queue_quarantined_contract_pdf_request_v1()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_queue_quarantined_contract_pdf_request
ON public.contract_documents;
CREATE TRIGGER trg_queue_quarantined_contract_pdf_request
AFTER INSERT OR UPDATE OF file_path, document_type, legal_evidence_state
ON public.contract_documents
FOR EACH ROW
EXECUTE FUNCTION public.queue_quarantined_contract_pdf_request_v1();

-- Repair the rollout gap idempotently. Existing open requests are reused, so
-- the already-sent Elias request is not duplicated.
DO $backfill$
DECLARE
  v_contract record;
BEGIN
  FOR v_contract IN
    SELECT document.company_id, document.contract_id
    FROM public.contract_documents document
    WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_evidence_state = 'quarantined'
      AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.contract_documents active_document
        WHERE active_document.company_id = document.company_id
          AND active_document.contract_id = document.contract_id
          AND active_document.document_type IN ('signed_contract', 'signed_contract_image')
          AND active_document.legal_identity_match_status = 'matched'
          AND active_document.legal_evidence_state = 'active'
          AND NULLIF(BTRIM(active_document.file_path), '') IS NOT NULL
      )
    GROUP BY document.company_id, document.contract_id
  LOOP
    PERFORM public.enqueue_missing_contract_pdf_request_v1(
      v_contract.company_id,
      v_contract.contract_id,
      'identity_mismatch',
      NULL
    );
  END LOOP;
END;
$backfill$;

COMMENT ON FUNCTION public.queue_quarantined_contract_pdf_request_v1() IS
  'Queues a replacement-PDF request whenever signed evidence becomes quarantined.';

COMMIT;
