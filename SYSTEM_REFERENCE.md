# Fleetify ERP System - Comprehensive Reference Guide

**Purpose:** This document serves as the complete reference guide for AI systems and developers working on the Fleetify codebase. It provides comprehensive understanding of the system architecture, patterns, and conventions to enable efficient feature development and bug fixing.

**Last Updated:** 2025-01-10

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Frontend Architecture](#6-frontend-architecture)
7. [State Management](#7-state-management)
8. [Routing System](#8-routing-system)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Business Logic](#10-business-logic)
11. [Development Guidelines](#11-development-guidelines)
12. [Common Patterns](#12-common-patterns)
13. [Build & Deployment](#13-build--deployment)
14. [Quick Reference](#14-quick-reference)

---

## 1. Project Overview

**Fleetify** is a comprehensive ERP system for car rental and fleet management, built for شركة العراف لتأجير السيارات (Al-Araf Car Rental) in Qatar.

### Key Business Information
- **Company ID:** `24bc0b21-4e2d-4413-9842-31719a3669f4`
- **Currency:** QAR (Qatari Riyal)
- **Primary Language:** Arabic (RTL support)
- **Secondary Language:** English
- **Deployment:** Vercel (https://www.alaraf.online)

### Core Business Domains
1. **Fleet Management** - Vehicle inventory, maintenance, traffic violations
2. **Contract Management** - Rental contracts, check-in/check-out, renewals
3. **Customer Management** - CRM, customer data, history
4. **Financial Management** - Invoicing, payments, accounting, chart of accounts
5. **Legal Management** - Case tracking, document generation, overdue contracts
6. **HR Management** - Employees, attendance, payroll, permissions
7. **Property Management** - Real estate properties and contracts
8. **Inventory Management** - Stock tracking and purchase orders
9. **Sales/CRM** - Leads, opportunities, quotes, orders
10. **Super Admin** - Multi-tenant company management

---

## 2. Technology Stack

### Core Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Frontend Framework** | React | 18.3.1 | UI rendering |
| **Language** | TypeScript | 5.9.2 | Type safety |
| **Build Tool** | Vite | 7.2.4 | Build & dev server |
| **Routing** | React Router | 6.26.2 | Client-side routing |
| **State Management** | React Query | 5.87.4 | Server state |
| **Database/Backend** | Supabase | 2.57.4 | PostgreSQL + Auth |
| **Styling** | Tailwind CSS | 3.4.15 | Utility-first CSS |
| **UI Components** | Radix UI | Various | Accessible components |
| **Mobile** | Capacitor | 6.1.2 | Native mobile apps |
| **Forms** | React Hook Form | 7.61.1 | Form management |
| **Charts** | Recharts | 2.15.4 | Data visualization |
| **PDF Generation** | jsPDF | 3.0.3 | PDF export |
| **Excel Export** | ExcelJS | 4.4.0 | Excel export |
| **Internationalization** | i18next | 25.6.3 | Translations |
| **Animations** | Framer Motion | 12.23.12 | UI animations |

### Development Tools
- **Testing:** Vitest (unit), Playwright (E2E)
- **Linting:** ESLint 9.35.0
- **Package Manager:** npm (NOT pnpm - important for Vercel deployment)
- **Node Version:** 20.x

---

## 3. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   React UI  │  │   Contexts  │  │   React Query        │ │
│  │  (Components)│  │ (Providers) │  │   (Data Layer)       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────────────┘ │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Route Registry (src/routes)                │ │
│  │  - Route definitions with lazy loading                 │ │
│  │  - Permission-based route protection                   │ │
│  │  - Layout assignment (bento, admin, none)              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Business Logic (src/lib, src/hooks)         │ │
│  │  - Authentication & authorization                     │ │
│  │  - Company scope management (multi-tenancy)           │ │
│  │  - Domain-specific business rules                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ PostgreSQL  │  │    Auth     │  │    Storage          │ │
│  │  (Database) │  │  Service    │  │   (Files)           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

1. **Route Registry Pattern** - Centralized route definitions in `src/routes/index.ts`
2. **Multi-Tenancy** - Company-scoped data access with RLS policies
3. **Lazy Loading** - Code splitting at route level for performance
4. **Error Boundaries** - Multiple levels of error handling
5. **Context Providers** - Shared state through React Context
6. **Server State** - React Query for all server data

---

## 4. Project Structure

```
fleetifyapp/
├── src/
│   ├── components/          # React components (organized by domain)
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── common/          # Shared components
│   │   ├── layouts/         # Layout components
│   │   ├── auth/            # Authentication components
│   │   ├── contracts/       # Contract domain components
│   │   ├── customers/       # Customer domain components
│   │   ├── fleet/           # Vehicle/fleet components
│   │   ├── finance/         # Financial components
│   │   ├── legal/           # Legal/cases components
│   │   └── [domain]/        # Other domain-specific components
│   │
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.tsx  # Authentication state
│   │   ├── CompanyContext.tsx # Company selection/browsing
│   │   ├── FinanceContext.tsx # Financial data sharing
│   │   └── [other]Context.tsx
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── api/             # API interaction hooks
│   │   ├── business/        # Business logic hooks
│   │   ├── company/         # Company access hooks
│   │   ├── finance/         # Financial hooks
│   │   └── [domain]/        # Domain-specific hooks
│   │
│   ├── lib/                 # Core business logic & utilities
│   │   ├── auth.ts          # Authentication service
│   │   ├── companyScope.ts  # Multi-tenancy logic
│   │   ├── validation.ts    # Input validation schemas
│   │   ├── security.ts      # Security configurations
│   │   └── [utilities].ts   # Other utilities
│   │
│   ├── integrations/        # External service integrations
│   │   └── supabase/        # Supabase configuration
│   │       ├── client.ts    # Supabase client
│   │       └── types.ts     # Database type definitions
│   │
│   ├── pages/               # Page-level components
│   │   ├── Dashboard.tsx    # Dashboard page
│   │   ├── [domain]/        # Domain-specific pages
│   │   └── mobile/          # Mobile-specific pages
│   │
│   ├── routes/              # Route registry system
│   │   ├── index.ts         # Route definitions
│   │   └── types.ts         # Route type definitions
│   │
│   ├── locales/             # i18n translation files
│   │   ├── ar/              # Arabic translations
│   │   └── en/              # English translations
│   │
│   ├── App.tsx              # Root application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
│
├── public/                  # Static assets
├── scripts/                 # Utility scripts
├── tests/                   # Test files
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
└── vercel.json              # Deployment configuration
```

---

## 5. Database Schema

### Core Tables & Relationships

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    companies    │────<│      users      │────>│  user_roles     │
│                 │     │                 │     │                 │
│ - id (PK)       │     │ - id (PK)       │     │ - user_id       │
│ - name          │     │ - email         │     │ - role          │
│ - name_ar       │     │ - company_id(FK)│     └─────────────────┘
│ - business_type │     │ - profile_id    │
└─────────────────┘     └────────┬────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   customers     │   │   contracts     │   │    vehicles     │
│                 │   │                 │   │                 │
│ - id (PK)       │   │ - id (PK)       │   │ - id (PK)       │
│ - company_id    │   │ - company_id    │   │ - company_id    │
│ - name          │   │ - customer_id   │   │ - plate_number  │
│ - phone         │   │ - vehicle_id    │   │ - make          │
│ - email         │   │ - status        │   │ - model         │
└─────────────────┘   └────────┬────────┘   └─────────────────┘
                               │
        ┌──────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    invoices     │   │    payments     │   │ journal_entries │
│                 │   │                 │   │                 │
│ - id (PK)       │   │ - id (PK)       │   │ - id (PK)       │
│ - company_id    │   │ - company_id    │   │ - company_id    │
│ - contract_id   │   │ - invoice_id    │   │ - entry_date    │
│ - customer_id   │   │ - amount        │   │ - reference     │
│ - total         │   │ - payment_status│   └────────┬────────┘
└─────────────────┘   └─────────────────┘            │
                                                     ▼
                                          ┌─────────────────┐
                                          │journal_entry_line│
                                          │                 │
                                          │ - id (PK)        │
                                          │ - entry_id (FK)  │
                                          │ - account_id     │
                                          │ - debit          │
                                          │ - credit         │
                                          └─────────────────┘
```

### Important Database Tables

#### companies
Multi-tenant company records. Almost all tables have `company_id` for data isolation.

**Key Columns:**
- `id` (UUID, PK) - Company unique identifier
- `name` - Company name (English)
- `name_ar` - Company name (Arabic)
- `business_type` - Type of business
- `active_modules` - JSON array of enabled modules

**Critical:** Default company ID is `24bc0b21-4e2d-4413-9842-31719a3669f4`

#### users & user_profiles
User authentication and profile data.

**Key Columns:**
- `id` (UUID, PK) - User unique identifier (links to Supabase auth)
- `email` - User email
- `company_id` (FK) - Belongs to company
- `profile_id` (FK) - Links to user_profiles

**user_profiles:**
- `id` (UUID, PK)
- `first_name`, `last_name` - Name fields
- `first_name_ar`, `last_name_ar` - Arabic name fields
- `company_id` - Company association
- `position` - Job position

#### contracts
Rental contract records - the core business entity.

**Key Columns:**
- `id` (UUID, PK)
- `contract_number` - Unique contract identifier (e.g., "CTR-2025-001")
- `company_id` (FK)
- `customer_id` (FK)
- `vehicle_id` (FK)
- `status` - Contract status (active, completed, cancelled, etc.)
- `start_date`, `end_date` - Rental period
- `daily_rate` - Daily rental rate
- `total_amount` - Contract total

**Contract Status Values:**
- `draft` - Initial state
- `active` - Currently rented
- `completed` - Returned and closed
- `cancelled` - Cancelled
- `overdue` - Past due date

#### customers
Customer/Customer records.

**Key Columns:**
- `id` (UUID, PK)
- `company_id` (FK)
- `name`, `name_ar` - Customer names
- `phone` - Primary phone
- `email` - Email address
- `id_number` - Qatari ID
- `credit_limit` - Credit limit for rentals

#### vehicles
Fleet/vehicle inventory.

**Key Columns:**
- `id` (UUID, PK)
- `company_id` (FK)
- `plate_number` - Vehicle plate (unique per company)
- `make` - Vehicle make
- `model` - Vehicle model
- `year` - Manufacturing year
- `status` - Vehicle status (available, rented, maintenance, etc.)
- `daily_rate` - Default daily rental rate

**Vehicle Status Values:**
- `available` - Available for rent
- `rented` - Currently rented out
- `maintenance` - In maintenance
- `out_of_service` - Not available

#### invoices
Billing documents for contracts.

**Key Columns:**
- `id` (UUID, PK)
- `company_id` (FK)
- `invoice_number` - Unique invoice identifier
- `contract_id` (FK) - Associated contract
- `customer_id` (FK)
- `total_amount` - Invoice total
- `status` - Invoice status (draft, sent, paid, overdue)

#### payments
Payment transaction records.

**Key Columns:**
- `id` (UUID, PK)
- `company_id` (FK)
- `invoice_id` (FK)
- `amount` - Payment amount
- `payment_method` - Cash, card, transfer, etc.
- `payment_status` - pending, completed, failed
- `payment_date` - Date of payment

**Payment Status Values:**
- `pending` - Awaiting processing
- `completed` - Successfully processed
- `failed` - Payment failed
- `refunded` - Payment was refunded

#### chart_of_accounts
Financial accounting - double-entry bookkeeping.

**Key Columns:**
- `id` (UUID, PK)
- `company_id` (FK)
- `account_code` - Hierarchical account code (e.g., "1", "1.1", "1.1.1")
- `account_name` - Account name (use this, NOT account_name_en)
- `account_level` - Hierarchy level (1-6)
- `is_header` - True = header account (no postings allowed)
- `account_type` - asset, liability, equity, revenue, expense

**Critical Rules:**
- Only `is_header = false AND account_level >= 3` can have journal entry postings
- Use `account_code` as the primary identifier
- Use `account_name` (NOT `account_name_en`)

#### journal_entries & journal_entry_lines
Double-entry accounting transactions.

**journal_entries (header):**
- `id` (UUID, PK)
- `company_id` (FK)
- `entry_date` - Transaction date
- `reference` - Transaction reference
- `description` - Entry description

**journal_entry_lines (details):**
- `id` (UUID, PK)
- `entry_id` (FK to journal_entries)
- `account_id` (FK to chart_of_accounts)
- `line_description` - Line description (use this, NOT `description`)
- `debit` - Debit amount
- `credit` - Credit amount
- `line_number` - Line sequence

**Critical Rules:**
- Each entry must have at least 2 lines
- Total debits must equal total credits (balanced)
- Use `line_description` (NOT `description`)

### Row Level Security (RLS)

All tables have RLS policies enabled for company isolation:
- `company_id` must be included in all queries
- RLS policies automatically filter data by company
- Super admins can bypass company filtering

---

## 6. Frontend Architecture

### Component Organization

Components are organized by business domain:

```
src/components/
├── ui/                    # shadcn/ui base components (Button, Input, etc.)
├── common/                # Shared components (ErrorBoundary, LazyLoad, etc.)
├── layouts/               # Layout wrappers (BentoLayout, SuperAdminLayout, etc.)
├── auth/                  # Authentication components
├── contracts/             # Contract domain (100+ components)
├── customers/             # Customer domain
├── fleet/                 # Vehicle/fleet domain
├── finance/               # Financial domain
├── legal/                 # Legal/cases domain
├── hr/                    # HR/employee domain
└── [domain]/              # Other domain components
```

### UI Component Library (shadcn/ui)

The app uses shadcn/ui - copy-paste components (NOT npm package).

**Base UI Components** (`src/components/ui/`):
- Button, Input, Select, Checkbox, Radio, Switch, Slider
- Dialog, Alert, Popover, Dropdown Menu, Tooltip
- Table, Form, Label, Card, Tabs, Accordion
- Toast, Sonner (notifications), Skeleton (loading)
- And many more...

**Usage Pattern:**
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
```

### Layout System

**Layout Types:**

1. **BentoLayout** (`src/components/layouts/BentoLayout.tsx`)
   - Main application layout with sidebar
   - Used for most authenticated routes
   - Features: BentoSidebar, mobile responsive, breadcrumb navigation

2. **SuperAdminLayout** (`src/components/layouts/SuperAdminLayout.tsx`)
   - Super admin panel layout
   - Used for company management
   - Features: Dark theme, admin navigation

3. **DashboardLayout** (`src/components/layouts/DashboardLayout.tsx`)
   - Alternative dashboard layout
   - Enhanced sidebar with more features

**Layout Assignment in Routes:**
```tsx
{
  path: '/dashboard',
  component: Dashboard,
  layout: 'bento',  // <-- Determines which layout to use
  protected: true,
}
```

### Component Patterns

**1. Lazy Loading for Pages**
```tsx
// In routes/index.ts
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Route configuration
{
  path: '/dashboard',
  component: Dashboard,
  lazy: true,
}
```

**2. Error Boundaries**
```tsx
// Wrap components with error boundaries
<LazyLoadErrorBoundary>
  <Suspense fallback={<PageSkeletonFallback />}>
    <Component />
  </Suspense>
</LazyLoadErrorBoundary>
```

**3. Permission Guards**
```tsx
// ProtectedRoute checks auth and permissions
<ProtectedRoute requireCompanyAdmin>
  <SensitiveComponent />
</ProtectedRoute>
```

---

## 7. State Management

### Architecture Overview

Fleetify uses a hybrid state management approach:

```
┌────────────────────────────────────────────────────────────┐
│                     State Management Layers                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │  1. Server State (React Query)                      │   │
│  │     - Database queries                               │   │
│  │     - API calls                                      │   │
│  │     - Cache management                               │   │
│  └────────────────────────────────────────────────────┘   │
│                          ▼                                 │
│  ┌────────────────────────────────────────────────────┐   │
│  │  2. Global State (React Context)                    │   │
│  │     - AuthContext (user, session)                   │   │
│  │     - CompanyContext (current company)              │   │
│  │     - FinanceContext (financial data)               │   │
│  │     - AIChatContext (AI assistant)                  │   │
│  └────────────────────────────────────────────────────┘   │
│                          ▼                                 │
│  ┌────────────────────────────────────────────────────┐   │
│  │  3. Local State (useState, useReducer)             │   │
│  │     - Component-specific state                      │   │
│  │     - Form state                                    │   │
│  │     - UI state (modals, menus, etc.)               │   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### React Query Configuration

**Location:** `src/App.tsx`

**Key Settings:**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 2 * 60 * 1000,      // 2 minutes
      gcTime: 5 * 60 * 1000,          // 5 minutes
      networkMode: 'always',         // Prevents hanging on navigation
      retry: 3,
    },
  },
});
```

### Context Providers

**Provider Hierarchy** (in App.tsx):
```tsx
<ErrorBoundary>
  <BrowserRouter>
    <QueryClientProvider>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AIChatProvider>
              <CompanyContextProvider>
                <FABProvider>
                  <FinanceProvider>
                    <MobileOptimizationProvider>
                      <RouteProvider>
                        {/* Routes render here */}
                      </RouteProvider>
                    </MobileOptimizationProvider>
                  </FinanceProvider>
                </FABProvider>
              </CompanyContextProvider>
            </AIChatProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
</ErrorBoundary>
```

#### AuthContext
**Location:** `src/contexts/AuthContext.tsx`

**Provides:**
```tsx
interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  sessionError?: string | null;
  signUp, signIn, signOut, updateProfile, changePassword,
  validateSession, refreshUser
}
```

**Usage:**
```tsx
const { user, loading } = useAuth();
```

#### CompanyContext
**Location:** `src/contexts/CompanyContext.tsx`

**Provides:**
- Current selected company
- Browsing mode (for super admins viewing as company admin)
- Company switching functionality

**Usage:**
```tsx
const { company, setCompany, isBrowsingMode, setBrowsingCompany } = useCompanyContext();
```

### Custom Hooks Organization

**Hook Categories:**

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `hooks/api/` | API interactions | `useContractsApi`, `useCustomersApi` |
| `hooks/business/` | Business logic | `useContractCalculations`, `useContractOperations` |
| `hooks/company/` | Company access | `useBrowsingMode`, `useCompanyPermissions` |
| `hooks/finance/` | Financial operations | `useInvoices`, `useJournalEntries` |
| Domain hooks | Domain-specific logic | `useContracts`, `useVehicles`, `usePayments` |

**Important Hooks:**

**useUnifiedCompanyAccess** - Primary hook for company access control
```tsx
const {
  companyId,
  isSystemLevel,
  hasGlobalAccess,
  filter,  // Use this in queries: { company_id: companyId }
} = useUnifiedCompanyAccess();
```

---

## 8. Routing System

### Route Registry Pattern

**Location:** `src/routes/index.ts`

Routes are centrally defined (not scattered across components).

**Route Configuration:**
```tsx
interface RouteConfig {
  path: string;              // URL path
  component: Component;      // Page component
  lazy: boolean;             // Is component lazy loaded?
  exact?: boolean;           // Exact path match?
  title: string;             // Page title
  description: string;       // Meta description
  group: string;             // Route group (dashboard, fleet, etc.)
  priority: number;          // Sort order
  protected?: boolean;       // Requires authentication
  layout?: 'bento' | 'admin' | 'dashboard' | 'none';
  requiredRole?: 'super_admin' | 'admin';
}
```

**Route Groups:**
- `public` - No auth required (landing, auth)
- `dashboard` - Main dashboard routes
- `fleet` - Vehicle/fleet management
- `contracts` - Contract management
- `customers` - Customer CRM
- `finance` - Financial management
- `legal` - Legal/cases tracking
- `admin` - Super admin routes
- `mobile` - Mobile app routes

### Navigation

**Programmatic Navigation:**
```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/contracts');
navigate('/customers/123');
```

---

## 9. Authentication & Authorization

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────>│  Supabase   │────>│   Auth      │
│  Input      │     │   Auth      │     │  Context    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Database   │
                    │ (users,     │
                    │  profiles)  │
                    └─────────────┘
```

### Authorization (Permissions)

**Role-Based Access Control (RBAC):**

**Roles:**
- `super_admin` - Full system access, can view all companies
- `admin` / `company_admin` - Full access within company
- `user` - Basic access

**Permission Checking:**

```tsx
// Method 1: ProtectedRoute component
<ProtectedRoute requireCompanyAdmin>
  <AdminOnlyComponent />
</ProtectedRoute>

// Method 2: PermissionGuard component
<PermissionGuard permission="delete_contracts">
  <DeleteButton />
</PermissionGuard>

// Method 3: Hook-based checking
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

const { hasFullCompanyControl } = useUnifiedCompanyAccess();

if (hasFullCompanyControl) {
  // Allow action
}
```

### Company Multi-Tenancy

**Core Concept:** Each data record belongs to a `company_id`. Users can only access data from their company (unless super admin).

**Important:** Always include `company_id` filter in database queries:
```tsx
const { companyId } = useUnifiedCompanyAccess();

const { data } = await supabase
  .from('contracts')
  .select('*')
  .eq('company_id', companyId);  // <-- CRITICAL
```

---

## 10. Business Logic

### Domain Services

**Location:** `src/lib/`

**Key Services:**

| File | Purpose |
|------|---------|
| `auth.ts` | Authentication operations |
| `companyScope.ts` | Multi-tenancy access control |
| `validation.ts` | Input validation with Zod schemas |
| `security.ts` | Security configurations |

### Contract Business Logic

**Contract Lifecycle:**
```
draft → active → completed
         ↓
      cancelled
```

### Financial Business Logic

**Chart of Accounts Structure:**
```
Level 1: Asset (1), Liability (2), Equity (3), Revenue (4), Expense (5)
  Level 2: Category (e.g., 1.1 = Current Assets)
    Level 3: Account Group (e.g., 1.1.1 = Cash)
      Level 4+: Specific Accounts
```

**Double-Entry Accounting:**
- Every transaction must have equal debits and credits
- At least 2 line items per entry
- Use `journal_entry_lines` table for details

---

## 11. Development Guidelines

### Code Style

**Language:** TypeScript (strict mode)
**Framework:** React 18 with hooks
**Styling:** Tailwind CSS utility classes

**Naming Conventions:**
- Components: `PascalCase` (e.g., `ContractDetailsPage.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useContractData.ts`)
- Utilities: `camelCase` (e.g., `formatDate.ts`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- Database columns: `snake_case` (e.g., `company_id`)

### TypeScript Best Practices

**Use type imports:**
```tsx
import type { RouteConfig } from '@/routes/types';
```

**Define interfaces for component props:**
```tsx
interface ContractCardProps {
  contract: Contract;
  onViewDetails: (id: string) => void;
}
```

**Use strict types from database schema:**
```tsx
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type InsertContract = Database['public']['Tables']['contracts']['Insert'];
```

### Error Handling

**Use error boundaries:**
```tsx
<ErrorBoundary>
  <Component />
</ErrorBoundary>
```

**Handle async errors:**
```tsx
try {
  const result = await operation();
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('Operation failed');
}
```

---

## 12. Common Patterns

### Data Fetching Pattern

```tsx
// 1. Define query key in a constant
const CONTRACTS_QUERY_KEY = ['contracts'] as const;

// 2. Create a hook for data fetching
export function useContracts(filters?: ContractFilters) {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: [...CONTRACTS_QUERY_KEY, companyId, filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, customers(*), vehicles(*)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
```

### Form Pattern (React Hook Form + Zod)

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define validation schema
const contractSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  vehicle_id: z.string().min(1, 'Vehicle is required'),
  start_date: z.date(),
  end_date: z.date(),
});

type ContractFormData = z.infer<typeof contractSchema>;
```

### Mutation Pattern

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newContract: InsertContract) => {
      const { data, error } = await supabase
        .from('contracts')
        .insert(newContract)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract created successfully');
    },
  });
}
```

### Protected Component Pattern

```tsx
import { ProtectedRoute } from '@/components/common/ProtectedRoute';

export function AdminPage() {
  return (
    <ProtectedRoute requireCompanyAdmin>
      <AdminContent />
    </ProtectedRoute>
  );
}
```

### Company Filter Pattern

```tsx
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export function ContractsList() {
  const { filter } = useUnifiedCompanyAccess();

  const { data } = useQuery({
    queryKey: ['contracts', filter.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('company_id', filter.company_id);
      return data;
    },
  });

  return <div>{/* Render contracts */}</div>;
}
```

---

## 13. Build & Deployment

### Development Commands

```bash
# Start development server (port 8080)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm run test
```

### Build Commands

```bash
# Production build (for CI)
npm run build:ci

# Local production build
npm run build

# Preview production build
npm run preview
```

### Mobile Build Commands

```bash
# Build for mobile
npm run build:mobile

# Sync to native platforms
npm run mobile:sync

# Build Android APK
npm run android:build

# Build iOS app
npm run ios:build
```

### Deployment

**Platform:** Vercel

**Configuration:** `vercel.json`
```json
{
  "buildCommand": "npm install && npm run build:ci",
  "outputDirectory": "dist",
  "devCommand": "npm run dev"
}
```

**Important:** Use `npm install` (NOT pnpm) in Vercel config.

### Environment Variables

Required environment variables (set in Vercel dashboard):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_ENABLE_PWA` - Enable PWA features (optional)

---

## 14. Quick Reference

### Common Imports

```tsx
// React & Router
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

// Supabase
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Context & Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

// React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Utilities
import { format } from 'date-fns';
import { z } from 'zod';
```

### Database Query Pattern

```tsx
// SELECT with company filter
const { data } = await supabase
  .from('table_name')
  .select('*')
  .eq('company_id', companyId);

// INSERT
const { data, error } = await supabase
  .from('table_name')
  .insert({ company_id, ...values })
  .select()
  .single();

// UPDATE
const { data, error } = await supabase
  .from('table_name')
  .update(values)
  .eq('id', id)
  .eq('company_id', companyId);

// DELETE
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id)
  .eq('company_id', companyId);
```

### Important Notes

1. **Always filter by `company_id`** in database queries
2. **Use `account_name` not `account_name_en`** for chart of accounts
3. **Use `line_description` not `description`** for journal entry lines
4. **Use `payment_status` not `status`** for payments
5. **Use `account_level` not `level`** for chart of accounts
6. **React Query has `networkMode: 'always'`** to prevent navigation hanging
7. **Never hardcode credentials or API keys**
8. **Use npm (not pnpm) for Vercel deployment**
9. **Always use TypeScript strict mode**
10. **Follow the existing code style and patterns**

---

## Document Maintenance

This document should be updated when:
- New major features are added
- Architecture patterns change
- New domains are introduced
- Database schema changes significantly
- Build/deployment process changes

---

*This document is maintained as part of the Fleetify ERP system and should be kept in sync with the codebase.*
