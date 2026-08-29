# Scrapling adaptive layer for the Taqadi filing agent

## Outcome

Add Scrapling as an optional, local adaptive-selector memory beside the existing
Playwright Taqadi worker. Playwright remains the only component allowed to open
the portal, enter data, upload documents, click controls, or submit a lawsuit.

The layer is deliberately fail-open: if Scrapling is disabled, unavailable, or
cannot relocate a control, the current deterministic flow continues and the
existing Anthropic selector healer remains the final optional proposal source.

## Data boundary

The Node worker never sends a case document, entered field value, customer
identifier, or complete page DOM to Scrapling. It converts the existing
`PortalObservation` into a small synthetic HTML document containing only:

- control tag, type, id, name, role, and visibility state;
- normalized visible field label;
- structural wrappers used for similarity matching.

The sidecar listens on loopback only, requires a bearer token for every write
or lookup request, accepts only configured Taqadi HTTPS page hostnames, enforces
request-size limits, and never performs outbound HTTP requests.

## Learning and recovery flow

1. Playwright observes a stable Taqadi page.
2. The worker asynchronously sends the redacted control map to the local
   sidecar and asks it to remember controls under stable keys such as
   `id:CaseType` and `label:نوع الدعوى`.
3. A later release of Taqadi changes an id, name, label, or page structure and
   the normal field lookup fails.
4. Before calling the external LLM healer, the worker sends the current
   redacted control map and the old identifiers to Scrapling.
5. Scrapling tries a direct match, then its saved adaptive similarity match.
6. A returned proposal is converted to the existing `HealSuggestion` format.
7. The existing deterministic verifier checks that the proposed live control
   is visible, enabled, and matches its actual id or normalized label.
8. Only a high-confidence verified result becomes a session-only override, for
   one retry. It is never persisted as a permanent selector automatically.

## Operational design

- Python package: `automation/taqadi-scrapling`.
- Default address: `http://127.0.0.1:4318`.
- Default state: disabled.
- Adaptive database: `.taqadi-agent/scrapling` on the filing workstation.
- Health endpoint: `GET /health`.
- Authenticated endpoints: `POST /v1/remember` and `POST /v1/resolve`.
- The Taqadi worker records whether a heal proposal came from `scrapling` or
  `anthropic` in the existing audit artifact.

## Activation gate

Production activation requires installing the pinned Python package on the
Windows filing workstation, generating a long random shared loopback token,
starting the sidecar in that user's session, enabling the environment flag,
and passing a canary filing that stops before approval. The integration itself
does not weaken final-review checks, idempotency, or duplicate-submission
protection.
