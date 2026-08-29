BEGIN;

CREATE OR REPLACE FUNCTION public.contract_terms_scan_batch_candidates(
  p_limit integer DEFAULT 4
)
RETURNS TABLE (
  contract_id uuid,
  company_id uuid,
  document_id uuid,
  contract_number text,
  contract_amount numeric,
  expected_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT
    contract.id,
    contract.company_id,
    document.id,
    contract.contract_number,
    contract.contract_amount,
    round(contract.monthly_amount * GREATEST(1, (
      (EXTRACT(YEAR FROM date_trunc('month', contract.end_date))
        - EXTRACT(YEAR FROM date_trunc('month', contract.start_date))) * 12
      + EXTRACT(MONTH FROM date_trunc('month', contract.end_date))
      - EXTRACT(MONTH FROM date_trunc('month', contract.start_date))
      + 1
    )::integer), 2)
  FROM public.contracts contract
  JOIN LATERAL (
    SELECT doc.id
    FROM public.contract_documents doc
    WHERE doc.contract_id = contract.id
      AND doc.company_id = contract.company_id
      AND doc.document_type IN ('signed_contract', 'signed_contract_image')
      AND doc.file_path IS NOT NULL
    ORDER BY doc.created_at DESC
    LIMIT 1
  ) document ON true
  WHERE contract.status IN ('active', 'under_legal_procedure')
    AND COALESCE(contract.monthly_amount, 0) > 0
    AND contract.start_date IS NOT NULL
    AND contract.end_date IS NOT NULL
    AND contract.end_date >= contract.start_date
    AND abs(contract.contract_amount - round(contract.monthly_amount * GREATEST(1, (
      (EXTRACT(YEAR FROM date_trunc('month', contract.end_date))
        - EXTRACT(YEAR FROM date_trunc('month', contract.start_date))) * 12
      + EXTRACT(MONTH FROM date_trunc('month', contract.end_date))
      - EXTRACT(MONTH FROM date_trunc('month', contract.start_date))
      + 1
    )::integer), 2)) > 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.contract_terms_scan_proposals proposal
      WHERE proposal.contract_id = contract.id
        AND proposal.status = 'pending'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.contract_terms_scan_proposals proposal
      WHERE proposal.contract_id = contract.id
        AND proposal.status = 'applied'
        AND proposal.created_at > now() - interval '30 days'
    )
  ORDER BY contract.updated_at ASC, contract.id
  LIMIT GREATEST(COALESCE(p_limit, 4), 1);
$function$;

REVOKE ALL ON FUNCTION public.contract_terms_scan_batch_candidates(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.contract_terms_scan_batch_candidates(integer)
  TO service_role;

COMMENT ON FUNCTION public.contract_terms_scan_batch_candidates(integer) IS
  'Bounded candidate list for the nightly signed-contract terms scan: mismatched amount, signed document present, no open or recent proposal.';

-- Nightly automatic scan at 03:10, after the audit orchestrator and before
-- the daily audit agent. Bounded batches keep the run inside the edge
-- function timeout; the candidate query is idempotent.
SELECT cron.schedule(
  'nightly-contract-terms-scan',
  '10 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/contract-terms-scanner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-agent-secret', COALESCE((
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'contract_scanner_secret' LIMIT 1
      ), '')
    ),
    body := jsonb_build_object('mode', 'batch', 'maxDocuments', 4, 'autoApply', true),
    timeout_milliseconds := 120000
  );
  $$
);

COMMIT;;
