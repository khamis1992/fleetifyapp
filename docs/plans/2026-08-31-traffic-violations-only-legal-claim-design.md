# Traffic-violations-only legal claim

## Decision

The legal-transfer wizard supports two explicit claim scopes:

- `full_outstanding`: the existing rent-led legal claim.
- `traffic_violations_only`: only documented, unpaid traffic violations are claimed.

For contract `C-ALF-0069`, the approved scope is `traffic_violations_only`. Its expected claim is QAR 6,300 from two unpaid violations. Rent invoices and the late fine are excluded.

## Data flow

The wizard records `claim_scope` in the immutable transfer-readiness operation details. A scoped conversion RPC verifies that the requested scope matches the latest completed readiness review, creates the legal case through the existing guarded workflow, and stores the scope on `legal_cases`.

`calculate_legal_claim_amount_v1` is the filing-time authority. When the case scope is traffic-only, it returns only unpaid penalties and returns zero unless a traffic-violation proof document exists. The lawsuit preparation screen, claims statement, memo snapshot, and Taqadi payload read the same case scope and remove rent, contractual compensation, damages, retention, and deposit adjustments.

## User experience and validation

Selecting traffic-only automatically excludes every invoice with a standard audit reason, fixes the claim amount to the unpaid-violation total, and prevents manual editing. The final review names the chosen scope and lists the excluded invoice balance.

The database rejects unsupported scopes, a traffic-only claim with no unpaid violations, or a conversion whose scope differs from the latest readiness review. Existing cases default to `full_outstanding`, preserving current behavior.

## Verification

Tests cover scope normalization, financial projection, request wording, memo/claims filtering, and the conversion payload. Database verification checks the new constraint, function grants, the traffic-only canonical amount, and the stored audit details.
