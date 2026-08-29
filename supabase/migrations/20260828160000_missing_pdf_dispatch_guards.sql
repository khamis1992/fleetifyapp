-- WhatsApp dispatch rate controls for missing-contract-pdf-agent.
-- Root cause: a single run dispatched a bulk burst (~100 messages) and the
-- sending number was banned by WhatsApp. These controls make the agent
-- drip-feed deliveries: a hard daily cap per sending number, a minimum
-- interval between any two sends from the same number, and per-run batching
-- so a backlog drains over multiple cron cycles instead of one blast.

BEGIN;

-- ============================================================
-- 1) Per-sender-number send ledger (source of truth for caps)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.missing_contract_pdf_send_log (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  delivery_id uuid NOT NULL REFERENCES public.missing_contract_pdf_deliveries(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text
);

CREATE INDEX IF NOT EXISTS missing_contract_pdf_send_log_daily_idx
  ON public.missing_contract_pdf_send_log(company_id, phone_e164, sent_at);

ALTER TABLE public.missing_contract_pdf_send_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.missing_contract_pdf_send_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.missing_contract_pdf_send_log TO service_role;

-- ============================================================
-- 2) Adjustable dispatch guard config per company
--    daily_send_cap            : max deliveries per sender number per Qatar day
--    min_seconds_between_sends : minimum gap between two sends from same number
--    per_run_max_deliveries    : max sends per cron run (batch pacing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.missing_contract_pdf_dispatch_guards (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  daily_send_cap integer NOT NULL DEFAULT 24 CHECK (daily_send_cap BETWEEN 1 AND 200),
  min_seconds_between_sends integer NOT NULL DEFAULT 180 CHECK (min_seconds_between_sends BETWEEN 0 AND 3600),
  per_run_max_deliveries integer NOT NULL DEFAULT 6 CHECK (per_run_max_deliveries BETWEEN 1 AND 50),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.missing_contract_pdf_dispatch_guards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.missing_contract_pdf_dispatch_guards FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.missing_contract_pdf_dispatch_guards TO service_role;

INSERT INTO public.missing_contract_pdf_dispatch_guards (company_id)
VALUES ('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid)
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================
-- 3) Guard: may this sender send right now? (+ how long to wait)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_missing_contract_pdf_send_window_v1(
  p_company_id uuid,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_daily_cap integer;
  v_min_gap integer;
  v_sent_today integer;
  v_last_send timestamptz;
  v_wait_seconds integer := 0;
BEGIN
  SELECT daily_send_cap, min_seconds_between_sends
  INTO v_daily_cap, v_min_gap
  FROM public.missing_contract_pdf_dispatch_guards
  WHERE company_id = p_company_id;

  IF v_daily_cap IS NULL THEN
    v_daily_cap := 24;
    v_min_gap := 180;
  END IF;

  SELECT count(*), max(sl.sent_at)
  INTO v_sent_today, v_last_send
  FROM public.missing_contract_pdf_send_log sl
  WHERE sl.company_id = p_company_id
    AND sl.phone_e164 = p_phone
    AND sl.sent_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Qatar') AT TIME ZONE 'Asia/Qatar');

  IF v_last_send IS NOT NULL THEN
    v_wait_seconds := GREATEST(
      0,
      v_min_gap - EXTRACT(EPOCH FROM (now() - v_last_send))::integer
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_sent_today < v_daily_cap AND v_wait_seconds = 0,
    'sent_today', v_sent_today,
    'daily_cap', v_daily_cap,
    'wait_seconds', v_wait_seconds
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.check_missing_contract_pdf_send_window_v1(uuid, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_missing_contract_pdf_send_window_v1(uuid, text)
TO service_role;

COMMIT;