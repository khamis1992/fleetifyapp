-- ============================================================
-- Customer ID Scan Proposals (Vision OCR for contract documents)
-- ============================================================
-- Stores AI-generated proposals to update customer data based on
-- ID cards found inside contract documents (images / PDF pages).
--
-- Flow:
--   1. contract-id-scanner edge function (cron + on-upload) detects
--      ID card pages inside contract documents.
--   2. Extracted data is compared against the customer record.
--   3. Differences are stored here as 'pending' proposals.
--   4. User reviews a side-by-side diff in the contract page and
--      accepts/rejects each field. Nothing is applied automatically.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_id_scan_proposals (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id          uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  customer_id          uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  contract_document_id uuid REFERENCES public.contract_documents(id) ON DELETE CASCADE,

  -- Which page of the document contained the ID card (1-based, NULL for single images)
  page_number          integer,

  -- pending | accepted | rejected | partial (some fields accepted)
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'accepted', 'rejected', 'partial')),

  -- Array of field-level proposals:
  -- [{ "field": "national_id", "current_value": "...", "proposed_value": "...",
  --    "confidence": 0.95, "method": "ocr|normalized|dictionary|llm" }]
  proposed_changes     jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Raw structured extraction from the OCR step (debugging/audit)
  extracted_data       jsonb,
  raw_text             text,

  overall_confidence   numeric(4,3),
  error                text,

  reviewed_by          uuid,
  reviewed_at          timestamptz,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_id_scan_proposals IS
  'AI proposals to update customer data extracted from ID cards found in contract documents. Requires human review before applying.';

-- Only one pending proposal per document (re-scans update the same row)
CREATE UNIQUE INDEX IF NOT EXISTS customer_id_scan_proposals_pending_document_idx
  ON public.customer_id_scan_proposals (contract_document_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS customer_id_scan_proposals_company_status_idx
  ON public.customer_id_scan_proposals (company_id, status);

CREATE INDEX IF NOT EXISTS customer_id_scan_proposals_contract_idx
  ON public.customer_id_scan_proposals (contract_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.customer_id_scan_proposals_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_id_scan_proposals_updated_at
  ON public.customer_id_scan_proposals;
CREATE TRIGGER trg_customer_id_scan_proposals_updated_at
  BEFORE UPDATE ON public.customer_id_scan_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.customer_id_scan_proposals_set_updated_at();

-- ============================================================
-- RLS — company isolation (same pattern as the rest of the app)
-- ============================================================
ALTER TABLE public.customer_id_scan_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_id_scan_proposals_select ON public.customer_id_scan_proposals;
CREATE POLICY customer_id_scan_proposals_select
  ON public.customer_id_scan_proposals FOR SELECT
  USING (company_id = get_user_company(auth.uid()));

DROP POLICY IF EXISTS customer_id_scan_proposals_insert ON public.customer_id_scan_proposals;
CREATE POLICY customer_id_scan_proposals_insert
  ON public.customer_id_scan_proposals FOR INSERT
  WITH CHECK (company_id = get_user_company(auth.uid()));

DROP POLICY IF EXISTS customer_id_scan_proposals_update ON public.customer_id_scan_proposals;
CREATE POLICY customer_id_scan_proposals_update
  ON public.customer_id_scan_proposals FOR UPDATE
  USING (company_id = get_user_company(auth.uid()));

DROP POLICY IF EXISTS customer_id_scan_proposals_delete ON public.customer_id_scan_proposals;
CREATE POLICY customer_id_scan_proposals_delete
  ON public.customer_id_scan_proposals FOR DELETE
  USING (company_id = get_user_company(auth.uid()));

-- ============================================================
-- Scheduled batch scan (every 15 minutes) for already-uploaded
-- contract documents. Requires pg_cron, pg_net and a Vault secret
-- named 'contract_scanner_secret' matching the Edge Function
-- secret CONTRACT_SCANNER_SECRET.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

SELECT cron.unschedule('contract-id-scanner')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'contract-id-scanner'
);

SELECT cron.schedule(
  'contract-id-scanner',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/contract-id-scanner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scanner-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'contract_scanner_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object(
      'mode', 'batch',
      'limit', 10
    )
  );
  $$
);
