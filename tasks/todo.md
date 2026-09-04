# Legal claim invoice filter

## Plan

1. Cover rental invoice types used by the billing generator (`service`, `rental`, `monthly`) plus legacy `sales`
2. Keep rejecting penalty-linked, purchase, unknown, and void invoices
3. Run the existing lawsuit filter tests

## Todos

- [x] Accept service/rental/monthly invoices in `isClaimableRentalInvoice`
- [x] Update filter tests
- [x] Run lawsuit filter tests

## Review

- `isClaimableRentalInvoice` now accepts `sales`, `service`, `rental`, and `monthly`.
- Penalty-linked, purchase, unknown, and void invoices stay excluded.
- LTO2024276 lawsuit prepare can now see its generated `service` rent invoices.
