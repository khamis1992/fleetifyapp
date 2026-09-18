# Contract schedule settlement read model — 2026-09-04

Status: local repair, not deployed. No production payment, invoice, schedule,
contract, legal action or message was created/changed. The previous goal turn
made verified progress on attributed invoice/payment summaries. This turn
continues the full contract-details audit; the overall goal remains open.

## Re-inspected defects

The snapshot still accepted cached schedule `paid_amount` or paid status as
proof of settlement. It selected a single row per month and dropped undated
rows, hiding duplicate/invalid evidence from the display. Its unpaid total
summed full installment amounts rather than remaining amounts.

The schedule tab filtered the raw `payments` prop by snapshot IDs/months, then
re-read raw status for cards, filters and next installment. It summed full
overdue amounts, rounded collection to 100 with a positive remainder, and its
details button only logged a row. These were not fixed by the preceding
attributed parent payment reader.

## Design and implementation

Selected a single evidence-driven collection read model over cached statuses
or automatic inference from matching month/amount. Financial collection and
signed contractual terms are different: preserve source rows and source receipt
amounts, derive display settlement, never persist a guessed allocation.

`buildScheduleSettlements` takes scoped invoices whose paid amounts have already
been reconstructed from completed receipt applications. Settlement is computed
only for an explicit, unique invoice link with matching month and amount. It
does not consume unlinked contract advances as if they settled an installment.
Missing/inactive invoices, duplicate invoice/schedule IDs, repeated schedule
months, one invoice reused by multiple installments, invalid dates/money,
overpayment and recognized non-rent charge invoices produce a review row with
unknown paid/remaining, not zero. No source array/object is mutated.

Known outcomes are paid/partial/pending/overdue. Remaining amounts use integer
currency subunits. Partial overdue rows retain partial status plus an overdue
flag, so both filters work. Qatar's business calendar defines due-today vs
overdue (including near UTC midnight). Invalid dates become null for display
and stay visible with an explanation rather than throwing during formatting.
This does not implement a midnight refresh timer.

The snapshot retains all active in-period and invalid-date schedule evidence,
derives paid count, unpaid sum and next known installment from this read model,
and includes ambiguous/stale schedule evidence in reconciliation warnings.
The financial diagnostic now reports schedule settlement mismatches too. The
health score cannot enter its existing 80+ "good" band during reconciliation.
The parent's completion indicator also requires zero balance, coverage and no
financial review; a positive sub-QAR balance cannot be completed.

The schedule tab no longer receives raw schedule rows. Its cards, timeline,
filters and totals read the same snapshot rows, display remaining vs original
value, expose partial/review filters and warn that unknown amounts are excluded
from proven overdue totals, not forgiven. It cannot show "no open installments"
while unresolved rows exist. Cached payment dates are not shown as proven
settlement dates. The now-functional read-only details dialog derives the
selected row from the current snapshot, including after refresh/cancellation.

The parent's official contract schedule still selects original source rows by
ID/month. This preserves terms rather than inserting derived collection status
into signed documents. Duplicate/month/date guards in the billing validator
remain in place. This is source inspection, not a printed-document E2E proof.

## Verification

- Three regression tests failed before snapshot integration: paid count remained
  one after cancellation, unpaid amount stayed 1500 after paying 500, and three
  duplicate/undated rows collapsed to one. All now pass.
- A mounted dialog test reproduced stale paid=500 after a refresh cancelled the
  receipt; selection now resolves the latest row and displays paid=0.
- Old cached-paid expectations were explicitly replaced by evidence-based
  assertions. A genuinely settled linked invoice still appears in the paid
  filter. No failing test was removed to make the suite green.
- 192 tests pass across 12 suites: payment evidence 39, invoice evidence 16,
  snapshot/diagnosis 25, schedule settlement utility 36, mounted schedule UI 8,
  mounted parent gates 16, mounted dashboard/hero 5, schedule hook 11,
  installment ledger 19, paginated reader 6, mounted installment UI 7,
  query invalidation 4.
- The new schedule UI tests mount the actual tab, filters and Radix dialog with
  real motion components, but use in-memory fixtures and a fixed Date. They are
  not real browser, production RLS, server trigger or network tests.
- TypeScript app/node passed. Targeted ESLint passed without warnings/errors.
- Production build passed in 1m 23s (6,659 modules), with existing Browserslist,
  OpenCV externals, mixed-import and large-chunk warnings. The generated contract
  chunk contains the final "نسبة تحصيل قيمة العقد" label and no old schedule-
  execution label, so the final wording change is included in the build. This
  label distinguishes money collected for the contract from paid installment
  counts when unlinked advances or ambiguous schedules exist.
- Targeted `git diff --check` passed. No preview/live browser or deployment was
  performed; opening the live page can invoke an automatic financial RPC.

## Remaining work / next actions

1. The separate payments/installment-ledger tab still uses its own source with
   inconsistent success-status filtering, no equivalent transaction-direction
   guard and large unbatched IN lists. Unify its data/filters/export semantics
   with attributed receipt evidence, without losing receipt gross values.
2. All contract principal summaries still need one authoritative invoice charge
   classification and currency validation. The schedule reader now rejects
   recognized charges, but that does not fix every parent/child invoice total.
3. Review partial schedules with multiple legitimate invoice components. The
   current explicit one-to-one read model surfaces ambiguous history; it does
   not repair links or merge old split invoices. Any repair needs proven source
   terms, atomic audited commands and relevant authorization.
4. Multi-request snapshots, overnight date refresh, overpayment treatment,
   invoice/schedule malformed monetary inputs outside this utility, and print/
   payment action boundaries remain to verify end to end.
5. Four reproduced receipt synchronization defects remain, as do legacy receipt
   dependencies, fee accounting, canonical legal readers, pending deployments,
   LTO2024276 signed-term reconciliation and the rest of the contract page.
   Passing these suites is not proof that the requested fully automatic system
   is finished or error-free.

## Continuation: core-generated service rental classification

The previous read-only LTO2024276 date check reconfirmed the known out-of-period
schedule, without correcting it. This continuation changes the actual installment
read path rather than treating that repeated diagnostic as completion.

Evidence in the captured live rental core shows it writes `invoice_type=service`.
The schedule utility nevertheless rejected all service invoices. Its old test
even asserted this incorrect rule. Added positive regression tests and a mounted
partial-payment/cancellation test first: **3 failed, 50 passed** before the fix.

The chosen design accepts service as an eligible type only after the existing
unique invoice link checks and subject to exact month/amount, lifecycle and paid
amount validation. It still rejects explicit traffic/penalty invoices, purchase
types, missing/duplicate links, ambiguous months and malformed amounts. This
does not classify an unlinked service fee as rent or mutate any invoice.

After the fix, **119 tests pass across six related suites**: utility 44, mounted
installment tab 9, financial snapshot/diagnosis 25, billing month 12, monthly
service parser 21 and monthly view 8. The new mounted test uses the real financial
snapshot and tab with in-memory receipt applications. It verifies that cancelling
a 500 payment changes the same 1500 installment from 1000 remaining to 1500,
and moves it out of the partial filter. It does not execute the production
cancellation command, triggers or browser network.

App/node type checks and targeted ESLint pass. No production writes, deployment,
full-suite or new production build were performed. Broader classification,
financial-trigger, legal reader, historical reconciliation and release gates
remain; the full contract-details goal is not complete.
