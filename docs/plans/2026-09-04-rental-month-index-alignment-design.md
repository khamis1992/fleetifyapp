# Rental month uniqueness and traffic classification — local candidate

## Evidence and selected repair

The previous goal turn implemented and verified financial-report acknowledgement
guards and Qatar month selection. This turn fixes another known business-path
failure rather than treating those narrower results as whole-page completion.

Fresh read-only production inspection confirmed the actual index is valid/ready,
has no comment, and has definition MD5 `c44b733f2b1368ce7c965cf484140c3c`.
`invoice_number` is varchar, invoice/date/status columns match the type/reference
checks. The existing unique index excludes penalty-linked invoices but not a
TV-prefix invoice with null penalty_id. The rental core and v2 preflight already
exclude both. Thus the core attempts a correct new rental invoice but the old
index rejects it. The original test retains this pre-migration failure as proof.

Selected design: keep the same unique key, active lifecycle predicates, month
fallback, and penalty exclusion; add only the existing normalized traffic-prefix
predicate. Do not remove uniqueness, ignore insertion failures, change amounts,
rename existing invoices or invent penalty links. Generic service invoices remain
subject to rental uniqueness. No invoice, receipt, journal or schedule is changed
by this migration.

## Implementation and rollback

- CLI-created migration:
  `20260904013746_align_rental_month_uniqueness_with_traffic_classification.sql`.
- Definition guards reject absent/invalid/drifted indexes. Expected corrected
  definition hash is `ed4eba35fc39556da8207ce7350e329d`; replay is a no-op.
- A transaction and ACCESS EXCLUSIVE lock keep other writes out during the index
  replacement; `lock_timeout=5s`, `statement_timeout=30s` bound the operation.
  This intentionally is **not** an online/concurrent build. Lock/DDL performance
  on a full production-sized schema has not been measured.
- Existing index comments are preserved with SQL-literal quoting.
- Matching rollback restores the exact old definition only if representable.
  If rent now coexists with a TV-only invoice in the same month, rollback refuses
  before dropping the corrected index. It never deletes/relabels data to restore
  the obsolete invariant. Definition drift also blocks rollback.
- Tests use varchar invoice_number matching current production; the old fixture
  used text, which could conceal definition/cast differences.

## Verification

`node --test tests/database/contract-billing-graph.test.mjs tests/database/rental-month-summary.test.mjs`
passes **65 tests** (31 billing graph, 34 monthly reader).

New coverage runs the actual captured rental core and pending v2/index SQL:
TV-only, lower/padded and mixed-case references permit separate rental creation;
retry creates zero extras; traffic row stays byte-for-field unchanged; schedule
links and invoice items belong to rent; second rental insertion still raises
23505; relabelling traffic as conflicting rent is rejected; month fallback ignores
due_date; inactive replacement, round-trip/replay, preserved comment, missing/
changed index refusal and lossy rollback refusal are checked.

These are PGlite single-instance fixtures with accounting/authorization helper
doubles, not production trigger or multi-session concurrency proof. Native
postgres/pg_ctl/psql were not on PATH in this environment. Do not simulate two
connections by serial Promise calls and report them as a race test. Multi-session
DDL versus billing, duplicate insertion and cancellation races remain required.

## Release gates and next work

1. Rehearse on full-schema PostgreSQL with real journal/fee/due-date/receipt
   triggers and actual authorization. Test lock contention/timeout rollback,
   competing generation/cancellation and index validity after failed deployment.
2. Deploy only with the reviewed rental-core and billing-graph changes; changing
   the index alone does not repair an old core that still mistakes traffic for
   rent. Freshly recheck schema/function hashes and deploy authority beforehand.
3. Preserve review-only unknown service evidence. Reconcile the signed contract
   LTO2024276 and its out-of-period schedule separately; this index does not alter
   its dates or make its current invalid schedule billable.
4. Complete old receipt-count arrears consumer replacement, remaining contract
   actions, historical evidence repair and release verification. The broad
   automatic contract-details objective remains active and unproven.

Supabase current index docs were retrieved via search_docs:
https://supabase.com/docs/guides/database/postgres/indexes . They confirm regular
index builds block writes and distinguish concurrent builds. The previously
unavailable changelog markdown is not claimed as verified. No production schema
or data writes, publication, browser action, or frontend build occurred this turn.
