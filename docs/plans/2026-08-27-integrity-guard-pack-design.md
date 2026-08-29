# Integrity Guard Pack Design

## Outcome

Fleetify will extend its canonical system-audit control plane instead of adding
independent scheduled agents. Deterministic ownership rules run at the database
write boundary, historical drift is reported by the existing audit worker, and
ambiguous financial or documentary corrections remain human-reviewed.

The pack covers five gaps. Customer national IDs are converted to ASCII digits
with punctuation and whitespace removed before a company-scoped unique index is
evaluated. Payments and active invoice allocations are rejected when company,
contract, or customer ownership conflicts. A legal case linked to a contract
inherits the contract customer when omitted and rejects a contradictory client.
Signed documents retained on a proven document-only contract alias receive a
separate canonical link; the original document and source contract remain intact.
Finally, a service-only close-only RPC advances the existing two-full-snapshot
staleness guard, cancels stale review tasks, and marks their old findings ignored
without creating or refreshing work.

## Data flow and safety

Write-time triggers stop new contradictions before downstream totals, filings,
or evidence selection consume them. The accounting worker scans completed
payments and active allocations for pre-existing broken links, cross-contract
ownership, invoices missing a contract despite payment evidence, and receipts
that have neither allocation, contract context, nor an explicit customer-advance
classification. All of these are review findings; none receives an automatic
repair command.

The signed-document resolver uses only a unique `contract_number_history` alias,
the same company/customer, normalized plate, identical start date, and the
absence of independent financial, delinquency, or legal activity on the alias.
It records the relationship in `contract_document_canonical_links` and exposes a
service-only security-invoker view with `effective_contract_id`. It never changes
`contract_documents.contract_id` and never moves a stored file.

The close-only RPC shares the advisory lock used by the normal review-task sync.
It reads the latest completed full audit, advances missing counters once per
distinct run, and closes only after two missing snapshots. Its SQL contains no
insert into tasks or findings. Rollback removes executable guards and link
objects but intentionally does not reconstruct former national-ID punctuation,
which is not recoverable safely.

## Verification

Static migration tests assert trigger coverage, service-only privileges,
security-invoker view behavior, absence of close-only inserts, and matching
rollback objects. The targeted Vitest suite is followed by type checking and the
production Vite build. Before production rollout, run a Supabase dry-run and
aggregate preflight queries for normalized-ID conflicts and historical ownership
mismatches; deployment and repair of existing findings remain separate approved
operations.
