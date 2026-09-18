# Stronger legal financial requests design

## Objective

Replace the fragmented financial and vehicle-related relief wording in the explanatory memo with one coherent, evidence-gated eight-part structure. Contract values, dates, rates and claim totals remain dynamic and must never be hard-coded in the template.

## Structure

The primary procedural and contract-ending requests remain first: admissibility, any alternative service-as-notice request, and expiry/rescission. A separate heading then introduces the financial and consequential relief in this order:

1. Net due rent through the latest due period, plus accruing contractual rent until rescission becomes effective when the legal path is judicial rescission.
2. Actual and complete vehicle return, with keys, documents and accessories, completed only by an actual handover record, when custody is recorded with the defendant.
3. Retention compensation from the day after termination/rescission becomes effective until actual handover, measured by documented market rental value and never overlapping rent for the same period.
4. Proven non-ordinary repairs, diminution in market value, missing accessories/keys, inspection, towing, recovery, impound and insurance costs.
5. Proven net loss of use/profit during the reasonable post-recovery repair period, kept separate from pre-handover retention compensation.
6. Proven monetary-delay damage after legally established notice under article 268, with the amount supplied by evidence or judicial assessment.
7. Verified traffic violations, fees and expenses incurred during custody.
8. Market value at the time return became due as alternative relief only if return in kind is impossible, without overlapping compensation.

Contractual compensation remains an additional evidence-gated request because it is not one of the eight heads supplied by the user and may appear only when a matching signed clause is linked.

## Data and safety rules

- Use the overdue balance, latest unpaid due date and contract monthly rent from the case state.
- Use documented termination date when available; otherwise describe the operative rescission date as the date determined by the court.
- Show quantified retention, material damage, post-recovery operational loss, monetary-delay damage and violations only when their existing evidence gates pass.
- Never combine contractual rent, retention compensation and loss of use for the same vehicle and period.
- Do not state that expert evidence exists; use “the documents and, where ordered, expert assessment”.

## Verification

- Generator tests cover dynamic rent/date/rate wording and each conditional request.
- Tests confirm no unsupported request appears without its qualifying evidence data.
- Focused Vitest, full TypeScript check and production build.

