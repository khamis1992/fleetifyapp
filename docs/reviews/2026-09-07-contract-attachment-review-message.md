# Existing signed contract reported as missing

The reported contract `AGR-202504-424958` has one signed PDF in its own
`contract_documents` records. Its persisted status is `unverified`, evidence state
is `quarantined`, and OCR reason is `insufficient_identity_evidence`: the tenant
name was read but no full identity number was extracted. It is therefore present
as an attachment and not eligible as filing evidence.

The preparation context previously collapsed every failed selection into the
same "no matched copy" error. CSS truncated the reason to a single line and the
row only offered upload. The manual-review RPC additionally refused quarantined
files, so a human could not resolve this specific OCR failure through that flow.

Changes:

- Attachment diagnostics distinguish missing, present for review, conflicting
  active matched copies and eligible evidence. The ledger shows the uploaded
  filename, full reason, Arabic state and a link to the contract's document tab.
- The readiness explanation uses the same diagnostic without relaxing readiness.
  Failed source selection clears a previously ready URL from the document state.
- Migration `20260907203102` permits authorized review of the precise unreadable
  quarantine category. It does not approve or reactivate any row automatically.
  A human must inspect the signed file and provide a complete matching identity
  number, an explicit attestation and a reason against the current revision.
- Active evidence status and removal of the expired OCR deadline are recorded
  only inside a successful audited review. Proven mismatches, other quarantine
  reasons, superseded copies, company mismatches and duplicate approved copies
  remain blocked. Rollback preserves completed reviews.

Verification: 35 frontend tests and 12 PGlite database tests passed, including
wrong identity rejection, read-only preview, stale revision checks, audit,
idempotency, rollback and later supersession. Type checking and production build
passed (existing large-chunk warning). The live preparation page displays the
uploaded filename and "موجود — يحتاج مراجعة". After deploying the migration,
the reported document remains unverified and quarantined pending human review.
The authenticated manual-review preview was also verified in the browser: the
seven-page signed PDF and existing customer record load successfully, with the
observation/reason fields empty and approval disabled until human attestation.
No observation or approval was submitted. Live grants remain unchanged (private
definer implementation, invoker public facade, no anonymous execute); no related
new security advisor findings were reported.
