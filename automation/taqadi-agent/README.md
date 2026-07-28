# Taqadi Automation Agent

This Windows-side worker files prepared Fleetify legal cases in Taqadi using a
persistent Chrome profile and Playwright. Fleetify and the worker communicate
only through the durable Supabase queue, so closing or refreshing the ERP page
does not lose a filing job.

## Setup

1. Apply migration `20260728120000_taqadi_filing_automation.sql`.
2. Copy `.env.taqadi-agent.example` to `.env.taqadi-agent`.
3. Set the Supabase URL and **service-role key** only on the worker computer.
   When the repository's local `.env` already contains
   `SUPABASE_SERVICE_ROLE_KEY`, the worker reuses it without duplicating the key.
4. Complete the representative contact fields.
5. Run `npm run taqadi:agent`.
6. When Chrome opens for the first time, sign in as an individual litigant.

The Chrome session is stored under `.taqadi-agent/chrome-profile`. Do not share
that folder or commit it to source control.

## Safety behavior

- The worker handles one case at a time.
- Every filing has a database idempotency key.
- It validates the representative before all other parties.
- Company order is 1 and representative order is 2.
- Every attachment is normalized to an A4 PDF before upload.
- Final approval is automatic when all three approval flags are true.
- CAPTCHA, expired login, changed portal fields, and mismatched review data stop
  the case with `needs_human`.
- An error after clicking final approval is never retried automatically. The
  operator must verify Taqadi first to avoid a duplicate lawsuit.

## Health check

`http://127.0.0.1:4317/health`

The ERP reads worker heartbeat from Supabase, not from this local endpoint.
