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
- [ ] Relink all mislinked migrated payments
- [ ] Generate invoices for the 11 billable contracts with no invoices
- [ ] Verify live totals

## Review

- Header, dashboard, and stats now use one helper. Empty invoices no longer show 100% collected.
- Payments/invoices whose notes mention the contract number appear on the page.
- LTO2024276 live state after repair: 36 invoices / 54,000, paid 2,500, remaining 51,500, status `partial`.
- Next: apply the same repair across remaining disconnected contracts, not only LTO2024276.
