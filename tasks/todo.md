# Contract financial integration

## Plan

1. Extract one shared financial helper and cover it with failing tests
2. Use that helper in the contract header, stats, and financial dashboard
3. Expand invoice/payment queries to include note-linked orphan rows
4. Relink LTO2024276 migrated payments and generate missing monthly invoices
5. Recalculate contract totals and verify the live contract
6. Generalize the same data repair to all disconnected Al-Araf contracts

## Todos

- [x] Shared `deriveContractPageFinancials` helper + tests
- [x] Wire helper into contract details header/stats/dashboard
- [x] Show orphan invoices/payments matched by contract number
- [x] Data repair for LTO2024276 (relink + invoices + recalc)
- [x] Verify tests and live SQL
- [x] Generalized repair function + tests
- [x] Relink all mislinked migrated payments
- [x] Generate invoices for the 11 billable contracts with no invoices
- [x] Verify live totals

## Review

- Header, dashboard, and stats now use one helper. Empty invoices no longer show 100% collected.
- Payments/invoices whose notes mention the contract number appear on the page.
- Company repair function `repair_disconnected_contract_financials_v1` relinks note-mentioned receipts and builds the missing 36-month invoice graph.
- Live Al-Araf result: 73 payments relinked, 11 contracts invoiced (396 invoices). Each is 36 × 1,500 = 54,000. LTO2024136 skipped (monthly 0).
- Paid after FIFO/recalc: LTO202410 7,524 / LTO2024142 7,014 / LTO2024152 4,818 / LTO2024109 1,000 / LTO202456 1,035 / LTO2024276 2,500. Others unpaid.
