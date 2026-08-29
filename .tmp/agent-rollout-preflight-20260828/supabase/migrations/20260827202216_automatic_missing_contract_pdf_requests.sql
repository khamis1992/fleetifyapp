-- Automatically request a correct signed-contract PDF when legal preparation
-- finds no direct, identity-matched copy. Requests are durable, deduplicated,
-- delivered to configured staff numbers, and closed only after identity match.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE TABLE public.missing_contract_pdf_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  display_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT missing_contract_pdf_recipients_phone_format
    CHECK (phone_e164 ~ '^974[0-9]{8}$'),
  CONSTRAINT missing_contract_pdf_recipients_company_phone_key
    UNIQUE (company_id, phone_e164)
);

CREATE TABLE public.missing_contract_pdf_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  request_kind text NOT NULL DEFAULT 'signed_contract_pdf',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  contract_number text NOT NULL,
  customer_name text NOT NULL,
  vehicle_plate text,
  requested_by uuid,
  first_requested_at timestamptz NOT NULL DEFAULT now(),
  last_requested_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  fulfilled_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT missing_contract_pdf_requests_kind_check
    CHECK (request_kind = 'signed_contract_pdf'),
  CONSTRAINT missing_contract_pdf_requests_reason_check
    CHECK (reason IN ('missing', 'identity_mismatch')),
  CONSTRAINT missing_contract_pdf_requests_status_check
    CHECK (status IN ('pending', 'sending', 'partial', 'sent', 'failed', 'fulfilled', 'cancelled'))
);

CREATE UNIQUE INDEX missing_contract_pdf_requests_one_open_idx
  ON public.missing_contract_pdf_requests(company_id, contract_id, request_kind)
  WHERE status NOT IN ('fulfilled', 'cancelled');

CREATE INDEX missing_contract_pdf_requests_dispatch_idx
  ON public.missing_contract_pdf_requests(company_id, status, created_at)
  WHERE status IN ('pending', 'sending', 'partial', 'failed');

CREATE TABLE public.missing_contract_pdf_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.missing_contract_pdf_requests(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  provider_message_id text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT missing_contract_pdf_deliveries_phone_format
    CHECK (phone_e164 ~ '^974[0-9]{8}$'),
  CONSTRAINT missing_contract_pdf_deliveries_status_check
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  CONSTRAINT missing_contract_pdf_deliveries_attempts_check
    CHECK (attempts BETWEEN 0 AND 5),
  CONSTRAINT missing_contract_pdf_deliveries_request_phone_key
    UNIQUE (request_id, phone_e164)
);

CREATE INDEX missing_contract_pdf_deliveries_dispatch_idx
  ON public.missing_contract_pdf_deliveries(company_id, status, created_at)
  WHERE status IN ('pending', 'sending', 'failed');

ALTER TABLE public.missing_contract_pdf_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missing_contract_pdf_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missing_contract_pdf_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.missing_contract_pdf_recipients,
  public.missing_contract_pdf_requests,
  public.missing_contract_pdf_deliveries
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE
  public.missing_contract_pdf_recipients,
  public.missing_contract_pdf_requests,
  public.missing_contract_pdf_deliveries
TO service_role;

INSERT INTO public.missing_contract_pdf_recipients (
  company_id,
  phone_e164,
  display_name
)
VALUES
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, '97466707063', 'مسؤول العقود 1'),
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, '97431151919', 'مسؤول العقود 2'),
  ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, '97431411919', 'مسؤول العقود 3')
ON CONFLICT (company_id, phone_e164) DO UPDATE
SET active = true,
    display_name = EXCLUDED.display_name,
    updated_at = now();

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
    bool_or(document.legal_identity_match_status = 'matched'),
    bool_or(document.legal_identity_match_status IN ('pending', 'unverified')),
    bool_or(document.legal_identity_match_status IN ('mismatch', 'failed'))
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
     OR NEW.legal_identity_match_status <> 'matched' THEN
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
        'source', 'automatic_missing_contract_pdf_agent'
      ),
      'أُغلق طلب نسخة العقد تلقائياً بعد حفظ نسخة مطابقة لهوية المستأجر.',
      NEW.uploaded_by
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_fulfill_missing_contract_pdf_request
ON public.contract_documents;
CREATE TRIGGER trg_fulfill_missing_contract_pdf_request
AFTER INSERT OR UPDATE OF file_path, document_type, legal_identity_match_status
ON public.contract_documents
FOR EACH ROW
EXECUTE FUNCTION public.fulfill_missing_contract_pdf_request_v1();

-- A legal-ready copy must be directly attached to this contract and must have
-- passed the customer/tenant identity check. Plate aliases are never accepted.
ALTER FUNCTION public.get_legal_transfer_readiness_v1(uuid, uuid)
  RENAME TO get_legal_transfer_readiness_v1_pre_pdf_request_agent;

CREATE FUNCTION public.get_legal_transfer_readiness_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_result jsonb;
  v_request jsonb;
  v_has_matched boolean;
BEGIN
  v_result := public.get_legal_transfer_readiness_v1_pre_pdf_request_agent(
    p_company_id,
    p_contract_id
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.contract_id = p_contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
      AND document.legal_identity_match_status = 'matched'
  ) INTO v_has_matched;

  IF v_has_matched THEN
    v_request := jsonb_build_object('status', 'not_required', 'ready', true);
  ELSE
    v_request := public.enqueue_missing_contract_pdf_request_v1(
      p_company_id,
      p_contract_id,
      NULL,
      auth.uid()
    );
  END IF;

  RETURN v_result || jsonb_build_object(
    'signed_contract_ready', v_has_matched,
    'signed_contract_identity_required', true,
    'signed_contract_request', v_request
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_legal_transfer_readiness_v1(uuid, uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_legal_transfer_readiness_v1(uuid, uuid)
TO authenticated, service_role;

ALTER FUNCTION public.complete_legal_transfer_readiness_v1(uuid, uuid, jsonb, uuid)
  RENAME TO complete_legal_transfer_readiness_v1_pre_pdf_request_agent;

CREATE FUNCTION public.complete_legal_transfer_readiness_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_payload jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_request jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.contract_id = p_contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
      AND document.legal_identity_match_status = 'matched'
  ) THEN
    -- Authorize through the original readiness path before creating a request.
    PERFORM public.get_legal_transfer_readiness_v1_pre_pdf_request_agent(
      p_company_id,
      p_contract_id
    );
    v_request := public.enqueue_missing_contract_pdf_request_v1(
      p_company_id,
      p_contract_id,
      NULL,
      COALESCE(auth.uid(), p_actor_id)
    );
    RETURN jsonb_build_object(
      'success', false,
      'blocked', true,
      'code', 'missing_verified_signed_contract',
      'message_ar', 'لا توجد نسخة عقد PDF مطابقة للعميل. تم إنشاء طلب واتساب تلقائي للمسؤولين.',
      'signed_contract_request', v_request
    );
  END IF;

  RETURN public.complete_legal_transfer_readiness_v1_pre_pdf_request_agent(
    p_company_id,
    p_contract_id,
    p_payload,
    p_actor_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_v1(
  uuid, uuid, jsonb, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_v1(
  uuid, uuid, jsonb, uuid
) TO authenticated, service_role;

ALTER FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) RENAME TO convert_contract_to_legal_v1_pre_pdf_request_agent;

CREATE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_vehicle_returned boolean,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_request jsonb;
  v_existing_case boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = p_company_id
      AND legal_case.contract_id = p_contract_id
      AND lower(COALESCE(legal_case.case_status, '')) IN (
        'open', 'active', 'pending', 'on_hold', 'under_review'
      )
  ) INTO v_existing_case;

  IF v_existing_case THEN
    RETURN public.convert_contract_to_legal_v1_pre_pdf_request_agent(
      p_company_id,
      p_contract_id,
      p_notes,
      p_priority,
      p_case_type,
      p_vehicle_returned,
      p_actor_id
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.contract_id = p_contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
      AND document.legal_identity_match_status = 'matched'
  ) THEN
    -- The original readiness function performs the existing company/member
    -- authorization checks. Do not let the early return become an enqueue API.
    PERFORM public.get_legal_transfer_readiness_v1_pre_pdf_request_agent(
      p_company_id,
      p_contract_id
    );
    v_request := public.enqueue_missing_contract_pdf_request_v1(
      p_company_id,
      p_contract_id,
      NULL,
      COALESCE(auth.uid(), p_actor_id)
    );
    RETURN jsonb_build_object(
      'success', false,
      'blocked', true,
      'code', 'missing_verified_signed_contract',
      'message_ar', 'لا توجد نسخة عقد PDF مطابقة للعميل. تم إنشاء طلب واتساب تلقائي للمسؤولين ولن تُنشأ القضية قبل رفع النسخة الصحيحة.',
      'signed_contract_request', v_request
    );
  END IF;

  RETURN public.convert_contract_to_legal_v1_pre_pdf_request_agent(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    p_vehicle_returned,
    p_actor_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, boolean, uuid
) TO authenticated, service_role;

-- Rebind the compatibility overload to the guarded seven-argument function.
CREATE OR REPLACE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
  SELECT public.convert_contract_to_legal_v1(
    p_company_id,
    p_contract_id,
    p_notes,
    p_priority,
    p_case_type,
    false,
    p_actor_id
  );
$function$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid, uuid, text, text, text, uuid
) TO authenticated, service_role;

-- Register a dedicated scheduled identity. The plaintext secret exists only
-- in Vault and is passed to the matching Edge Function by pg_net.
DO $agent_identity$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.secrets secret
    WHERE secret.name = 'agent_secret_missing_contract_pdf'
  ) THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'agent_secret_missing_contract_pdf',
      'Dedicated scheduled identity for missing-contract-pdf-agent'
    );
  END IF;

  INSERT INTO public.agent_invocation_registry (
    agent_id,
    vault_secret_name,
    allowed_company_id,
    enabled,
    updated_at
  ) VALUES (
    'missing-contract-pdf-agent',
    'agent_secret_missing_contract_pdf',
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
    true,
    now()
  )
  ON CONFLICT (agent_id) DO UPDATE
  SET vault_secret_name = EXCLUDED.vault_secret_name,
      allowed_company_id = EXCLUDED.allowed_company_id,
      enabled = true,
      updated_at = now();
END;
$agent_identity$;

DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_project_url'
  ) OR NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key'
  ) THEN
    RAISE EXCEPTION 'Vault secrets supabase_project_url and supabase_anon_key are required';
  END IF;
END;
$preflight$;

SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname = 'missing-contract-pdf-agent';

SELECT cron.schedule(
  'missing-contract-pdf-agent',
  '* * * * *',
  $command$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_project_url'
      LIMIT 1
    ) || '/functions/v1/missing-contract-pdf-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'supabase_anon_key'
        LIMIT 1
      ),
      'apikey', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'supabase_anon_key'
        LIMIT 1
      ),
      'x-agent-id', 'missing-contract-pdf-agent',
      'x-agent-secret', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'agent_secret_missing_contract_pdf'
        LIMIT 1
      )
    ),
    body := jsonb_build_object(
      'action', 'scan_and_send',
      'companyId', '24bc0b21-4e2d-4413-9842-31719a3669f4',
      'maxRequests', 10
    ),
    timeout_milliseconds := 120000
  );
  $command$
);

-- Repair the documented 23-Aug-2026 plate-only mislink. Keep the row for
-- audit/evidence, but make it ineligible for legal readiness.
UPDATE public.contract_documents document
SET legal_identity_match_status = 'mismatch',
    legal_identity_expected_name = 'ألياس يعقوبي',
    legal_identity_extracted_name = 'حسن شريف',
    legal_identity_match_reason =
      'الملف نسخة من العقد 276 لحسن شريف وربط بعقد ألياس يعقوبي بمطابقة اللوحة فقط؛ غير صالح للجاهزية القانونية.',
    legal_identity_checked_at = now(),
    updated_at = now()
WHERE document.id = '7c0304c2-06f8-475d-b8c6-c689c2f9ec39'::uuid
  AND document.contract_id = '2732d28f-d460-4d25-8a1e-b7da3ae32323'::uuid
  AND document.file_path = '9ca3dc20-4978-40ce-9de0-fd4a8a3e87d9/1787428354666-e5bc3e99-77d3-4ab3-815e-ede0abe09a7a.pdf';

SELECT public.enqueue_missing_contract_pdf_request_v1(
  '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
  '2732d28f-d460-4d25-8a1e-b7da3ae32323'::uuid,
  'identity_mismatch',
  NULL
);

COMMENT ON TABLE public.missing_contract_pdf_requests IS
  'Durable, deduplicated requests for a correct identity-matched signed-contract PDF.';
COMMENT ON TABLE public.missing_contract_pdf_deliveries IS
  'One retry-safe WhatsApp delivery per request and configured staff recipient.';
COMMENT ON FUNCTION public.enqueue_missing_contract_pdf_request_v1(uuid,uuid,text,uuid) IS
  'Creates one open request only when no direct identity-matched signed contract exists.';

COMMIT;

;
