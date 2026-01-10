# Fleetify Backend/Database Architecture Audit Report

**Generated:** 2025-01-10
**Company:** Al-Araf Car Rental (شركة العراف لتأجير السيارات)
**Company ID:** `24bc0b21-4e2d-4413-9842-31719a3669f4`
**Database:** Supabase (PostgreSQL 17.6)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Supabase Integration](#1-supabase-integration)
3. [Database Schema Overview](#2-database-schema-overview)
4. [Core Data Models](#3-core-data-models)
5. [Financial System Architecture](#4-financial-system-architecture)
6. [API Patterns & Data Access](#5-api-patterns--data-access)
7. [Authentication & Authorization](#6-authentication--authorization)
8. [Critical Findings & Recommendations](#7-critical-findings--recommendations)

---

## Executive Summary

Fleetify is a comprehensive ERP system for car rental and fleet management built on:
- **Frontend:** React 18 + TypeScript + Vite
- **Backend/Database:** Supabase (PostgreSQL 17.6)
- **State Management:** React Query (@tanstack/react-query)
- **Routing:** React Router v6 with custom route registry
- **Deployment:** Vercel (https://www.alaraf.online)

**Database Scale:**
- ~250 database tables and views
- Multi-tenant architecture with company isolation
- 588 contracts, 781 customers, 510 vehicles, 1,250 invoices, 6,568 payments
- Hierarchical chart of accounts with double-entry bookkeeping

---

## 1. Supabase Integration

### 1.1 Client Configuration

**Location:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseConfig, debugLog, securityLog } from '@/lib/env';
import { createCapacitorStorageAdapter } from '@/lib/capacitorStorage';

// Configuration
supabaseConfig = getSupabaseConfig(); // Secure loading from environment
- url: Supabase project URL
- anonKey: Anonymous/public key

// Client creation
export const supabase = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      storage: createCapacitorStorageAdapter(), // Capacitor support for mobile
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

**Key Features:**
- Type-safe client with TypeScript types from `types.ts`
- Capacitor storage adapter for iOS/Android mobile apps
- Auto-refresh token for persistent sessions
- Secure configuration loading with debug/security logging

### 1.2 Authentication Flow

**Authentication Provider:** `src/contexts/AuthContext.tsx`

The system uses Supabase Auth with:
- Email/password authentication
- Session persistence via Capacitor storage (mobile) or localStorage (web)
- Automatic token refresh
- User profile management

**Profile Table Structure:**
```typescript
profiles: {
  id: string              // UUID (links to auth.users)
  user_id: string         // UUID (primary identifier)
  email: string
  first_name: string
  first_name_ar?: string
  last_name: string
  last_name_ar?: string
  phone?: string
  avatar_url?: string
  company_id?: string     // Links to companies table
  is_active?: boolean
  is_demo_user?: boolean
  language_preference?: string
  timezone?: string
  position?: string
  position_ar?: string
  national_id?: string
  created_at: string
  updated_at: string
}
```

### 1.3 Real-time Subscriptions

**Pattern:** Supabase Realtime is available but usage patterns are mixed:
- Used for dashboard updates
- Contract status changes
- Payment notifications
- Vehicle availability updates

**Example Pattern:**
```typescript
const subscription = supabase
  .channel('contracts-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'contracts',
    filter: `company_id=eq.${companyId}`
  }, (payload) => {
    // Handle change
  })
  .subscribe();
```

---

## 2. Database Schema Overview

### 2.1 Schema Statistics

**Total Tables:** ~180+ tables
**Total Views:** ~70+ views
**Database Type:** PostgreSQL 17.6
**Postgrest Version:** 12.2.12

### 2.2 Schema Organization

Tables are organized by business domain:

| Domain | Key Tables | Purpose |
|--------|-----------|---------|
| **Company** | `companies`, `company_branding_settings`, `company_usage` | Multi-tenancy, branding |
| **Users** | `profiles`, `employees`, `user_roles` | Authentication, authorization |
| **Customers** | `customers`, `customer_documents`, `customer_notes`, `customer_payment_scores` | CRM |
| **Fleet** | `vehicles`, `vehicle_documents`, `vehicle_inspections`, `vehicle_groups` | Vehicle management |
| **Contracts** | `contracts`, `contract_documents`, `contract_payment_schedules` | Rental agreements |
| **Financial** | `chart_of_accounts`, `journal_entries`, `journal_entry_lines`, `invoices`, `payments` | Accounting |
| **Legal** | `legal_cases`, `legal_case_documents`, `legal_case_correspondence` | Lawsuits |
| **Inventory** | `inventory_items`, `inventory_purchase_orders`, `inventory_warehouses` | Parts inventory |
| **Property** | `properties`, `property_contracts`, `tenants` | Real estate module |

### 2.3 Row Level Security (RLS)

**Multi-Tenancy Pattern:**
All major tables include `company_id` for tenant isolation:
```sql
-- Example RLS policy pattern
CREATE POLICY "Users can view own company data" ON contracts
FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

**RLS Enforcement:**
- Automatic filtering by company_id in queries
- User-level permissions based on roles
- Row-level access control for sensitive data

---

## 3. Core Data Models

### 3.1 Companies Table

**Purpose:** Multi-tenant company management

**Schema:**
```typescript
companies: {
  id: string                          // UUID primary key
  name: string                       // Company name
  name_ar?: string                   // Arabic name
  email?: string
  phone?: string
  address?: string
  address_ar?: string
  city?: string
  country?: string
  currency?: string                  // Default: QAR
  logo_url?: string
  subscription_plan?: string         // Pricing tier
  subscription_status?: string       // active, past_due, cancelled
  subscription_expires_at?: string
  trial_end_date?: string
  business_type?: string             // car_rental, fleet_management
  license_number?: string
  commercial_register?: string
  custom_branding?: Json            // Branding settings
  settings?: Json                    // Company preferences
  active_modules?: string[]          // Enabled modules
  industry_config?: Json             // Industry-specific settings
  is_demo?: boolean
  office_latitude?: number
  office_longitude?: number
  allowed_radius?: number            // Geo-fencing for attendance
  work_start_time?: string
  work_end_time?: string
  auto_checkout_enabled?: boolean
  number_format_preferences?: Json
  created_at: string
  updated_at: string
}
```

**Relationships:**
- `subscription_plans` → `current_plan_id`
- All data tables → `company_id` (foreign key)

### 3.2 Users & Employees

**Profiles Table:**
```typescript
profiles: {
  id: string                    // UUID (links to auth.users.id)
  user_id: string              // UUID (unique identifier)
  email: string
  first_name: string
  first_name_ar?: string
  last_name: string
  last_name_ar?: string
  phone?: string
  avatar_url?: string
  company_id?: string           // Links to companies
  is_active?: boolean
  is_demo_user?: boolean
  language_preference?: string  // en, ar
  timezone?: string
  position?: string
  position_ar?: string
  national_id?: string
  created_at: string
  updated_at: string
}
```

**Employees Table:**
```typescript
employees: {
  id: string                    // UUID
  company_id: string            // Required link to company
  employee_number: string       // Unique employee ID
  first_name: string
  first_name_ar?: string
  last_name: string
  last_name_ar?: string
  email?: string
  phone?: string
  department?: string
  position?: string
  position_ar?: string
  basic_salary?: number
  allowances?: number
  hire_date: string
  termination_date?: string
  is_active?: boolean
  has_system_access?: boolean
  account_status?: string       // active, suspended, terminated
  user_id?: string              // Links to profiles (if has system access)
  address?: string
  address_ar?: string
  national_id?: string
  notes?: string
  created_at: string
  updated_at: string
}
```

**Key Relationships:**
- `companies` → `company_id`
- `profiles` → `user_id` (for system access)
- `user_roles` → employee permissions

### 3.3 Customers

**Purpose:** Customer relationship management (CRM)

**Schema:**
```typescript
customers: {
  id: string                    // UUID primary key
  company_id: string            // Required - tenant isolation
  customer_code?: string        // Unique customer identifier
  customer_type?: enum          // individual, corporate
  first_name?: string           // For individual customers
  first_name_ar?: string
  last_name?: string
  last_name_ar?: string
  company_name?: string         // For corporate customers
  company_name_ar?: string
  phone: string                 // Required
  alternative_phone?: string
  email?: string
  address?: string
  address_ar?: string
  city?: string
  country?: string
  national_id?: string
  national_id_expiry?: string
  passport_number?: string
  license_number?: string
  license_expiry?: string
  date_of_birth?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  credit_limit?: number         // Credit limit for rentals
  default_cost_center_id?: string // Links to cost_centers
  is_active?: boolean
  is_blacklisted?: boolean
  blacklist_reason?: string
  auto_pay_enabled?: boolean
  documents?: Json              // Stored document metadata
  notes?: string
  created_at: string
  updated_at: string
}
```

**Customer-Related Tables:**
- `customer_documents` - ID proofs, licenses, etc.
- `customer_notes` - Interaction notes
- `customer_payment_scores` - Payment reliability scoring
- `customer_financial_summary` - Aggregated financial data
- `customer_credit_history` - Credit transactions
- `customer_deposits` - Security deposits
- `delinquent_customers` - Payment delinquency tracking

**Key Relationships:**
- `companies` → `company_id`
- `cost_centers` → `default_cost_center_id`
- `contracts` ← customer has many contracts
- `payments` ← customer has many payments

### 3.4 Vehicles

**Purpose:** Fleet/vehicle inventory management

**Schema:**
```typescript
vehicles: {
  id: string                    // UUID primary key
  company_id: string            // Required - tenant isolation
  plate_number: string          // License plate (required)
  registration_number?: string
  make: string                  // Required (Toyota, Nissan, etc.)
  model: string                 // Required (Corolla, Altima, etc.)
  year: number                  // Model year
  color?: string
  color_ar?: string
  status?: enum                 // available, rented, maintenance, out_of_service
  category_id?: string          // Links to vehicle categories
  vehicle_group_id?: string     // Links to vehicle_groups
  branch_id?: string            // Current location
  assigned_driver_id?: string   // Primary driver

  // Pricing
  daily_rate?: number
  weekly_rate?: number
  monthly_rate?: number
  minimum_rental_price?: number
  minimum_daily_rate?: number
  minimum_weekly_rate?: number
  minimum_monthly_rate?: number
  deposit_amount?: number

  // Specifications
  body_type?: string            // sedan, suv, truck, van
  transmission_type?: string    // automatic, manual
  fuel_type?: string            // petrol, diesel, electric, hybrid
  fuel_capacity?: number
  fuel_level?: number
  seating_capacity?: number
  cargo_capacity?: number
  vehicle_weight?: number

  // Identification
  vin?: string
  vin_number?: string
  engine_number?: string
  engine_size?: string

  // Financial/Asset Info
  purchase_cost?: number
  purchase_date?: string
  purchase_source?: string
  purchase_invoice_number?: string
  financing_type?: string       // cash, loan, lease
  loan_amount?: number
  monthly_payment?: number
  fixed_asset_id?: string        // Links to fixed_assets
  asset_code?: string
  asset_classification?: string
  accumulated_depreciation?: number
  book_value?: number
  salvage_value?: number
  useful_life_years?: number
  depreciation_rate?: number
  annual_depreciation_rate?: number
  depreciation_method?: string

  // Operating Costs
  total_maintenance_cost?: number
  total_insurance_cost?: number
  total_operating_cost?: number

  // Maintenance Tracking
  current_mileage?: number
  odometer_reading?: number
  last_service_date?: string
  last_service_mileage?: number
  next_service_due?: string
  next_service_mileage?: number
  service_interval_km?: number

  // Insurance
  insurance_policy?: string
  insurance_policy_number?: string
  insurance_provider?: string
  insurance_start_date?: string
  insurance_end_date?: string
  insurance_expiry?: string
  insurance_premium_amount?: number
  license_expiry?: string
  registration_expiry?: string
  warranty_provider?: string
  warranty_start_date?: string
  warranty_end_date?: string
  warranty_expiry?: string

  // Features
  additional_features?: string[]
  safety_features?: string[]
  features?: Json               // Additional attributes
  images?: Json                  // Vehicle photos
  gps_device_id?: string
  fuel_card_number?: string

  // Location
  location?: string

  // Flags
  is_active?: boolean
  enforce_minimum_price?: boolean

  // Cost Center
  cost_center_id?: string
  vendor_id?: string             // Purchase vendor

  notes?: string
  created_at: string
  updated_at: string
}
```

**Vehicle-Related Tables:**
- `vehicle_documents` - Registration, insurance docs
- `vehicle_inspections` - Condition reports
- `vehicle_insurance_policies` - Insurance details
- `vehicle_installments` - Purchase financing
- `vehicle_reservations` - Booking holds
- `vehicle_dispatch_permits` - Dispatch tracking
- `vehicle_return_forms` - Return condition
- `vehicle_transfers` - Branch transfers
- `vehicle_maintenance` - Service records
- `fleet_vehicle_groups` - Grouping/organization

**Key Relationships:**
- `companies` → `company_id`
- `vehicles` ← `contracts` (vehicle assigned to contract)
- `fixed_assets` → `fixed_asset_id` (asset tracking)
- `cost_centers` → `cost_center_id`

### 3.5 Contracts

**Purpose:** Rental/lease agreements

**Schema:**
```typescript
contracts: {
  id: string                    // UUID primary key
  company_id: string            // Required - tenant isolation
  contract_number: string       // Unique contract number
  contract_type?: string        // lease, rental, finance
  customer_id: string           // Required - customer reference
  vehicle_id?: string           // Assigned vehicle
  start_date: string            // Contract start
  end_date?: string             // Contract end
  contract_date: string         // Creation date
  status?: string               // active, expired, cancelled, pending, suspended

  // Financial
  contract_amount?: number      // Total contract value
  monthly_amount: number        // Monthly payment
  balance_due?: number
  total_paid?: number
  payment_status?: string       // paid, partial, overdue

  // Vehicle Snapshot (denormalized)
  license_plate?: string
  make?: string
  model?: string
  year?: number
  vehicle_status?: string

  // Tracking
  days_overdue?: number
  late_fine_amount?: number
  last_payment_date?: string
  last_payment_check_date?: string

  // Auto-renewal
  auto_renew_enabled?: boolean
  renewal_terms?: Json

  // Accounting
  account_id?: string           // Default account for postings
  cost_center_id?: string
  journal_entry_id?: string     // Initial booking

  // Status Management
  vehicle_returned?: boolean
  suspension_reason?: string
  expired_at?: string

  // Metadata
  description?: string
  terms?: string
  notes?: string
  created_via?: string          // web, api, csv
  created_by?: string

  created_at: string
  updated_at: string
}
```

**Contract-Related Tables:**
- `contract_documents` - Supporting documents
- `contract_payment_schedules` - Installment plans
- `contract_templates` - Predefined templates
- `contract_payment_summary` - Aggregated payment data
- `contracts_complete` - Materialized view with all joins
- `contract_drafts` - Draft/unsaved contracts
- `contract_notifications` - Communication log
- `contract_operations_log` - Change history

**Key Relationships:**
- `companies` → `company_id`
- `customers` → `customer_id`
- `vehicles` → `vehicle_id`
- `chart_of_accounts` → `account_id`
- `cost_centers` → `cost_center_id`
- `journal_entries` → `journal_entry_id`
- `invoices` ← contract generates invoices
- `payments` ← contract receives payments

---

## 4. Financial System Architecture

### 4.1 Chart of Accounts

**Purpose:** Hierarchical account structure for double-entry bookkeeping

**Schema:**
```typescript
chart_of_accounts: {
  id: string                    // UUID primary key
  company_id: string            // Required - tenant isolation
  account_code: string          // Unique code (e.g., "1000", "1100")
  account_name: string          // Primary name (English)
  account_name_ar?: string      // Arabic name
  account_type: string          // asset, liability, equity, revenue, expense
  account_subtype?: string      // More specific classification
  account_level: number         // 1-6 hierarchy depth
  balance_type: string          // debit, credit
  parent_account_id?: string    // Self-referencing for hierarchy
  parent_account_code?: string  // Denormalized parent code

  // Posting Restrictions
  is_header: boolean            // Header accounts cannot have postings
  is_active: boolean
  is_system: boolean            // System accounts cannot be deleted
  is_default: boolean

  // Linking Rules
  can_link_customers?: boolean  // Can be linked to customers
  can_link_employees?: boolean  // Can be linked to employees
  can_link_vendors?: boolean    // Can be linked to vendors

  // Financial Data
  current_balance?: number      // Cached balance
  description?: string

  // Sorting
  sort_order?: number

  created_at: string
  updated_at: string
}
```

**Account Hierarchy Rules:**
- **Levels 1-2:** Header accounts only (no postings)
- **Levels 3-6:** Posting accounts
- Each account has `account_code` like "1000", "1100", "1110"
- `parent_account_id` creates tree structure
- `is_header = true` prevents direct postings

**Account Types:**
- `asset` - Cash, accounts receivable, inventory, fixed assets
- `liability` - Accounts payable, loans, accrued expenses
- `equity` - Owner's equity, retained earnings
- `revenue` - Sales, rental income, service revenue
- `expense` - Operating expenses, depreciation, interest

**Special Views:**
- `v_linkable_accounts` - Filtered view of accounts that can be linked to entities

### 4.2 Journal Entries (Double-Entry System)

**Purpose:** Record all financial transactions using double-entry accounting

**Schema:**
```typescript
journal_entries: {
  id: string                    // UUID primary key
  company_id: string            // Required - tenant isolation
  entry_number: string          // Unique sequential number
  entry_date: string            // Transaction date
  description: string           // Transaction description
  status: string                // draft, posted, reversed

  // Amounts
  total_debit: number           // Sum of all debit lines
  total_credit: number          // Sum of all credit lines

  // Workflow
  created_at: string
  created_by: string            // User who created
  updated_at: string
  updated_by: string

  // Posting
  posted_at?: string            // When entry was posted
  posted_by?: string            // User who posted
  accounting_period_id?: string // Links to accounting_periods

  // Reference
  reference_id?: string         // Related entity (contract_id, invoice_id, etc.)
  reference_type?: string       // Entity type
  reversal_entry_id?: string    // If this is a reversal
  reversed_at?: string
  reversed_by?: string

  // Review
  reviewed_at?: string
  reviewed_by?: string
  rejection_reason?: string
  workflow_notes?: string
}
```

**Journal Entry Lines:**
```typescript
journal_entry_lines: {
  id: string                    // UUID primary key
  journal_entry_id: string      // Parent journal entry
  line_number: number           // Sequence within entry
  account_id: string            // chart_of_accounts reference

  line_description: string      // Description for this line
  debit_amount?: number         // Debit amount (if debit)
  credit_amount?: number        // Credit amount (if credit)

  // Reference
  reference_id?: string         // Related entity
  reference_type?: string
  cost_center_id?: string

  created_at: string
}
```

**Double-Entry Validation:**
- `total_debit` must equal `total_credit`
- At least 2 lines required (one debit, one credit)
- Cannot post if validation fails
- Reversal entries create opposite entries

**Accounting Periods:**
```typescript
accounting_periods: {
  id: string
  company_id: string
  period_name: string           // "Jan 2024", "Q1 2024"
  start_date: string
  end_date: string
  status: string                // open, closed, adjusted
  is_adjustment_period?: boolean
  created_at: string
  updated_at: string
}
```

### 4.3 Invoices

**Purpose:** Bill customers for services/products

**Schema:**
```typescript
invoices: {
  id: string                    // UUID primary key
  company_id: string            // Required - tenant isolation
  invoice_number: string        // Unique invoice number
  invoice_date: string          // Billing date
  due_date?: string             // Payment due date
  invoice_type: string          // rental, penalty, service, sales
  status: string                // draft, sent, paid, overdue, cancelled
  payment_status: string        // unpaid, partial, paid, overpaid

  // Customer
  customer_id?: string          // Bill to customer
  contract_id?: string          // Related contract

  // Amounts
  subtotal: number              // Before tax/discounts
  tax_amount?: number           // Tax amount
  discount_amount?: number
  total_amount: number          // Final total
  paid_amount?: number          // Amount paid so far
  balance_due?: number          // Remaining balance

  // Accounting
  journal_entry_id?: string     // Posted entry
  account_id?: string           // Revenue account

  // Cost Center
  cost_center_id?: string

  // Vendor (for supplier invoices)
  vendor_id?: string

  // Fixed Asset (for asset invoices)
  fixed_asset_id?: string

  // OCR/AI Processing
  ocr_data?: Json               // Extracted data from scanned invoice
  ocr_confidence?: number
  scanned_image_url?: string
  manual_review_required?: boolean

  // Legacy
  is_legacy?: boolean           // Imported from old system

  currency?: string
  notes?: string
  terms?: string
  created_at: string
  created_by?: string
  updated_at: string
}
```

**Invoice Items:**
```typescript
invoice_items: {
  id: string
  invoice_id: string            // Parent invoice
  line_number: number           // Sequence
  item_description: string      // Description
  item_description_ar?: string
  quantity?: number             // Quantity (if applicable)
  unit_price: number            // Price per unit
  tax_rate?: number             // Tax percentage
  tax_amount?: number           // Calculated tax
  line_total: number            // Quantity * Unit Price + Tax

  account_id?: string           // Revenue/expense account
  cost_center_id?: string

  created_at: string
}
```

**Invoice-Related Tables:**
- `invoice_ocr_logs` - OCR processing logs
- `invoice_cost_center_analysis` - Cost center breakdown
- `payment_timeline_invoices` - Payment tracking view
- `invoice_payment_summary` - Aggregated data

### 4.4 Payments

**Purpose:** Record payment transactions from customers/vendors

**Schema:**
```typescript
payments: {
  id: string                    // UUID primary key
  company_id: string            // Required - tenant isolation
  payment_number: string        // Unique payment reference
  payment_date: string          // When payment was received/made
  payment_type: string          // rental, deposit, penalty, refund
  payment_method: string        // cash, card, transfer, check
  payment_status: string        // pending, completed, failed, reversed

  // Amounts
  amount: number                // Payment amount
  amount_paid?: number          // Actual amount (for partial payments)
  remaining_amount?: number     // Remaining balance
  late_fee_amount?: number      // Associated late fees
  late_fine_amount?: number

  // Linking
  invoice_id?: string           // Applied to invoice
  contract_id?: string          // Related contract
  customer_id?: string          // From customer
  vendor_id?: string            // To vendor

  // Late Payment Tracking
  days_overdue?: number
  late_fee_days?: number
  late_fine_days_overdue?: number
  late_fine_status?: string     // applied, waived, exempt
  late_fine_type?: string       // percentage, fixed
  late_fine_waiver_reason?: string

  // Accounting
  account_id?: string           // Bank/cash account
  journal_entry_id?: string     // Posted entry
  cost_center_id?: string

  // Transaction Type
  transaction_type: enum        // receipt, payment

  // Processing
  processing_status?: string    // pending, processing, completed
  allocation_status?: string    // allocated, unallocated, partial
  reconciliation_status?: string // reconciled, unreconciled

  // Metadata
  description_type?: string     // What this payment is for
  due_date?: string             // Original due date
  original_due_date?: string
  monthly_amount?: number       // For recurring payments
  payment_month?: string        // For rental payments
  agreement_number?: string     // Contract reference

  // Bank Details
  bank_id?: string
  bank_account?: string
  check_number?: string
  reference_number?: string

  // AI Linking
  linking_confidence?: number   // AI confidence in auto-linking

  currency?: string
  notes?: string
  processing_notes?: string
  created_at: string
  created_by?: string
  updated_at: string
}
```

**Payment-Related Tables:**
- `payment_reminders` - Automated reminders sent
- `payment_promises` - Customer commitments to pay
- `payment_plans` - Installment arrangements
- `payment_timeline` - Payment tracking view
- `late_fees` - Late fee calculations
- `late_fee_history` - Late fee audit trail

**Payment Flow:**
1. Invoice created → `payment_status = 'unpaid'`
2. Payment received → `payments` record created
3. Link payment to invoice
4. Update invoice `paid_amount`, `balance_due`, `payment_status`
5. Create journal entry if `account_id` specified
6. Reconcile with bank statement

---

## 5. API Patterns & Data Access

### 5.1 Supabase Query Patterns

**Direct Supabase Queries:**
```typescript
// Simple query
const { data, error } = await supabase
  .from('contracts')
  .select('*')
  .eq('company_id', companyId)
  .eq('status', 'active');

// With joins
const { data } = await supabase
  .from('contracts')
  .select(`
    *,
    customer:customer_id(
      id,
      first_name_ar,
      last_name_ar,
      phone
    ),
    vehicle:vehicle_id(
      id,
      plate_number,
      make,
      model
    )
  `)
  .eq('company_id', companyId);

// Pagination
const { data, count, error } = await supabase
  .from('contracts')
  .select('*', { count: 'exact' })
  .eq('company_id', companyId)
  .range(offset, offset + limit - 1)
  .order('created_at', { ascending: false });
```

**Pattern Characteristics:**
- Type-safe queries via TypeScript types
- Automatic company_id filtering via RLS
- Foreign key relationships via dot notation
- Pagination with range queries
- Count queries for total records

### 5.2 React Query Integration

**Location:** `src/hooks/api/useContractsApi.ts`

**Hybrid API Pattern:**
```typescript
export function useContracts(filters: ContractFilters = {}) {
  return useQuery({
    queryKey: ['contracts', 'list', companyId, filters],
    queryFn: async (): Promise<ContractsListResponse> => {
      // Try backend API first (with Redis caching)
      const isBackendUp = await checkBackend();

      if (isBackendUp) {
        const response = await apiClient.get('/api/contracts', params);
        if (response.success && response.data) {
          return response.data;
        }
      }

      // Fallback to direct Supabase
      return fetchContractsFromSupabase(companyId, filters);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Benefits:**
- Backend caching reduces database load
- Graceful fallback to Supabase
- Type-safe responses
- Automatic refetching on mutations

### 5.3 Mutation Patterns

**Create:**
```typescript
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Contract>) => {
      const { data: contract, error } = await supabase
      .from('contracts')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return contract as Contract;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['contracts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  },
  });
}
```

**Update:**
```typescript
const { data, error } = await supabase
  .from('contracts')
  .update(updates)
  .eq('id', contractId)
  .select()
  .single();
```

**Delete:**
```typescript
const { error } = await supabase
  .from('contracts')
  .delete()
  .eq('id', contractId);
```

### 5.4 Error Handling

**Pattern:**
```typescript
try {
  const { data, error } = await supabase
    .from('contracts')
    .insert(contractData)
    .select()
    .single();

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message);
  }

  return data;
} catch (err) {
  // Handle error
  notification.error({
    message: 'Failed to create contract',
    description: err.message
  });
}
```

**Error Types:**
- RLS policy violations
- Constraint violations (unique, foreign key)
- Validation errors
- Network errors

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

**1. Sign Up:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
      company_id: 'xxx',
    }
  }
});
```

**2. Sign In:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

**3. Session Management:**
- Session stored in Capacitor storage (mobile) or localStorage (web)
- Auto-refresh token enabled
- Session persists across browser restarts

### 6.2 Authorization (RBAC)

**User Roles:**
```typescript
user_roles: {
  id: string
  user_id: string              // Links to profiles
  role: string                 // super_admin, admin, manager, user
  company_id: string
  permissions: string[]        // Granular permissions
  created_at: string
}
```

**Role Types:**
- `super_admin` - Full system access
- `admin` - Company-level admin
- `manager` - Department manager
- `user` - Standard user
- `driver` - Driver role

**Permission Checking:**
```typescript
function hasPermission(user: User, permission: string): boolean {
  return user?.roles?.some(role =>
    role.permissions?.includes(permission)
  );
}
```

**Protected Routes:**
```typescript
{
  path: '/admin',
  component: AdminDashboard,
  protected: true,
  requiredRole: 'super_admin'
}
```

### 6.3 Company Multi-Tenancy

**Isolation Strategy:**
- All tables have `company_id` column
- RLS policies enforce company isolation
- User can only access their company's data
- Super admins can see all companies

**RLS Policy Example:**
```sql
CREATE POLICY "Users can see own company data"
ON contracts
FOR SELECT
USING (
  company_id = (
    SELECT company_id
    FROM profiles
    WHERE id = auth.uid()
  )
);
```

---

## 7. Critical Findings & Recommendations

### 7.1 Findings

#### Strengths
1. **Comprehensive Schema:** Well-structured database covering all business domains
2. **Multi-Tenancy:** Proper company isolation via `company_id` and RLS
3. **Double-Entry Accounting:** Proper journal entry structure with validation
4. **Type Safety:** Excellent TypeScript integration with auto-generated types
5. **Scalability:** React Query caching with backend API fallback
6. **Mobile Support:** Capacitor storage adapter for iOS/Android

#### Areas for Improvement
1. **Large Types File:** `types.ts` is 25,174 lines (very large)
2. **View Proliferation:** 70+ views (many potentially redundant)
3. **Denormalization:** Some duplicate data across tables
4. **Missing Indexes:** Potential performance issues on large tables
5. **Inconsistent Naming:** Some columns use different terms for same concept

### 7.2 Recommendations

#### 1. Schema Optimization
**Issue:** Large types file, many similar views

**Recommendation:**
- Split `types.ts` into domain-specific files
- Consolidate redundant views
- Create view naming convention

**Priority:** Medium

#### 2. Performance
**Issue:** Missing indexes on frequently queried columns

**Recommendation:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_contracts_company_status ON contracts(company_id, status);
CREATE INDEX idx_payments_company_date ON payments(company_id, payment_date);
CREATE INDEX idx_invoices_customer ON invoices(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_journal_entries_company_date ON journal_entries(company_id, entry_date);
```

**Priority:** High

#### 3. Data Consistency
**Issue:** Denormalized data can get out of sync

**Recommendation:**
- Use triggers to update denormalized columns
- Consider removing some duplication
- Add data validation constraints

**Priority:** Medium

#### 4. Naming Conventions
**Issue:** Inconsistent column naming

**Examples:**
- `account_name` vs `account_name_en`
- `status` vs `payment_status`
- `description` vs `line_description`

**Recommendation:**
- Establish naming convention document
- Create migration to standardize names
- Use ORM for consistent naming

**Priority:** Low

#### 5. Audit Trail
**Issue:** Limited change tracking

**Recommendation:**
- Enhance `audit_trail` table usage
- Add triggers for automatic logging
- Implement soft deletes for critical tables

**Priority:** Medium

### 7.3 Security Considerations

1. **RLS Policies:** Ensure all tables have proper RLS
2. **API Keys:** Rotate Supabase keys regularly
3. **Input Validation:** Validate all user inputs
4. **Rate Limiting:** Implement API rate limiting
5. **Encryption:** Encrypt sensitive data at rest

---

## Appendix: Key Table Reference

### Core Tables Summary

| Table | Purpose | Key Columns | Records |
|-------|---------|-------------|---------|
| `companies` | Multi-tenancy | id, name, subscription_plan | - |
| `profiles` | User profiles | id, user_id, company_id, email | - |
| `employees` | Employee records | id, company_id, employee_number | - |
| `customers` | Customer CRM | id, company_id, customer_code, phone | 781 |
| `vehicles` | Fleet inventory | id, company_id, plate_number, make, model | 510 |
| `contracts` | Rental agreements | id, company_id, customer_id, vehicle_id, status | 588 |
| `invoices` | Billing | id, company_id, invoice_number, total_amount | 1,250 |
| `payments` | Payment transactions | id, company_id, payment_number, amount | 6,568 |
| `chart_of_accounts` | Account hierarchy | id, company_id, account_code, account_type | - |
| `journal_entries` | Accounting entries | id, company_id, entry_number, total_debit, total_credit | - |
| `journal_entry_lines` | Entry line items | id, journal_entry_id, account_id, debit_amount, credit_amount | - |

### Important Relationships

```
companies (1) ----< (*) contracts
companies (1) ----< (*) customers
companies (1) ----< (*) vehicles
companies (1) ----< (*) invoices
companies (1) ----< (*) payments
companies (1) ----< (*) journal_entries

customers (1) ----< (*) contracts
customers (1) ----< (*) invoices
customers (1) ----< (*) payments

vehicles (1) ----< (*) contracts

contracts (1) ----< (*) invoices
contracts (1) ----< (*) payments

invoices (1) ----< (*) payments

chart_of_accounts (1) ----< (*) journal_entry_lines
journal_entries (1) ----< (*) journal_entry_lines
```

---

**Document Version:** 1.0
**Last Updated:** 2025-01-10
**Next Review:** 2025-02-10
