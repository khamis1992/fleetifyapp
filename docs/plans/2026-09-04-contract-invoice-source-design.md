# Complete contract invoice and schedule sources — 2026-09-04

Status: local repair, not deployed. No invoices, payments, customer terms,
schedule rows, journal entries or legal actions were changed in production.
Previous goal turn made concrete progress on the installment ledger; the
broader contract-details objective remains open.

## Current-state findings

The parent page's invoice query filtered by due_date >= contract start month,
before the billing validator saw its evidence. Its schedule-to-invoice lookup,
invoice read and actual schedule hook all used single capped responses. The
invoice query combined direct links and an unbounded schedule ID list in one
OR URL, without checking that schedule-linked invoices belonged to the same
customer/contract. Both parent invoice and payment cache keys lacked company.

The existing invoice query was copied into a callable service to reproduce its
behavior: 14 executed failures and 2 passes across 16 regression cases. This is
a mocked-transport reproduction of the code, not proof of production corruption.

## Design and implementation

Selected complete, scoped evidence reads over raising the server row cap or
silently ignoring problematic links. Raising a cap merely moves truncation;
ignoring links hides the very evidence the automatic audit needs.

`fetchContractInvoiceEvidence` now requires company, contract and customer,
pages links and invoices by stable ID to explicit EOF, splits unresolved IDs
into batches of at most 100, and de-duplicates by invoice ID. It preserves old,
undated and cancelled records for validation. A linked invoice with no direct
contract is accepted only with the same customer and explicit schedule link;
another customer/contract or an unavailable invoice produces a clear error.
All backend branches remain company-scoped. No privileged client is introduced.

The actual page calls this reader under a company/customer-scoped cache key,
and surfaces its Error message at the existing failed-source gate. It does not
turn a rejected read into an empty invoice list. The contract schedule hook
likewise reads all pages and validates row ownership, then restores installment
order for display. Its optional date filter remains for other callers; the
details page does not request that filter.

## Evidence

- 77 tests pass across seven suites: invoice evidence 16, schedule hook 11,
  mounted details source gates 14, installment builder 19, page reader 6,
  mounted installment UI 7, query invalidation 4.
- The details tests execute the actual page's invoice queryFn with a mocked
  service and check its scope/key and error propagation. Source transport and
  keyset behavior are tested separately. This is not a full browser/RLS test.
- App/node TypeScript passed. Targeted ESLint reports zero errors and one
  existing unused companyId warning elsewhere in usePaymentSchedules.
- Production build passed in 1m 20s (6,657 modules), with existing large-chunk,
  Browserslist, OpenCV browser-external and mixed-import warnings. No preview,
  live browser validation or deployment is implied.
- Fresh read-only SQL for LTO2024276: zero invoices under either direct-contract
  or schedule-link scope, zero unresolved links. Thus this source-filter defect
  is not being claimed as that contract's current error. Its out-of-period
  September 2027 installment remains unresolved.

Supabase's current [limit reference](https://supabase.com/docs/reference/javascript/using-modifiers-limit)
confirms that limit bounds a response, not total evidence. The changelog markdown
fetch failed with unsupported content type; relevant query behavior was checked
against local client usage and the official reference returned by docs search.

## Remaining work / next action

Follow-up: the parent payment query and attributed summary have now been
locally repaired and tested; see
[payment attribution audit](2026-09-04-contract-payment-attribution-design.md).
It reads allocation-only links and no longer substitutes cached paid totals
or gross receipts for applications. This does not yet unify the schedule and
installment-tab readers or fully distinguish invoice charge categories.

The invoice tab and other consumers need an end-to-end audit of how newly
visible out-of-period evidence is separated from collectible balances and
actions. These multi-request reads are not a transaction snapshot. Simultaneous
changes, source amount validation, full-schema triggers, the four reproduced
receipt-sync failures, canonical legal readers, pending deployment, signed-term
reconciliation and the rest of the contract page remain open. None is claimed
complete by these targeted tests.
