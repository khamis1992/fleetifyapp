# Fleetify Database Schema Documentation

> **Generated**: 2026-01-12T13:16:47.591Z
> **Total Tables**: 1

## Table of Contents

- [`account_creation_requests`](#account_creation_requests)

---

## `account_creation_requests`

**Columns**: 16

### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `employee_id` | string |
| `id` | string |
| `request_date` | string |
| `requested_by` | string |
| `status` | string |
| `updated_at` | string |

### Optional Columns

| Column | Type |
|--------|------|
| `direct_creation` | boolean | null |
| `notes` | string | null |
| `password_expires_at` | string | null |
| `processed_at` | string | null |
| `processed_by` | string | null |
| `rejection_reason` | string | null |
| `requested_roles` | string[] | null |
| `temporary_password` | string | null |

### Relationships

- **account_creation_requests_employee_id_fkey**: References `employees` (employee_id)

---

## Business Rules & Critical Information

### Multi-Tenancy
- Most tables include a `company_id` column for multi-tenancy
- RLS (Row Level Security) policies enforce company isolation
- Always filter by `company_id` in queries

### Financial System
- `chart_of_accounts`: Hierarchical chart (levels 1-6)
  - Only `is_header = false AND account_level >= 3` can have postings
  - `account_code` is the primary identifier
  - Use `account_name` (NOT `account_name_en`)
- `journal_entries`: Header table for transactions
- `journal_entry_lines`: Line items
  - Uses `line_description` (NOT `description`)
  - Uses `line_number` for sequencing
  - Each entry must have at least 2 lines (balanced debits/credits)

### Key Entity Relationships
- `contracts` - Rental contracts
- `customers` - Customer records
- `vehicles` - Fleet vehicles
- `invoices` - Billing documents
- `payments` - Payment records

### Important Column Name Corrections
| Wrong | Correct |
|-------|----------|
| `description` | `line_description` (journal_entry_lines) |
| `level` | `account_level` (chart_of_accounts) |
| `parent_code` | `parent_account_code` |
| `account_name_en` | `account_name` |
| `status` | `payment_status` (payments table) |

