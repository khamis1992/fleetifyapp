# Clear customer invoice labels

## Goal

Display customer invoices by their accounting month, for example `فاتورة شهر 8/2025`, while preserving the immutable invoice number as a secondary accounting reference.

## Design

- Resolve the billing month from `invoice_month`, falling back to `invoice_date` for legacy invoices.
- Never derive the billing month from `due_date`, because it is the payment deadline rather than the accounting period.
- Add a shared formatter in `invoiceBillingMonth.ts` and use it in the customer invoice cards, the latest-invoice summary tile, and the printed outstanding statement.
- When neither billing date exists, fall back to the existing invoice number so the interface never shows an empty title.
- Keep `invoice_number` visible beneath the friendly label and in printed output for reconciliation and audit work.

## Verification

- Unit-test canonical month selection, legacy fallback, and missing-date behavior.
- Run the focused invoice-month test suite, customer details smoke tests, and a TypeScript check for the touched code.
