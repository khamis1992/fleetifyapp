# Financial System E2E Test Plan

## Overview
This document outlines the comprehensive end-to-end test plan for the FleetifyApp financial system, covering payments, invoices, contracts, and financial workflows.

## Test Credentials
- **Email:** `khamis-1992@hotmail.com`
- **Password:** `123456789`
- **Base URL:** `http://localhost:8080`
- **Auth Route:** `/auth` (not `/login`)

## Key Routes & Pages

### Financial Pages
| Page | Route | Description |
|------|-------|-------------|
| Finance Hub | `/finance/hub` | Main financial dashboard with KPIs and quick actions |
| Billing Center | `/finance/billing` | Unified invoices and payments |
| Payments | `/finance/payments` | Unified payments page |
| Invoices | `/finance/invoices` | Invoices page |
| Receive Payment Workflow | `/finance/operations/receive-payment` | Payment creation workflow |
| Treasury | `/finance/treasury` | Cash and bank management |
| Reports | `/finance/reports` | Financial reports |

### Related Pages
| Page | Route | Description |
|------|-------|-------------|
| Customers | `/customers` | Customer management |
| Contracts | `/contracts` | Contract management |
| Dashboard | `/dashboard` | Main dashboard |

## Test Scenarios

### 1. Finance Hub Tests
**File:** `finance-hub.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| FH-001 | Navigate to Finance Hub and verify layout | P0 |
| FH-002 | Verify KPI cards display correctly | P0 |
| FH-003 | Quick Actions work correctly | P1 |
| FH-004 | Universal Search functionality | P1 |
| FH-005 | Activity Timeline displays recent activities | P1 |

### 2. Billing Center - Invoices Tests
**File:** `billing-invoices.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| BI-001 | Navigate to Billing Center and select Invoices tab | P0 |
| BI-002 | Display invoices list with correct data | P0 |
| BI-003 | Search invoices by customer name | P1 |
| BI-004 | Filter invoices by status (draft, pending, paid, overdue) | P1 |
| BI-005 | Sort invoices by amount, date, customer | P2 |
| BI-006 | View invoice details (preview) | P1 |
| BI-007 | Edit invoice details | P1 |
| BI-008 | Delete invoice with confirmation | P1 |
| BI-009 | Pay invoice from list | P0 |

### 3. Billing Center - Payments Tests
**File:** `billing-payments.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| BP-001 | Navigate to Billing Center and select Payments tab | P0 |
| BP-002 | Display payments list with correct data | P0 |
| BP-003 | Search payments by reference or customer | P1 |
| BP-004 | Filter payments by status and method | P1 |
| BP-005 | View payment details | P1 |
| BP-006 | Edit payment details | P2 |
| BP-007 | Delete payment with confirmation | P1 |

### 4. Create Invoice Workflow Tests
**File:** `invoice-workflow.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| IW-001 | Create new invoice via button | P0 |
| IW-002 | Fill invoice form with valid data | P0 |
| IW-003 | Select customer for invoice | P0 |
| IW-004 | Add line items to invoice | P0 |
| IW-005 | Set invoice due date | P0 |
| IW-006 | Preview invoice before saving | P1 |
| IW-007 | Save and create invoice | P0 |
| IW-008 | Verify invoice appears in list | P0 |
| IW-009 | Invoice with invalid data shows errors | P1 |

### 5. Create Payment Workflow Tests
**File:** `payment-workflow.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| PW-001 | Create new payment via button | P0 |
| PW-002 | Fill payment form with valid data | P0 |
| PW-003 | Select customer for payment | P0 |
| PW-004 | Select payment method (cash, bank, card) | P0 |
| PW-005 | Link payment to invoice | P0 |
| PW-006 | Preview payment before saving | P1 |
| PW-007 | Save and create payment | P0 |
| PW-008 | Verify payment appears in list | P0 |
| PW-009 | Payment with invalid data shows errors | P1 |

### 6. Invoice-Payment Matching Tests
**File:** `invoice-payment-matching.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| IPM-001 | Pay invoice from invoice list | P0 |
| IPM-002 | Verify invoice status changes to "paid" | P0 |
| IPM-003 | Partial payment updates invoice status | P1 |
| IPM-004 | Link payment to existing invoice | P0 |
| IPM-005 | Unlink payment from invoice | P2 |
| IPM-006 | View payment history for invoice | P1 |

### 7. Treasury and Deposits Tests
**File:** `treasury-deposits.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| TD-001 | Navigate to Treasury page | P1 |
| TD-002 | View cash balance | P1 |
| TD-003 | View bank balances | P1 |
| TD-004 | Create new deposit | P1 |
| TD-005 | View deposits list | P1 |
| TD-006 | Filter deposits by date range | P2 |

### 8. Financial Reports Tests
**File:** `financial-reports.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| FR-001 | Navigate to Reports page | P1 |
| FR-002 | View revenue report | P1 |
| FR-003 | View expenses report | P1 |
| FR-004 | View profit & loss statement | P2 |
| FR-005 | Export report to PDF | P2 |
| FR-006 | Export report to Excel | P2 |

### 9. Contract Integration Tests
**File:** `contract-financial-integration.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| CFI-001 | Generate invoice from contract | P0 |
| CFI-002 | View contract financial summary | P1 |
| CFI-003 | View payment schedule for contract | P1 |
| CFI-004 | Link payment to contract invoice | P1 |

### 10. Cross-Functional Workflow Tests
**File:** `cross-functional-workflows.spec.ts`

| Test | Description | Priority |
|------|-------------|----------|
| XFW-001 | Full workflow: Create contract → Generate invoice → Receive payment | P0 |
| XFW-002 | Full workflow: Create customer → Create invoice → Process payment | P0 |
| XFW-003: Navigate through all financial pages | P1 |

## Test Data Requirements

### Test Customers
- Active customer with invoices
- Customer with no invoices
- Customer with overdue invoices

### Test Contracts
- Active contract
- Contract with pending invoices
- Contract with completed payments

### Test Invoices
- Draft invoice
- Pending invoice
- Paid invoice
- Overdue invoice

### Test Payments
- Cash payment
- Bank transfer
- Card payment
- Linked payment (to invoice)
- Unlinked payment

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

// Billing Center Tabs
[data-value="invoices"]
[data-value="payments"]
[data-value="deposits"]

// Tables
[data-testid="invoices-table"]
[data-testid="payments-table"]
tbody tr

// Forms
input[name="customer"]
input[name="amount"]
input[name="due_date"]
textarea[name="notes"]

// Buttons
button:has-text("إنشاء فاتورة")
button:has-text("إنشاء دفعة")
button:has-text("دفع")
button:has-text("حفظ")
button:has-text("تعديل")
button:has-text("حذف")

// Dialogs
[role="dialog"]
text="معاينة الفاتورة"
text="معاينة الدفعة"

// Status Badges
[data-testid="status-badge"]
```

## Success Criteria

### All tests must:
1. ✅ Login successfully with provided credentials
2. ✅ Navigate to all financial pages without errors
3. ✅ Create, view, edit, and delete invoices
4. ✅ Create, view, edit, and delete payments
5. ✅ Link payments to invoices correctly
6. ✅ Update statuses appropriately
7. ✅ Search and filter correctly
8. ✅ Handle edge cases (invalid data, empty states)

## Test Execution Priority

### P0 (Critical - Must Pass)
- FH-001, BI-001, BI-002, BI-009
- BP-001, BP-002
- IW-001 through IW-008
- PW-001 through PW-008
- IPM-001, IPM-002, IPM-004
- CFI-001
- XFW-001, XFW-002

### P1 (High - Should Pass)
- FH-002 through FH-005
- BI-003 through BI-008
- BP-003 through BP-007
- IPM-003, IPM-006
- TD-001 through TD-006
- FR-001 through FR-004
- CFI-002 through CFI-004
- XFW-003

### P2 (Medium - Nice to Have)
- BI-005
- BP-005, BP-007
- IW-009
- PW-009
- IPM-005
- FR-005, FR-006

## Implementation Notes

### Parallel Execution
- Use test.describe.describe.serial() for dependent tests
- Use test.concurrent() for independent tests
- Limit parallel execution to avoid database locking

### Test Isolation
- Each test should be independent
- Clean up test data after test completion
- Use unique identifiers for test data

### Timeouts
- Increase timeouts for form submissions: `10000ms`
- Increase timeouts for navigation: `5000ms`

### Retry Logic
- Retry flaky tests up to 2 times
- Use `test.retries(2)` at test.describe level

---

**Last Updated:** January 15, 2026
**Test Coverage Target:** 85%+
