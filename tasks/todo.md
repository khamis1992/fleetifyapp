# Contract financial integration

## Plan

1. Extract one shared financial helper and cover it with failing tests
2. Use that helper in the contract header, stats, and financial dashboard
3. Expand invoice/payment queries to include note-linked orphan rows
4. Relink LTO2024276 migrated payments and generate missing monthly invoices
5. Recalculate contract totals and verify the live contract

## Todos

- [x] Shared `deriveContractPageFinancials` helper + tests
- [x] Wire helper into contract details header/stats/dashboard
- [x] Show orphan invoices/payments matched by contract number
- [x] Data repair for LTO2024276 (relink + invoices + recalc)
- [x] Verify tests and live SQL

## Review

- Header, dashboard, and stats now use one helper. Empty invoices no longer show 100% collected.
- Payments/invoices whose notes mention the contract number appear on the page.
- LTO2024276 live state after repair: 36 invoices / 54,000, paid 2,500, remaining 51,500, status `partial`.
- The 1,250 PYINV3 migration invoices were left unlinked (wrong amount, already journalled).
- Extra schedule after 2027-08-15 was cancelled.
