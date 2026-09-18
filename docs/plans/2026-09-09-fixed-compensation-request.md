# Fixed compensation request

The requested Arabic label is «تعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع» and the amount is QAR 10,000.

The private claim-register projection adds one primary row, `fixed_general_compensation`, only when the case's litigation profile explicitly selects `fixed_compensation_requested`. It defaults to false and must match the current case ID. Installing the migration changes no existing claim amount. The request contributes once to `additional_primary`, the damages component and the total, so the preparation screen, memorandum financial table, final requests, claims statement, ZIP summary and Taqadi payload share the same amount. It is requested relief subject to the court's assessment, not a posted invoice, proven expense or adjudicated award. The narrative does not invent supporting evidence or a retention period.

Traffic-only claims, zero claims and reviewed no-claim closures receive no fixed request. Existing payments, invoices, court filing records and immutable memo snapshots are unchanged. Existing snapshot comparisons reject a stale package after the calculation changes; the memorandum must be regenerated before a new filing approval.

Migration: `20260909184802_fixed_legal_compensation_request.sql`. The matching guarded rollback restores the exact prior function and retains all records and the opt-in selection. No new grants, tables or security-definer functions are introduced. The original global-default proposal was rejected by automatic approval review and never applied; this opt-in design replaces it. Activation is limited to the contract requested by the user, LTO2024268.

Verification covers repeat calculations, totals, other claims, company authorization, exclusions, frozen snapshot compatibility, rollback, Arabic UI, statement/memo/final-request consistency and absence of invented expense evidence.
