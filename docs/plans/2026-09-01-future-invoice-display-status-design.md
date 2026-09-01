# Future invoice display status

## Goal

Prevent invoices whose due date is still in the future from appearing as currently due, while preserving their independent payment state and the ability to accept early payment.

## Design

- Keep persisted `payment_status` unchanged (`unpaid`, `partial`, `paid`, `cancelled`).
- Derive a display-only due status from `due_date`: `future`, `due_today`, `overdue`, or `unscheduled`.
- Show payment and due badges together in the contract invoice list so the two concepts are not conflated.
- Label all open balances in the summary as "غير المسدد" instead of "المستحق" because the total includes future invoices.
- Add future and due-today options to the existing status filter.
- Keep early-payment actions available for future invoices.

## Verification

- Unit-test future, today, overdue, missing, and invalid due dates.
- Verify contract `C-ALF-0069` shows invoice `INV-202612-00047` as "مستقبلية" rather than "مستحقة".
