# Financial System E2E Tests

This directory contains comprehensive end-to-end tests for the FleetifyApp financial system.

## Test Files

| File | Description | Test Count |
|------|-------------|------------|
| `finance-hub.spec.ts` | Finance Hub dashboard tests | 7 tests |
| `billing-invoices.spec.ts` | Billing Center - Invoices tab tests | 9 tests |
| `billing-payments.spec.ts` | Billing Center - Payments tab tests | 8 tests |
| `invoice-workflow.spec.ts` | Invoice creation workflow tests | 9 tests |
| `payment-workflow.spec.ts` | Payment creation workflow tests | 9 tests |
| `invoice-payment-matching.spec.ts` | Invoice-Payment relationship tests | 6 tests |
| `cross-functional-workflows.spec.ts` | Cross-module workflow tests | 5 tests |

**Total Tests:** 53 tests

## Test Credentials

- **Email:** `khamis-1992@hotmail.com`
- **Password:** `123456789`
- **Base URL:** `http://localhost:8080`
- **Auth Route:** `/auth` (not `/login`)

## Running Tests

### Run all financial tests:
```bash
npm run test:e2e -- tests/e2e/finance-*.spec.ts tests/e2e/billing-*.spec.ts tests/e2e/invoice-*.spec.ts tests/e2e/payment-*.spec.ts tests/e2e/cross-*.spec.ts
```

### Run specific test file:
```bash
npm run test:e2e -- tests/e2e/finance-hub.spec.ts
```

### Run in headed mode (with browser UI):
```bash
npm run test:e2e -- --headed tests/e2e/finance-hub.spec.ts
```

### Run with debug mode:
```bash
npm run test:e2e -- --debug tests/e2e/finance-hub.spec.ts
```

## Test Coverage by Module

### Finance Hub (FH-001 to FH-007)
- Navigate to Finance Hub
- Verify KPI cards display
- Quick Actions functionality
- Universal Search
- Activity Timeline
- Navigation to Billing Center
- Navigation to Reports

### Billing Center - Invoices (BI-001 to BI-009)
- Navigate to Invoices tab
- Display invoices list
- Search invoices
- Filter by status
- Sort invoices
- View invoice details
- Edit invoice
- Delete invoice
- Pay invoice from list

### Billing Center - Payments (BP-001 to BP-008)
- Navigate to Payments tab
- Display payments list
- Search payments
- Filter by status and method
- View payment details
- Edit payment
- Delete payment
- Create new payment

### Invoice Workflow (IW-001 to IW-009)
- Create new invoice via button
- Fill invoice form with valid data
- Select customer for invoice
- Add line items
- Set due date
- Preview invoice before saving
- Save and create invoice
- Verify invoice appears in list
- Invoice with invalid data shows errors

### Payment Workflow (PW-001 to PW-009)
- Create new payment via button
- Fill payment form with valid data
- Select customer for payment
- Select payment method
- Link payment to invoice
- Preview payment before saving
- Save and create payment
- Verify payment appears in list
- Payment with invalid data shows errors

### Invoice-Payment Matching (IPM-001 to IPM-006)
- Pay invoice from invoice list
- Verify invoice status changes to "paid"
- Partial payment updates invoice status
- Link payment to existing invoice
- Unlink payment from invoice
- View payment history for invoice

### Cross-Functional Workflows (XFW-001 to XFW-005)
- Full workflow: Contract → Invoice → Payment
- Full workflow: Customer → Invoice → Payment
- Navigate through all financial pages
- Verify data consistency across modules
- Verify customer data flows to invoices

## Key Routes Tested

| Route | Description |
|-------|-------------|
| `/finance/hub` | Finance Hub dashboard |
| `/finance/billing` | Billing Center (invoices & payments) |
| `/finance/billing?tab=invoices` | Invoices tab |
| `/finance/billing?tab=payments` | Payments tab |
| `/finance/payments` | Payments page |
| `/finance/invoices` | Invoices page |
| `/finance/reports` | Reports page |
| `/finance/treasury` | Treasury page |
| `/contracts` | Contracts page |
| `/customers` | Customers page |

## UI Element Selectors

### Common Selectors
```typescript
// Auth
input[name="email"]
input[name="password"]
button[type="submit"]

// Navigation
text="المركز المالي"
text="المالية الموحدة"
text="الفواتير"
text="المدفوعات"

// Tabs
[data-value="invoices"]
[data-value="payments"]

// Tables
tbody tr
[data-testid="invoice-row"]
[data-testid="payment-row"]

// Forms
input[name="amount"]
input[name="due_date"]
textarea[name="notes"]
select[name="payment_method"]

// Buttons
button:has-text("إنشاء فاتورة")
button:has-text("إنشاء دفعة")
button:has-text("دفع")
button:has-text("حفظ")
button:has-text("تعديل")
button:has-text("حذف")

// Dialogs
[role="dialog"]
```

## Test Priorities

### P0 (Critical - Must Pass)
- FH-001: Navigate to Finance Hub
- BI-001, BI-002, BI-009: Invoices basic operations
- BP-001, BP-002: Payments basic operations
- IW-001 through IW-008: Invoice workflow
- PW-001 through PW-008: Payment workflow
- IPM-001, IPM-002, IPM-004: Invoice-Payment matching
- XFW-001, XFW-002: Cross-functional workflows

### P1 (High - Should Pass)
- FH-002 through FH-005
- BI-003 through BI-008
- BP-003 through BP-007
- IW-009
- PW-009
- IPM-003, IPM-006
- XFW-003, XFW-005

### P2 (Medium - Nice to Have)
- FH-006, FH-007
- BI-005
- BP-005, BP-007
- IPM-005
- XFW-004

## Notes

- All tests use the provided test credentials
- Tests are designed to be independent and can run in parallel
- Each test has proper wait times for UI to load
- Tests include graceful handling for elements that may not exist
- Tests verify both Arabic and English text where applicable

## Troubleshooting

### Tests failing due to element not found:
- Increase timeout values in specific tests
- Verify the application is running on port 8080
- Check if the application has been built recently

### Login issues:
- Verify credentials are correct
- Check if auth route is `/auth` not `/login`

### Network issues:
- Ensure the application server is running
- Check if all APIs are responding correctly
- Verify Supabase connection

## Status

**Last Updated:** January 15, 2026
**Total Tests:** 53
**Coverage Target:** 85%+
