# Fleetify Financial System Architecture & Integration Points

**Document Version:** 1.0  
**Generated:** 2026-07-05  
**Company Context:** Al-Araf Car Rental (ID: `24bc0b21-4e2d-4413-9842-31719a3669f4`)  
**Tech Stack:** TypeScript (React frontend) + Python (audit/remediation scripts)  
**Database:** Supabase (PostgreSQL) via PostgREST API  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Core Database Schema](#2-core-database-schema)
3. [Financial Domain Tables](#3-financial-domain-tables)
4. [Integration Points & Data Flow](#4-integration-points--data-flow)
5. [Frontend Service Layer](#5-frontend-service-layer)
6. [Business Rules Engine](#6-business-rules-engine)
7. [Audit & Remediation Pipeline](#7-audit--remediation-pipeline)
8. [Known Issues & Remediation History](#8-known-issues--remediation-history)
9. [API & RPC Functions](#9-api--rpc-functions)
10. [Security & Access Control](#10-security--access-control)

---

## 1. System Overview

Fleetify is a **multi-company fleet management and financial accounting platform** built on Supabase (PostgreSQL). The financial subsystem implements a **full double-entry accounting model** with:

- **Chart of Accounts** (hierarchical, with Arabic/English naming)
- **Journal Entries** (double-entry, with status workflow: draft → posted → reversed)
- **Accounts Receivable/Payable** (invoices + payments linked to contracts)
- **General Ledger** with trial balance, account movements, and financial summaries
- **Multi-currency consolidation** with elimination entries
- **Budget control** with enforcement thresholds
- **Bank reconciliation** with statement matching
- **Annual close** with retained earnings transfer
- **Period management** (open/close/reopen with impact analysis)
- **Approval workflows** (multi-step, amount-based, branch-scoped)

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (TypeScript)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Hooks   │  │ Services │  │  Utils   │  │ Components │  │
│  │(React    │  │(Business │  │(Rules    │  │(UI Pages)  │  │
│  │ Query)   │  │ Logic)   │  │ Engine)  │  │            │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       └──────────────┴─────────────┴──────────────┘         │
│                          │                                   │
│              Supabase Client (PostgREST)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (REST + RPC)
┌──────────────────────────┴──────────────────────────────────┐
│                   Supabase Backend                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                      │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │   │
│  │  │journal_ │ │journal_  │ │chart_of│ │accounting│  │   │
│  │  │entries  │ │entry_    │ │accounts│ │_periods  │  │   │
│  │  │         │ │lines     │ │        │ │          │  │   │
│  │  └─────────┘ └──────────┘ └────────┘ └──────────┘  │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │   │
│  │  │payments │ │invoices  │ │contracts│ │customers │  │   │
│  │  └─────────┘ └──────────┘ └────────┘ └──────────┘  │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────────────┐   │   │
│  │  │banks    │ │cost_     │ │account_mappings    │   │   │
│  │  │         │ │centers   │ │(default_account_   │   │   │
│  │  │         │ │          │ │ types → coa)       │   │   │
│  │  └─────────┘ └──────────┘ └────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Database Functions (RPC)                 │   │
│  │  update_account_balances_from_entries                 │   │
│  │  process_pending_journal_entries                      │   │
│  │  process_failed_journal_entries                      │   │
│  │  process_overdue_invoices                             │   │
│  │  backfill_contract_invoices                           │   │
│  │  smart_backfill_contract_invoices                     │   │
│  │  create_payment_schedule_invoices                     │   │
│  │  fix_pending_payments                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              Python Audit & Remediation Scripts              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ audit_*.py   │  │ fix_*.py     │  │ verify_fixes.py  │  │
│  │ (diagnostic) │  │ (remediation)│  │ (post-fix check) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  audit-supabase-queries.py (schema/code validation)  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Database Schema

### 2.1 Table Summary

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `companies` | Multi-tenant company records | Parent to all company-scoped tables |
| `chart_of_accounts` | Hierarchical account structure | FK to self (parent_account_id), referenced by journal_entry_lines, account_mappings |
| `account_mappings` | Maps default_account_types → chart_of_accounts per company | FK: chart_of_accounts, default_account_types, companies |
| `default_account_types` | System-defined account type codes (CASH, RECEIVABLES, REVENUE, etc.) | Referenced by account_mappings |
| `journal_entries` | Double-entry transaction headers | FK: accounting_periods, profiles (created_by/posted_by), self (reversal_entry_id) |
| `journal_entry_lines` | Individual debit/credit lines per entry | FK: journal_entries, chart_of_accounts, fixed_assets, cost_centers, employees |
| `accounting_periods` | Fiscal period definitions (open/closed/locked) | Referenced by journal_entries |
| `invoices` | Customer/vendor invoices | FK: contracts, customers, vendors, cost_centers, fixed_assets, journal_entries |
| `payments` | Payment transactions (received/made) | FK: invoices, contracts, customers, vendors, chart_of_accounts, journal_entries, banks |
| `contracts` | Rental/service agreements | FK: customers, companies |
| `customers` | Customer master data | Referenced by invoices, payments, contracts |
| `vendors` | Vendor master data | Referenced by invoices, payments |
| `banks` | Bank account definitions | FK: companies |
| `bank_transactions` | Bank transaction records | FK: banks, journal_entries |
| `cost_centers` | Organizational cost centers | FK: self (parent_center_id), employees (manager_id) |
| `fixed_assets` | Fixed asset register | Referenced by journal_entry_lines, invoices |
| `monthly_obligations` | Recurring obligations (rent, installments, etc.) | FK: vendors, vehicles, fixed_assets, cost_centers, chart_of_accounts |
| `monthly_obligation_installments` | Individual installment payments | FK: monthly_obligations, journal_entries, bank_transactions |
| `pending_journal_entries` | Queue for auto-generated journal entries | FK: companies, contracts |
| `budgets` | Budget definitions per cost center/account | FK: companies, cost_centers, chart_of_accounts |
| `account_deletion_log` | Audit trail for deleted accounts | FK: chart_of_accounts |

---

## 3. Financial Domain Tables (Detailed)

### 3.1 `journal_entries` — Double-Entry Transaction Headers

```
Columns:
  id                  UUID (PK)
  company_id          UUID (FK → companies)
  entry_number        TEXT (unique per company)
  entry_date          DATE
  description         TEXT
  status              TEXT ('draft' | 'posted' | 'reversed' | 'rejected')
  total_debit         NUMERIC
  total_credit        NUMERIC
  reference_type      TEXT ('payment' | 'invoice' | 'closing' | 'payroll' | etc.)
  reference_id        UUID (polymorphic FK)
  accounting_period_id UUID (FK → accounting_periods)
  reversal_entry_id   UUID (FK → self, for reversals)
  created_by          UUID (FK → profiles)
  posted_by           UUID (FK → profiles)
  posted_at           TIMESTAMPTZ
  reviewed_by         UUID
  reviewed_at         TIMESTAMPTZ
  reversed_by         UUID
  reversed_at         TIMESTAMPTZ
  rejection_reason    TEXT
  workflow_notes      TEXT
  created_at / updated_at
```

**Status Workflow:**
```
draft ──→ posted ──→ reversed
  │         │
  └──→ rejected
```

### 3.2 `journal_entry_lines` — Individual Debit/Credit Lines

```
Columns:
  id                  UUID (PK)
  journal_entry_id    UUID (FK → journal_entries)
  line_number         INTEGER
  account_id          UUID (FK → chart_of_accounts)
  debit_amount        NUMERIC
  credit_amount       NUMERIC
  line_description    TEXT
  asset_id            UUID (FK → fixed_assets, nullable)
  cost_center_id      UUID (FK → cost_centers, nullable)
  employee_id         UUID (FK → employees, nullable)
  created_at
```

**Constraint:** Each journal entry must have ≥ 2 lines with sum(debit) = sum(credit).

### 3.3 `chart_of_accounts` — Hierarchical Account Structure

```
Columns:
  id                  UUID (PK)
  company_id          UUID (FK → companies)
  account_code        TEXT (e.g., '1010'=Cash, '1200'=AR, '4110'=Rental Revenue)
  account_name        TEXT (English)
  account_name_ar     TEXT (Arabic)
  account_type        TEXT ('assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses')
  account_level       INTEGER (hierarchy depth)
  parent_account_id   UUID (FK → self)
  is_header           BOOLEAN (header accounts cannot be posted to)
  is_active           BOOLEAN
  current_balance     NUMERIC (computed/materialized)
  opening_balance     NUMERIC
  created_at / updated_at
```

**Standard Account Codes (Al-Araf):**
| Code  | Name | Type |
|-------|------|------|
| 1010  | Cash/Bank | Asset |
| 1200  | Accounts Receivable | Asset |
| 3110  | Retained Earnings | Equity |
| 4110  | Rental Revenue | Revenue |
| 4200  | Fine Revenue | Revenue |

### 3.4 `invoices` — Customer/Vendor Invoices

```
Columns:
  id                  UUID (PK)
  company_id          UUID (FK → companies)
  invoice_number      TEXT
  invoice_type        TEXT ('PUR' | 'SALES' | etc.)
  invoice_date        DATE
  due_date            DATE
  total_amount        NUMERIC
  subtotal            NUMERIC
  tax_amount          NUMERIC
  discount_amount     NUMERIC
  paid_amount         NUMERIC
  balance_due         NUMERIC
  status              TEXT
  payment_status      TEXT
  contract_id         UUID (FK → contracts)
  customer_id         UUID (FK → customers)
  vendor_id           UUID (FK → vendors)
  journal_entry_id    UUID (FK → journal_entries) ← GL LINKAGE
  cost_center_id      UUID (FK → cost_centers)
  fixed_asset_id      UUID (FK → fixed_assets)
  currency            TEXT
  is_legacy           BOOLEAN
  ocr_data            JSONB
  ocr_confidence      NUMERIC
  scanned_image_url   TEXT
  manual_review_required BOOLEAN
  notes               TEXT
  created_by          UUID
  created_at / updated_at
```

### 3.5 `payments` — Payment Transactions

```
Columns:
  id                  UUID (PK)
  company_id          UUID (FK → companies)
  payment_number      TEXT
  payment_type        TEXT ('cash' | 'check' | 'bank_transfer' | 'credit_card' | 'online_transfer')
  payment_method      TEXT ('received' | 'made')
  payment_status      TEXT ('pending' | 'processing' | 'completed' | 'failed' | 'voided' | 'reversed')
  amount              NUMERIC
  amount_paid         NUMERIC
  remaining_amount    NUMERIC
  payment_date        DATE
  due_date            DATE
  original_due_date   DATE
  invoice_id          UUID (FK → invoices) ← INVOICE LINKAGE
  contract_id         UUID (FK → contracts)
  customer_id         UUID (FK → customers)
  vendor_id           UUID (FK → vendors)
  journal_entry_id    UUID (FK → journal_entries) ← GL LINKAGE
  account_id          UUID (FK → chart_of_accounts)
  bank_id             UUID (FK → banks)
  bank_account        TEXT
  check_number        TEXT
  reference_number    TEXT
  currency            TEXT
  transaction_type    ENUM
  payment_month       TEXT
  monthly_amount      NUMERIC
  late_fee_amount     NUMERIC
  late_fee_days       INTEGER
  late_fine_amount    NUMERIC
  late_fine_status    TEXT
  late_fine_type      TEXT
  late_fine_waiver_reason TEXT
  linking_confidence  NUMERIC
  allocation_status   TEXT
  reconciliation_status TEXT
  processing_status   TEXT
  processing_notes    TEXT
  description_type    TEXT
  days_overdue        INTEGER
  agreement_number    TEXT
  notes               TEXT
  created_by          UUID
  created_at / updated_at
```

**Payment State Machine:**
```
pending → processing → completed → voided
                  ↘ failed → processing (retry)
                  ↘ reversed
```

### 3.6 `account_mappings` — Default Account Type → COA Bridge

```
Columns:
  id                      UUID (PK)
  company_id              UUID (FK → companies)
  default_account_type_id UUID (FK → default_account_types)
  chart_of_accounts_id    UUID (FK → chart_of_accounts)
  is_active               BOOLEAN
  mapped_by               UUID
  created_at / updated_at
```

This table is the **critical integration point** that maps system-level account types (CASH, RECEIVABLES, REVENUE, etc.) to company-specific chart of accounts. All automated journal entry creation depends on these mappings.

---

## 4. Integration Points & Data Flow

### 4.1 Core Financial Data Flow

```
                    ┌──────────────┐
                    │   Contract   │
                    │  (Agreement) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Invoice  │ │ Payment  │ │Obligation│
        │ (Billing)│ │(Received)│ │(Monthly) │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             │   journal_entry_id     │
             ▼            ▼            ▼
        ┌─────────────────────────────────────┐
        │         Journal Entries             │
        │  (Double-Entry Bookkeeping)          │
        │  DR: AR / CR: Revenue (invoice)     │
        │  DR: Cash / CR: AR (payment)        │
        └────────────────┬────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────┐
        │      Journal Entry Lines            │
        │  (Individual Debit/Credit Lines)     │
        │  → account_id FK to COA             │
        └────────────────┬────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────┐
        │      Chart of Accounts              │
        │  (current_balance updated via RPC)   │
        └────────────────┬────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────┐
        │      Financial Reports              │
        │  Trial Balance, P&L, Balance Sheet  │
        │  Cash Flow, Consolidation           │
        └─────────────────────────────────────┘
```

### 4.2 Key Integration Hooks

| Hook | Purpose | Tables Touched |
|------|---------|----------------|
| `useRentalPaymentJournalIntegration` | Auto-create JEs when rental payments recorded | payments, journal_entries, journal_entry_lines, chart_of_accounts |
| `usePayrollJournalIntegration` | Auto-create JEs for payroll | payroll, journal_entries, journal_entry_lines |
| `useVehicleInstallmentJournalIntegration` | Auto-create JEs for vehicle installments | vehicle_installments, journal_entries, journal_entry_lines |
| `useTrafficViolationJournalIntegration` | Auto-create JEs for traffic violations | traffic_violations, journal_entries, journal_entry_lines |
| `useMaintenanceJournalIntegration` | Auto-create JEs for maintenance costs | maintenance, journal_entries, journal_entry_lines |
| `usePaymentLegalIntegration` | Link payments to legal cases | payments, legal_cases |
| `useGeneralLedger` | Query GL, trial balance, account movements | journal_entries, journal_entry_lines, chart_of_accounts |
| `useEnhancedFinancialReports` | Income statement, balance sheet, cash flow | chart_of_accounts, journal_entry_lines |
| `useTreasury` | Bank accounts, transactions, cost centers | banks, bank_transactions, cost_centers |
| `useMonthlyObligations` | Recurring obligations with accounting treatment | monthly_obligations, monthly_obligation_installments |
| `usePayments.unified` | Unified payment CRUD with state machine | payments, invoices, contracts, customers |
| `useInvoices` | Invoice management | invoices, contracts, customers |
| `useJournalEntries` | Journal entry CRUD with approval workflow | journal_entries, journal_entry_lines |
| `useFinancialIntegrityReport` | Cross-table integrity checks | All financial tables |
| `useContracts` | Contract lifecycle management | contracts, customers |

### 4.3 Automated Journal Entry Creation Pattern

All integration hooks follow this pattern:

```
1. Business event occurs (payment received, invoice created, etc.)
2. Hook fetches account_mappings to resolve default_account_types → COA IDs
3. Falls back to account_code pattern matching (e.g., '1010' for Cash)
4. Creates journal_entries record (status: 'draft')
5. Creates journal_entry_lines (2+ lines, balanced debit=credit)
6. Posts the entry (status: 'posted')
7. Links back to source record via journal_entry_id FK
8. Calls update_account_balances_from_entries RPC
```

**Standard Journal Entry Templates:**

| Transaction | Debit | Credit |
|-------------|-------|--------|
| Invoice Created | AR (1200) | Revenue (4110) |
| Payment Received | Cash (1010) | AR (1200) |
| Fine Charged | AR (1200) | Fine Revenue (4200) |
| Expense Paid | Expense Account | Cash (1010) |
| Closing Entry | Revenue Accounts | Retained Earnings (3110) |

---

## 5. Frontend Service Layer

### 5.1 `AccountingService` (`src/services/AccountingService.ts`)

Core accounting operations:
- `updateAccountBalances(paymentId, companyId)` — Updates COA balances after payment
- `updateInvoiceStatus(invoiceId)` — Recalculates paid_amount, balance_due, payment_status
- `updateContractStatus(contractId)` — Recalculates contract financial status
- Balance calculation: Asset/Expense = debit - credit; Liability/Revenue/Equity = credit - debit

### 5.2 `PaymentLinkingService` (`src/services/PaymentLinkingService.ts`)

Intelligent payment-to-invoice/contract linking:
- Confidence-based matching (amount 40%, customer 30%, reference 30%, date 10%)
- Auto-link threshold: 70% confidence
- Manual suggestion threshold: 40% confidence
- Linking history tracking per payment

### 5.3 `PaymentStateMachine` (`src/services/PaymentStateMachine.ts`)

Enforces valid payment state transitions:
- `pending → processing → completed → voided`
- `processing → failed → processing` (retry, max 3)
- `completed → reversed`
- Prevents invalid transitions (e.g., completed → pending)

### 5.4 `financialControls` (`src/services/financialControls.ts`)

Period-locking enforcement:
- `assertFinancialPeriodOpen(companyId, transactionDate)` — throws if period is closed/locked

---

## 6. Business Rules Engine

All rules are implemented as **pure TypeScript functions** in `src/utils/`, making them testable and reusable:

| Rule File | Purpose | Key Functions |
|-----------|---------|---------------|
| `financialReconciliationRules.ts` | Invoice-payment reconciliation | `reconcileInvoicePaymentState()`, `evaluatePaymentJournalLink()`, `isPostedJournalBalanced()` |
| `annualCloseRules.ts` | Year-end closing entries | `calculateAnnualNetIncome()`, `buildAnnualClosingEntry()`, `buildOpeningBalanceLines()` |
| `budgetControlRules.ts` | Budget enforcement | `evaluateBudgetControl()` — returns status: no_budget/within_budget/near_limit/exceeded |
| `budgetOverrideRules.ts` | Budget override approval | Override request validation |
| `bankReconciliationRules.ts` | Bank statement matching | `scoreBankStatementMatch()` — scores: exact/strong/possible/none |
| `financialApprovalWorkflowRules.ts` | Multi-step approval routing | `resolveFinancialApprovalWorkflow()` — matches policies by action, amount, currency, branch |
| `periodReopeningImpactRules.ts` | Period reopening impact analysis | `summarizePeriodReopeningImpact()`, `evaluatePeriodReclosureReadiness()` |
| `financialConsolidationRules.ts` | Multi-company consolidation | `consolidateTrialBalance()` — currency conversion + elimination entries |
| `standardFinancialReportRules.ts` | Standard report generation | Income statement, balance sheet formatting |
| `ledgerCashFlowReportRules.ts` | Cash flow categorization | Operating/Investing/Financing classification |
| `financialOperationalReportRules.ts` | Operational financial reports | Fleet-specific financial KPIs |
| `financeAccessRules.ts` | Role-based finance access | Permission checks for financial modules |
| `bankStatementImportParser.ts` | Bank statement CSV/Excel parsing | Statement import and normalization |

---

## 7. Audit & Remediation Pipeline

### 7.1 Python Audit Scripts

The project contains **75 Python scripts** in `scripts/` for data extraction, analysis, and remediation. They communicate with Supabase via the REST API using either `requests` or `urllib.request`.

**Data Fetching Pattern (all scripts):**
```python
# Paginated fetch via Supabase REST API with Range headers
def rest_get_all(table, select='*', filters=''):
    all_rows = []
    offset = 0
    while True:
        url = f'{BASE_URL}/rest/v1/{table}?select={select}&limit=1000&offset={offset}'
        r = requests.get(url, headers=HEADERS)
        rows = r.json()
        all_rows.extend(rows)
        if len(rows) < 1000: break
        offset += 1000
    return all_rows
```

### 7.2 Audit Domains Covered

| Domain | Script(s) | Checks |
|--------|-----------|--------|
| **Double-Entry Integrity** | `audit_analysis.py`, `audit_analysis2.py`, `audit_full.py`, `audit_detail.py` | Header balance (total_debit=total_credit), line-level balance, entries without lines, single-line entries, zero-amount entries, status breakdown |
| **Chart of Accounts** | `audit_analysis.py`, `audit_analysis2.py` | Account types, invalid types, duplicate codes, header vs postable, inactive accounts, circular references, missing parents |
| **GL Linkage** | `audit_analysis.py`, `audit_analysis2.py`, `audit_detail2.py`, `audit_detail3.py` | Payments→JE linkage, Invoices→JE linkage, orphan references |
| **Trial Balance** | `audit_analysis.py`, `audit_analysis2.py` | Accounting equation (A = L + E), balance by type |
| **AP/AR** | `audit_analysis2.py`, `audit_detail3.py` | Payment status, invoice status, duplicate payments, balance mismatches |
| **Revenue Recognition** | `audit_analysis2.py` | Deferred revenue accounts, prepayment handling |
| **Contract-Invoice** | `audit_contract_invoices.py` | Invoice dates vs contract duration, placeholder invoices (2099 dates), missing contract linkage |
| **Schema/Code** | `audit-supabase-queries.py`, `audit-supabase-queries-v2.py` | Column name mismatches between TypeScript code and actual DB schema |
| **Internal Controls** | `audit_analysis2.py` | Draft entries, unposted transactions |

### 7.3 Remediation Scripts

| Script | Purpose |
|--------|---------|
| `fix_financial_issues.py` | Original 5-issue fixer (empty entries, zero-amount, drafts, unlinked payments/invoices) |
| `apply_fixes.py` | Production remediation with safe unpost→delete workflow |
| `fix_final_v2.py` | Link remaining payments/invoices to JEs, create closing entry |
| `fix_remaining_final.py` | Post drafts, link payments, fix closing entry, final verification |
| `fix_payments_invoices.py` | Bulk payment-invoice linking |
| `fix_invoices_smart.py` | Smart invoice linking via customer→contract resolution |
| `fix_contract_bypass.py` | Fix contract date bypass issues |
| `fix_accounting_equation.py` | Correct accounting equation imbalance |
| `create_closing_entry.py` / `v2` / `v3` | Generate period-end closing entries |
| `reverse_payment_links.py` | Undo incorrect payment linkages |
| `bulk_delete_pyinv.py` | Bulk delete problematic PYINV entries |
| `verify_fixes.py` | Post-remediation verification of all 5 original issues |

### 7.4 Original 5 Issues & Remediation Status

| # | Issue | Original Count | Fix Strategy |
|---|-------|---------------|--------------|
| 1 | Empty journal entries (no lines) | 7 | Unlink from invoices, unpost if posted, delete |
| 2 | Zero-amount entries (all lines debit=credit=0) | 38 | Delete lines, then delete entry |
| 3 | Draft entries (stuck unposted) | 352 | Post balanced drafts, delete empty drafts |
| 4 | Unlinked payments (no invoice_id or bad ref) | 59 | Link via contract_id→invoice, create placeholder invoices |
| 5 | Unlinked invoices (no contract_id or bad ref) | 281 | Link via customer_id→contract |

---

## 8. Known Issues & Remediation History

### 8.1 Schema/Code Mismatches (from `audit-supabase-queries`)

Known column name corrections needed in TypeScript code:

| Table | Wrong Name (in code) | Correct Name (in DB) |
|-------|---------------------|---------------------|
| `payments` | `status` | `payment_status` |
| `payments` | `recorded_by` | `created_by` |
| `payments` | `reconciled` | `reconciliation_status` |
| `journal_entry_lines` | `description` | `line_description` |
| `journal_entry_lines` | `debit` | `debit_amount` |
| `journal_entry_lines` | `credit` | `credit_amount` |
| `journal_entry_lines` | `entry_id` | `journal_entry_id` |
| `journal_entry_lines` | `account_code` | `account_id` |
| `chart_of_accounts` | `level` | `account_level` |
| `chart_of_accounts` | `parent_code` | `parent_account_code` |
| `chart_of_accounts` | `account_name_en` | `account_name` |

### 8.2 Data Quality Issues Found

- **Placeholder invoices** with 2099 dates (system-generated placeholders)
- **Invoices outside contract date ranges** (before start or after end)
- **Contracts without any invoices** (orphan agreements)
- **Payments without invoice linkage** (unapplied cash)
- **Invoices without contract linkage** (orphan billing)
- **Draft journal entries** accumulating without posting
- **Zero-amount journal entries** (RETRO-type entries with no financial impact)

### 8.3 Architectural Concerns

1. **No deferred revenue accounts** — prepayments may be recognized immediately rather than amortized
2. **Polymorphic reference_id/reference_type** on journal_entries — no DB-level referential integrity
3. **current_balance on chart_of_accounts** is materialized — requires explicit RPC call to update
4. **account_mappings** is the critical bridge for auto-JE creation — if mappings are missing, JEs fail silently
5. **Python scripts use direct REST API** — bypass application-level validation and business rules

---

## 9. API & RPC Functions

### 9.1 Database RPC Functions (from `types.ts`)

| Function | Purpose |
|----------|---------|
| `update_account_balances_from_entries` | Recalculates all COA current_balance from journal_entry_lines |
| `process_pending_journal_entries` | Processes queued pending_journal_entries |
| `process_failed_journal_entries` | Retries failed journal entry creation |
| `process_overdue_invoices` | Marks overdue invoices and calculates late fees |
| `backfill_all_contract_invoices` | Generates missing invoices for all contracts |
| `backfill_contract_invoices` | Generates missing invoices for a specific contract |
| `smart_backfill_contract_invoices` | Intelligent invoice backfill with date validation |
| `create_payment_schedule_invoices` | Creates invoices from payment schedules |
| `fix_pending_payments` | Resolves stuck pending payments |
| `regenerate_all_cancelled_contract_invoices` | Recreates invoices for cancelled-then-reactivated contracts |

### 9.2 REST API Endpoints (PostgREST)

All tables are accessible via:
```
GET    /rest/v1/{table}?select=*&limit=1000&offset=0
POST   /rest/v1/{table}
PATCH  /rest/v1/{table}?id=eq.{uuid}
DELETE /rest/v1/{table}?id=eq.{uuid}
```

Authentication: `apikey` header (anon key) + `Authorization: Bearer {service_role_key}` for admin operations.

---

## 10. Security & Access Control

### 10.1 Row-Level Security (Supabase)

All tables are scoped by `company_id`. The frontend uses:
- `useUnifiedCompanyAccess()` — resolves current user's company context
- `useFinanceAccessGuard()` — gate for financial module access
- `financeAccessRules.ts` — role-based permission checks

### 10.2 API Key Usage

- **Anon Key** (`VITE_SUPABASE_ANON_KEY`): Used by frontend, subject to RLS
- **Service Role Key** (`VITE_SUPABASE_SERVICE_ROLE_KEY`): Used by Python scripts, bypasses RLS — **must be kept secure**

### 10.3 Approval Workflows

Multi-step approval policies configurable by:
- Action type (invoice_cancel, payment_cancel, journal_post, period_reopen, budget_override, bank_reconcile, report_approve)
- Amount thresholds (min/max)
- Currency
- Branch scope (same_branch, any_branch, head_office)
- Role-based step ordering with required approval counts

---

## Appendix A: Key File Index

### Frontend (TypeScript)
```
src/
├── integrations/supabase/
│   ├── client.ts                    # Supabase client initialization
│   └── types.ts                     # Full DB schema types (25,824 lines)
├── services/
│   ├── AccountingService.ts         # Core accounting operations
│   ├── PaymentLinkingService.ts     # Payment-to-invoice matching
│   ├── PaymentStateMachine.ts       # Payment state transitions
│   ├── financialControls.ts         # Period locking enforcement
│   ├── auditService.ts              # Audit trail service
│   └── LawsuitService.ts            # Legal case financial integration
├── hooks/
│   ├── useGeneralLedger.ts          # GL queries, trial balance
│   ├── useEnhancedFinancialReports.ts # P&L, balance sheet, cash flow
│   ├── useTreasury.ts               # Bank & cost center management
│   ├── useMonthlyObligations.ts     # Recurring obligations
│   ├── usePayments.unified.ts       # Unified payment operations
│   ├── useRentalPaymentJournalIntegration.ts
│   ├── usePayrollJournalIntegration.ts
│   ├── useVehicleInstallmentJournalIntegration.ts
│   ├── useTrafficViolationJournalIntegration.ts
│   ├── useMaintenanceJournalIntegration.ts
│   ├── useFinancialIntegrityReport.ts
│   ├── useFinanceAccessGuard.ts
│   └── finance/
│       ├── useInvoices.ts
│       ├── useJournalEntries.ts
│       └── useFinanceAccessGuard.ts
└── utils/
    ├── financialReconciliationRules.ts
    ├── annualCloseRules.ts
    ├── budgetControlRules.ts
    ├── budgetOverrideRules.ts
    ├── bankReconciliationRules.ts
    ├── financialApprovalWorkflowRules.ts
    ├── periodReopeningImpactRules.ts
    ├── financialConsolidationRules.ts
    ├── standardFinancialReportRules.ts
    ├── ledgerCashFlowReportRules.ts
    ├── financialOperationalReportRules.ts
    ├── financeAccessRules.ts
    ├── bankStatementImportParser.ts
    └── officialFinancialReportExport.ts
```

### Backend Scripts (Python)
```
scripts/
├── fetch_all_paginated.py           # Generic paginated data fetcher
├── fetch_all_data.py                # Bulk data extraction
├── analyze_company_jes.py           # Company-specific JE analysis
├── analyze_je_structure.py          # JE structural analysis
├── audit_analysis.py                # CFO-level audit (v1)
├── audit_analysis2.py               # CFO-level audit (v2, compact)
├── audit_full.py                    # Full audit
├── audit_detail.py / detail2 / detail3 # Detailed audit reports
├── audit_contract_invoices.py       # Contract-invoice date validation
├── audit-supabase-queries.py        # Schema/code mismatch audit (v1)
├── audit-supabase-queries-v2.py     # Schema/code mismatch audit (v2, chain-aware)
├── fix_financial_issues.py          # Original 5-issue fixer
├── apply_fixes.py                   # Production remediation
├── fix_final_v2.py                  # Final linkage + closing entry
├── fix_remaining_final.py           # Post drafts, link, verify
├── verify_fixes.py                  # Post-fix verification
├── create_closing_entry.py / v2 / v3 # Closing entry generators
├── fix_payments_invoices.py         # Bulk payment-invoice linking
├── fix_invoices_smart.py            # Smart invoice linking
├── reverse_payment_links.py         # Undo incorrect linkages
├── bulk_delete_pyinv.py             # Bulk delete PYINV entries
└── generate_import_sql.py           # SQL generation for data import
```

---

## Appendix B: Accounting Equation Verification

The system maintains the fundamental accounting equation:

**Assets = Liabilities + Equity**

After remediation, the expected state is:
- Revenue and Expense accounts are closed to Retained Earnings (Equity)
- All journal entries are balanced (total_debit = total_credit)
- All payments and invoices are linked to journal entries
- No empty or zero-amount journal entries exist
- No draft entries remain unposted

---

*End of Document*
