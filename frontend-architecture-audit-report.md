# Fleetify Frontend Architecture Audit Report

**Generated:** 2025-01-10
**Project:** Fleetify ERP System
**Tech Stack:** React 18 + TypeScript + Vite + Supabase
**Total Component Files:** 944+ TSX components

---

## Executive Summary

Fleetify is a comprehensive ERP system for car rental and fleet management, built as a multi-tenant SaaS application targeting the Qatari market (Arabic/English RTL support). The application follows a modern React architecture with significant investment in component organization, routing, and mobile support.

**Key Metrics:**
- 944+ component files
- 100+ routes across 13 route groups
- 150+ custom hooks
- 80+ shadcn/ui components
- Mobile-first responsive design
- Full RTL (Arabic) support

---

## 1. Project Structure

### 1.1 Directory Organization

```
src/
├── assets/                    # Static assets (images, fonts, icons)
├── components/                # All React components (944+ files)
│   ├── ui/                   # shadcn/ui base components (80+ files)
│   ├── common/               # Shared/common components
│   ├── contracts/            # Contract management components
│   ├── customers/            # Customer CRM components
│   ├── dashboard/            # Dashboard widgets and layouts
│   ├── fleet/                # Vehicle/fleet management
│   ├── finance/              # Financial components
│   ├── legal/                # Legal/cases tracking
│   ├── hr/                   # Human resources
│   ├── mobile/               # Mobile-specific components
│   ├── sales/                # Sales/CRM components
│   ├── admin/                # Super admin components
│   └── [30+ domain folders]
├── contexts/                  # React Context providers (8 files)
├── hooks/                     # Custom React hooks (150+ files)
│   ├── api/                  # API interaction hooks
│   ├── business/             # Business logic hooks
│   ├── company/              # Company-related hooks
│   ├── finance/              # Financial hooks
│   ├── integrations/         # Integration hooks
│   └── [root level hooks]    # Domain-specific hooks
├── integrations/
│   └── supabase/             # Supabase client and types
├── layouts/                   # Layout components
├── lib/                       # Utility libraries
├── pages/                     # Page-level components
├── routes/                    # Route registry system
├── styles/                    # Global CSS styles
├── utils/                     # Utility functions
└── i18n/                      # Internationalization
```

### 1.2 Key Architectural Patterns

**Pattern 1: Domain-Driven Component Organization**
- Components are organized by business domain (contracts, customers, fleet, etc.)
- Each domain has its own subdirectory with related components
- Shared components live in `components/common/`

**Pattern 2: Route Registry System**
- Centralized route definitions in `src/routes/index.ts`
- Reduces App.tsx complexity
- Enables features like lazy loading, authentication, and role-based access

**Pattern 3: Mobile-First Architecture**
- Dedicated mobile routes (`/mobile/*`)
- Mobile-specific components in `components/mobile/`
- Capacitor integration for native mobile apps

---

## 2. Component Architecture

### 2.1 UI Component Library (shadcn/ui)

**Location:** `src/components/ui/`

**Components (80+):**
- Accordion, Alert, Alert Dialog, Avatar, Badge, Breadcrumb
- Button, Calendar, Card, Carousel, Chart, Checkbox
- Collapsible, Command, Context Menu, Date Field, Date Range Picker
- Dialog, Drawer, Dropdown Menu, Empty State, Form components
- Hover Card, Input, Label, Loading Spinner, Menubar
- Navigation Menu, Native components (bottom sheet, button, card, spinner)
- Number Display/Input, Optimized Image, Page Breadcrumb, Pagination
- Popover, Progress, Radio Group, Resizable, Responsive components
- Scroll Area, Select, Separator, Slider, Switch, Tabs
- Textarea, Toast, Tooltip, and more

**Key Implementation Details:**
- All components use Radix UI primitives
- Tailwind CSS for styling
- Full TypeScript support
- Accessibility features built-in
- RTL support for Arabic

### 2.2 Component Organization by Domain

| Domain | Directory | Key Components |
|--------|-----------|----------------|
| **Customers** | `components/customers/` | CustomerDetailsPage, CustomerCRM, CustomerForm |
| **Contracts** | `components/contracts/` | ContractDetailsPage, ContractWizard, PaymentSchedules |
| **Fleet** | `components/fleet/` | VehicleDetailsPage, MaintenanceForm, TrafficViolations |
| **Finance** | `components/finance/` | InvoiceScanner, PaymentUpload, ChartOfAccounts |
| **Legal** | `components/legal/` | LegalCasesTracking, SmartDocumentGenerator |
| **HR** | `components/hr/` | Employees, Attendance, LeaveManagement |
| **Dashboard** | `components/dashboard/` | BentoSidebar, BentoLayout, DashboardWidgets |
| **Mobile** | `components/mobile/` | MobileApp, MobileContractWizard, MobileCarDetail |
| **Admin** | `components/super-admin/` | CompanyManagement, UserManagement, Settings |

### 2.3 Component Patterns

**Pattern 1: Redesigned vs Classic Components**
Many pages have multiple versions:
- `CustomerDetailsPage` - Redesigned with modern UI
- `CustomerDetailsPageNew` - Previous design
- `CustomerDetailsPage` (classic variant) - Legacy

This pattern exists for:
- Vehicle details (VehicleDetailsPageNew vs VehicleDetailsPageRedesigned)
- Dashboard (Dashboard, DashboardV2, DashboardLanding)
- Contracts (ContractsRedesigned vs classic)

**Pattern 2: Wizard-Based Forms**
- ContractWizard (multi-step contract creation)
- MobileContractWizard (mobile-optimized version)
- AccountingWizard (chart of accounts setup)

**Pattern 3: Details Pages**
Most entities have dedicated details pages:
- CustomerDetailsPage
- VehicleDetailsPage
- ContractDetailsPage
- PropertyDetails
- SupportTicketDetail

---

## 3. Routing System

### 3.1 Route Registry Architecture

**File:** `src/routes/index.ts`

**Route Configuration Structure:**
```typescript
interface RouteConfig {
  path: string;              // Route path pattern
  component: ComponentType;  // React component
  lazy: boolean;             // Lazy loading flag
  exact: boolean;            // Exact path match
  title: string;             // Page title
  description: string;       // Page description
  group: string;             // Route group (13 groups)
  priority: number;          // Loading priority
  protected?: boolean;       // Requires auth
  layout?: 'none' | 'dashboard' | 'admin' | 'minimal';
  requiredRole?: string | string[];  // Role-based access
}
```

### 3.2 Route Groups

| Group ID | Name | Layout | Priority | Routes |
|----------|------|--------|----------|--------|
| `public` | Public Routes | none | 1 | Landing, auth, about, careers |
| `mobile` | Mobile App | none | 3 | Mobile login, home, cars, contracts |
| `dashboard` | Dashboard | bento | 10 | Main dashboard, V2, landing |
| `finance` | Finance | bento | 11 | Finance, invoice scanner, payments |
| `customers` | Customers | bento | 12 | Customer list, details, CRM |
| `contracts` | Contracts | bento | 13 | Contract list, details, wizard |
| `fleet` | Fleet | bento | 14 | Fleet list, vehicle details, maintenance |
| `reports` | Reports | bento | 15 | Reports hub, report view |
| `admin` | Admin | admin | 20 | Super admin routes (role-gated) |
| `settings` | Settings | bento | 21 | Profile, settings, audit logs |
| `properties` | Properties | bento | 22 | Property management |
| `hr` | HR | bento | 23 | Employees, attendance, payroll |
| `sales` | Sales | bento | 24 | Sales pipeline, leads, quotes |
| `legal` | Legal | bento | 25 | Legal cases, documents, delinquency |
| `inventory` | Inventory | bento | 26 | Inventory management |

### 3.3 Route Statistics

**Total Routes:** 100+
**Lazy Loaded:** ~90%
**Protected Routes:** ~85%
**Mobile Routes:** 10+

**Key Route Patterns:**
- Entity list pages: `/customers`, `/contracts`, `/fleet`
- Entity details: `/customers/:customerId`, `/contracts/:contractNumber`
- Sub-resources: `/fleet/maintenance`, `/finance/payments/quick`
- Admin routes: `/admin/*` (requires super_admin role)
- Mobile routes: `/mobile/*` (mobile-optimized UI)

### 3.4 Route Provider & Context

**File:** `src/components/router/RouteProvider.tsx`

**Features:**
- Route state management
- Navigation utilities (navigate, goBack, replace, refresh)
- Route parameter parsing
- Query parameter parsing
- Metadata updates (title, description, OpenGraph)
- Route history tracking

**Custom Hooks:**
- `useRoute()` - Full route context
- `useCurrentRoute()` - Current route config
- `useRouteNavigation()` - Navigation utilities
- `useRouteState()` - Route state
- `useRouteParams()` - URL parameters
- `useRouteQuery()` - Query parameters

---

## 4. Styling & UI System

### 4.1 Tailwind CSS Configuration

**File:** `tailwind.config.ts`

**Custom Breakpoints:**
```typescript
xs: '320px'
sm: '640px'
md: '768px'
lg: '1024px'
xl: '1280px'
2xl: '1536px'
// Mobile-specific
mobile-sm: '375px'   // iPhone SE
mobile-md: '414px'   // iPhone 11 Pro
mobile-lg: '428px'   // iPhone 12 Pro Max
tablet-sm: '768px'   // iPad Mini
tablet-md: '834px'   // iPad Air
tablet-lg: '1024px'  // iPad Pro
```

### 4.2 Color System

**CSS Variables (HSL format):**

```css
/* Base Colors */
--background: 0 0% 96%
--foreground: 0 0% 15%
--card: 0 0% 100%
--card-foreground: 0 0% 15%

/* Primary - Deep Red */
--primary: 0 70% 45%
--primary-foreground: 0 0% 100%
--primary-light: 0 70% 55%
--primary-glow: 0 70% 45% / 0.2

/* Accent - Professional Orange */
--accent: 25 90% 92%
--accent-foreground: 0 0% 15%
--accent-light: 25 90% 95%

/* Status Colors */
--success: 142 56% 42%
--warning: 25 85% 55%
--destructive: 0 65% 51%

/* Sidebar - Charcoal */
--sidebar-background: 0 0% 20%
--sidebar-foreground: 0 0% 90%
--sidebar-primary: 0 70% 45%

/* Coral Accent (Bento Design) */
coral: {
  50: '#fef5f3' to 900: '#7a2c23'
}
```

### 4.3 RTL (Arabic) Support

**Implementation:**
- `dir="rtl"` on body element
- `text-align: right` as default
- Arabic font families: Cairo, Tajawal, Amiri, Noto Kufi Arabic, Reem Kufi
- RTL-specific text rendering optimizations
- RTL-aware spacing utilities
- Leaflet map controls RTL support

**Typography System:**
```css
.arabic-heading-xl { font-size: 4.5rem; line-height: 1.1; }
.arabic-heading-lg { font-size: 3rem; line-height: 1.2; }
.arabic-heading-md { font-size: 2rem; line-height: 1.3; }
.arabic-body { font-size: 1.125rem; line-height: 1.6; }
```

### 4.4 Mobile-Specific Styles

**Touch Targets:**
```css
--touch-target-min: 44px
--touch-target-recommended: 48px
--touch-target-comfortable: 56px
```

**Mobile Spacing:**
```css
--mobile-spacing-xs: 0.5rem
--mobile-spacing-sm: 0.75rem
--mobile-spacing-md: 1rem
--mobile-spacing-lg: 1.25rem
--mobile-spacing-xl: 1.5rem
```

**Safe Area Insets:**
```css
--safe-area-top: env(safe-area-inset-top)
--safe-area-bottom: env(safe-area-inset-bottom)
--safe-area-left: env(safe-area-inset-left)
--safe-area-right: env(safe-area-inset-right)
```

### 4.5 Custom Animations

**Keyframes:**
- `slideInUp`, `slideInRight` - Page transitions
- `shimmer` - Loading skeletons
- `border-beam` - Border animations
- `bubble-in` - Chat message animations
- `typing` - Typing indicator
- `pulse-glow` - Status indicators
- `mobile-bounce` - Mobile touch feedback
- `swipe-reveal` - Swipe actions
- `tab-switch` - Tab transitions

---

## 5. Key Features by Domain

### 5.1 Customer Management (CRM)

**Pages:**
- `/customers` - Customer list with search and filters
- `/customers/:customerId` - Customer details (redesigned)
- `/customers/:customerId/classic` - Classic customer details
- `/customers/crm` - Customer relationship management

**Components:**
- `CustomerDetailsPage` - Modern SaaS-style details
- `CustomerDetailsPageNew` - Previous version
- `CustomerCRM` - CRM features
- `CustomerForm` - Customer creation/editing
- `MobileCustomerForm` - Mobile-optimized form
- `MobileCustomerDetails` - Mobile customer view

**Features:**
- Customer search and filtering
- Customer documents management
- Contract history
- Payment history
- Communication tracking

### 5.2 Contract Management

**Pages:**
- `/contracts` - Contract list
- `/contracts/:contractNumber` - Contract details
- `/contracts/duplicates` - Duplicate contract manager
- `/contracts/diagnostics` - Contract diagnostics

**Components:**
- `ContractDetailsPage` - Contract details view
- `ContractWizard` - Multi-step contract creation
- `MobileContractWizard` - Mobile contract creation
- `DuplicateContractsManager` - Manage duplicate contracts
- `PaymentSchedules` - Payment schedule management

**Features:**
- Contract creation wizard
- Document generation (PDF)
- Payment schedule management
- Contract status tracking
- Duplicate detection and resolution

### 5.3 Fleet Management

**Pages:**
- `/fleet` - Fleet list
- `/fleet/vehicles/:vehicleId` - Vehicle details (V2)
- `/fleet/vehicles/:vehicleId/classic` - Classic vehicle details
- `/fleet/maintenance` - Maintenance management
- `/fleet/traffic-violations` - Traffic violations
- `/fleet/reports` - Fleet reports
- `/fleet/dispatch-permits` - Dispatch permits
- `/fleet/reservations` - Vehicle reservations
- `/fleet/vehicle-installments` - Vehicle installments

**Components:**
- `VehicleDetailsPageNew` - Premium vehicle details
- `VehicleDetailsPage` - Classic vehicle details
- `MaintenanceForm` - Maintenance form
- `TrafficViolationsRedesigned` - Violations management
- `FleetReports` - Fleet analytics

**Features:**
- Vehicle condition tracking with diagram
- Maintenance scheduling
- Traffic violation tracking
- Dispatch permit management
- Reservation system
- Installment management

### 5.4 Finance Management

**Pages:**
- `/finance/*` - Main finance hub
- `/finance/invoice-scanner` - Invoice OCR scanner
- `/finance/tracking` - Financial tracking
- `/finance/sync-payments` - Sync payments to ledger
- `/finance/payments/register` - Payment registration
- `/finance/payments/quick` - Quick payment processing
- `/finance/vendors` - Vendor management
- `/finance/purchase-orders` - Purchase orders

**Components:**
- `InvoiceScannerPage` - OCR-based invoice scanning
- `FinancialTracking` - Financial dashboard
- `PaymentRegistration` - Payment entry form
- `QuickPayment` - Quick payment UI
- `ChartOfAccounts` - Account management
- `JournalEntries` - Journal entry management

**Features:**
- Chart of accounts (hierarchical, levels 1-6)
- Journal entries with line items
- Payment processing
- Invoice generation
- Financial reports
- AR aging reports
- Vendor management
- Purchase orders

**Important Database Columns:**
- `chart_of_accounts`: account_code, account_name, account_level, is_header
- `journal_entry_lines`: line_description, line_number
- `payments`: payment_status

### 5.5 Legal Management

**Pages:**
- `/legal` - Legal hub
- `/legal/cases` - Legal cases tracking
- `/legal/cases-v2` - V2 cases tracking
- `/legal/defaulters` - Defaulters list
- `/legal/reports` - Legal reports
- `/legal/late-fees` - Late fees management
- `/legal/whatsapp-reminders` - WhatsApp reminders
- `/legal/disputes` - Invoice disputes
- `/legal/document-generator` - Smart document generator
- `/legal/documents` - Company legal documents
- `/legal/delinquency` - Financial delinquency management
- `/legal/lawsuit/prepare/:contractId` - Lawsuit preparation

**Components:**
- `LegalCasesTracking` - Case tracking
- `LegalCasesTrackingV2` - Updated case tracking
- `SmartDocumentGenerator` - AI-powered document generation
- `FinancialDelinquency` - Delinquency management
- `LawsuitPreparation` - Lawsuit preparation

**Features:**
- Case tracking and management
- Document generation (Arabic legal documents)
- Late fee calculations
- WhatsApp reminders
- Invoice dispute resolution
- Defaulter identification
- Lawsuit preparation

### 5.6 HR Management

**Pages:**
- `/hr/employees` - Employee management
- `/hr/users` - User management
- `/hr/attendance` - Attendance tracking
- `/hr/leave` - Leave management
- `/hr/locations` - Location settings
- `/hr/payroll` - Payroll management
- `/hr/reports` - HR reports
- `/hr/settings` - HR settings

**Components:**
- `Employees` - Employee list and management
- `UserManagement` - User and permissions
- `Attendance` - Attendance tracking
- `LeaveManagement` - Leave requests
- `Payroll` - Payroll processing

**Features:**
- Employee management
- Attendance tracking
- Leave management
- Location settings
- Payroll processing
- HR reporting
- User and permissions management

### 5.7 Admin/Super Admin

**Pages:**
- `/admin` - Super admin dashboard
- `/admin/dashboard` - Admin dashboard
- `/admin/companies` - Company management
- `/admin/companies/create` - Create company
- `/admin/users` - User management
- `/admin/settings` - Admin settings
- `/admin/support` - Customer support
- `/admin/payments` - Payment administration
- `/admin/reports` - Admin reports
- `/admin/quality` - Quality dashboard
- `/admin/landing` - Landing page management

**Components:**
- `SuperAdmin` - Main admin layout
- `SuperAdminCompanies` - Company management
- `SuperAdminUsers` - User management
- `QualityDashboard` - Quality monitoring
- `LandingManagement` - Landing page editor

**Features:**
- Multi-tenant company management
- User administration
- Payment monitoring
- Support ticket management
- Quality dashboard
- Landing page management

---

## 6. Mobile Support

### 6.1 Capacitor Configuration

**File:** `capacitor.config.ts`

**App Details:**
- App ID: `com.alaraf.fleetify`
- App Name: `Fleetify - فليتفاي`
- Web Dir: `dist`
- Android Scheme: `https`
- Build Type: APK (Android), IPA (iOS)

**Features:**
- SplashScreen (2s duration, primary color)
- StatusBar (DARK style)
- Keyboard (ionic resize, DARK style)
- Camera permissions
- Geolocation permissions
- Push notifications

### 6.2 Mobile Routes

**Login:**
- `/mobile` - Mobile login screen (public)

**Main App:**
- `/mobile/home` - Mobile app home with tabs
- `/mobile/cars` - Cars list tab
- `/mobile/contracts` - Contracts list tab
- `/mobile/overdue` - Overdue contracts tab
- `/mobile/customers` - Customers list tab

**Entity Details:**
- `/mobile/contracts/new` - New contract wizard
- `/mobile/contracts/:contractId` - Contract details
- `/mobile/cars/:vehicleId` - Vehicle details
- `/mobile/customers/new` - New customer form
- `/mobile/customers/:customerId` - Customer details
- `/mobile/customers/:customerId/edit` - Edit customer

### 6.3 Mobile Components

**File:** `src/pages/mobile/MobileApp.tsx`

**Tab System:**
- Cars tab
- Contracts tab
- Overdue tab
- Customers tab

**Features:**
- Bottom tab navigation
- Touch-optimized interface
- Swipe gestures
- Mobile-specific forms
- Native-style components

**Mobile-Only Pages:**
- `MobileLogin` - Login screen
- `MobileContractWizard` - Contract creation
- `MobileContractDetails` - Contract details
- `MobileCarDetail` - Vehicle details
- `MobileCustomerDetails` - Customer details
- `MobileCustomerForm` - Customer form

### 6.4 Mobile-Specific Styling

**Files:**
- `src/styles/native-mobile.css`
- `src/styles/mobile-fixes.css`
- `src/styles/mobile-native-pages.css`

**Key Features:**
- Touch target sizing (min 44px)
- Safe area insets for notch devices
- Mobile-specific spacing
- Mobile typography scales
- Touch feedback animations
- Haptic feedback utilities
- Scroll optimization

---

## 7. Performance Optimizations

### 7.1 Vite Build Configuration

**File:** `vite.config.ts`

**Optimizations:**
- `@vitejs/plugin-react-swc` - Fast React refresh
- Rollup code splitting
- Terser minification
- Console removal in production
- Bundle visualization (rollup-plugin-visualizer)

**Code Splitting Strategy:**
```typescript
manualChunks: (id) => {
  // Keep react-router-dom in main entry
  // React vendor chunk
  // UI components vendor chunk (@radix-ui)
  // Query vendor chunk (@tanstack)
  // Recharts/Leaflet automatic
}
```

**Optimize Dependencies:**
- React, React DOM
- All Radix UI components
- React Router DOM
- Framer Motion
- TanStack Query

### 7.2 Lazy Loading

**Route-Level Lazy Loading:**
- ~90% of routes use `React.lazy()`
- Suspense boundaries with loading fallbacks
- Priority-based loading

**Example:**
```typescript
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CustomersPageRedesigned = lazy(() => import('@/pages/customers/CustomersPageRedesigned'));
```

**Component-Level Lazy Loading:**
- AI Chat Widget: `lazy(() => import('@/components/ai-chat-assistant/AIChatWidget'))`
- Command Palette: `lazy(() => import('@/components/ui/CommandPalette'))`
- PWA Install Prompt: `lazy(() => import('@/components/PWAInstallPrompt'))`

### 7.3 React Query Configuration

**File:** `src/App.tsx`

**Query Client Config:**
```typescript
{
  queries: {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 5 * 60 * 1000,          // 5 minutes
    retry: (failureCount, error) => {
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 3;
    },
    networkMode: 'always',          // Prevents infinite loading
  }
}
```

### 7.4 Route Preloading

**File:** `src/utils/routePreloading.ts`

**Critical Routes:**
```typescript
CRITICAL_ROUTES: ['/dashboard', '/customers', '/contracts', '/fleet']
```

**Preload Strategy:**
- Viewport-based preloading
- Idle callback preloading
- Related route preloading

### 7.5 Performance Monitoring

**Components:**
- `performanceMonitor` class
- `performanceLogger` utility
- `PerformanceMonitor` UI component

**Features:**
- Component mount time tracking
- Data fetch time tracking
- Navigation time tracking
- API response monitoring

---

## 8. Error Handling

### 8.1 Error Boundary

**File:** `src/lib/errorBoundary.tsx`

**Features:**
- Catches React rendering errors
- Logs detailed error information
- Shows user-friendly error message (Arabic)
- Displays error details in development mode
- Detects compatibility issues (Radix UI, React Hook Form, Framer Motion)
- Detects database/table errors

**Error Detection:**
```typescript
// Library conflicts
- forwardRef errors (Radix UI)
- react-hook-form errors
- framer-motion errors

// Database errors
- property_contracts (property business type)
- PGRST errors (missing tables)
```

### 8.2 Route Error Boundary

**File:** `src/components/common/RouteErrorBoundary.tsx`

**Features:**
- Route-specific error handling
- Navigation error recovery
- Error state preservation

### 8.3 Enhanced Error Handler

**File:** `src/lib/enhancedErrorHandler.ts`

**Features:**
- Error classification
- Error reporting
- Recovery strategies
- User notifications

---

## 9. State Management

### 9.1 React Context Providers

**Provider Stack (App.tsx):**
```
ErrorBoundary
└── QueryClientProvider
    └── AuthProvider
        └── AIChatProvider
            └── CompanyContextProvider
                └── FABProvider
                    └── FinanceProvider
                        └── MobileOptimizationProvider
                            └── RouteProvider
                                └── RouteErrorBoundary
```

### 9.2 Context Providers

| Provider | Purpose | Location |
|----------|---------|----------|
| `AuthProvider` | User authentication state | `contexts/AuthContext.tsx` |
| `CompanyContextProvider` | Current company context | `contexts/CompanyContext.tsx` |
| `FABProvider` | Floating action button state | `contexts/FABContext.tsx` |
| `FinanceProvider` | Financial data context | `contexts/FinanceContext.tsx` |
| `AIChatProvider` | AI chat assistant state | `contexts/AIChatContext.tsx` |
| `AccessibilityContext` | Accessibility settings | `contexts/AccessibilityContext.tsx` |
| `FeatureFlagsContext` | Feature flag management | `contexts/FeatureFlagsContext.tsx` |
| `CustomerViewContext` | Customer view preferences | `contexts/CustomerViewContext.tsx` |

### 9.3 Custom Hooks (150+)

**API Hooks:**
- `useContractsApi` - Contract API calls
- `useCustomersApi` - Customer API calls
- `useDashboardApi` - Dashboard data
- `useEmployeesApi` - Employee management
- `useInvoicesApi` - Invoice operations
- `useVehiclesApi` - Vehicle data
- `useViolationsApi` - Traffic violations

**Business Logic Hooks:**
- `useContractCalculations` - Contract math
- `useContractOperations` - Contract operations
- `useCustomerOperations` - Customer operations
- `usePaymentOperations` - Payment operations

**Company Hooks:**
- `useBrowsingMode` - Browsing mode state
- `useCompanyAccess` - Company access control
- `useCompanyFiltering` - Company data filtering
- `useCompanyPermissions` - Permission checks

**Finance Hooks:**
- `useInvoices` - Invoice management
- `useJournalEntries` - Journal entries
- `usePaymentValidation` - Payment validation

**Integration Hooks:**
- `useCustomerOrderFulfillment` - Order fulfillment
- `useInventoryPOSummary` - Purchase orders
- `useVendorPerformanceScorecard` - Vendor ratings

**Domain-Specific Hooks (100+):**
- Accounting, attendance, audit, budgets, contracts, customers, employees, finance, fleet, HR, legal, payments, reports, sales, vehicles, and more

---

## 10. Internationalization (i18n)

### 10.1 Language Support

**Primary Languages:**
- Arabic (ar) - Primary language, RTL
- English (en) - Secondary language, LTR

**Implementation:**
- i18next for internationalization
- React hook integration
- RTL/LTR switching
- Arabic font support

**Fonts:**
- Cairo (primary)
- Tajawal (headings)
- Amiri (traditional)
- Noto Kufi Arabic
- Reem Kufi

### 10.2 RTL Implementation

**Global Settings:**
```css
body {
  direction: rtl;
  text-align: right;
}
```

**RTL Utilities:**
- `dir="rtl"` attribute
- RTL spacing utilities
- RTL-specific text rendering
- Leaflet map RTL controls

---

## 11. Layout System

### 11.1 Bento Layout

**File:** `src/components/layouts/BentoLayout.tsx`

**Features:**
- Fixed sidebar (260px width on desktop)
- Mobile hamburger menu
- Mobile slide-out sidebar with animation
- Breadcrumb navigation
- AI Chat Widget integration
- Tour guide integration
- Task notification bell

**Layout Structure:**
```
┌─────────────────────────────────────┐
│ Mobile Header (hidden on desktop)   │
├─────────┬───────────────────────────┤
│         │ Breadcrumb                │
│ Sidebar │                           │
│ (fixed) │ Main Content              │
│ 260px   │                           │
│         │                           │
│         │ AI Chat Widget            │
└─────────┴───────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────────────────────────┐
│ Header (60px)                       │
├─────────────────────────────────────┤
│                                     │
│ Content (scrollable)                │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ AI Chat Widget (floating)           │
└─────────────────────────────────────┘
```

### 11.2 Admin Layout

**File:** `src/components/layouts/SuperAdminLayout.tsx`

**Features:**
- Admin-specific sidebar
- Role-based navigation
- Admin tools access

### 11.3 Other Layouts

- `MinimalLayout` - No sidebar, minimal UI
- `NoneLayout` - No layout wrapper (public pages)

---

## 12. Testing

### 12.1 Test Structure

**Test Locations:**
- Component tests: Co-located in `__tests__` directories
- Unit tests: `src/__tests__/`
- E2E tests: Playwright configuration

**Test Examples:**
- `src/components/contracts/__tests__/`
- `src/components/finance/__tests__/`
- `src/hooks/__tests__/`

### 12.2 Testing Stack

- **Unit Tests:** Vitest
- **Component Tests:** @testing-library/react
- **E2E Tests:** Playwright
- **Coverage:** Vitest coverage

---

## 13. Build & Deployment

### 13.1 Build Configuration

**Vite Config:**
- Target: ESNEXT
- Minification: Terser
- Source Maps: Development (inline)
- Console Removal: Production

### 13.2 Deployment

**Platform:** Vercel
- Build command: `npm run build:ci`
- Output directory: `dist/`
- Package manager: npm

**Mobile:**
- Android APK builds
- iOS IPA builds
- Capacitor native plugins

---

## 14. Security Considerations

### 14.1 Environment Variables

**File:** `src/lib/env.ts`

**Features:**
- Secure Supabase config loading
- Debug logging
- Security logging
- Validation

### 14.2 Authentication

**Provider:** `AuthProvider`
- Supabase authentication
- Session management
- Token refresh
- Capacitor storage adapter

### 14.3 Authorization

**Role-Based Access:**
- `super_admin` - Full system access
- `admin` - Company administration
- Regular users - Standard access

**Route Protection:**
- `protected: true` flag
- `requiredRole` property
- Route guards

---

## 15. Accessibility

### 15.1 Accessibility Features

**File:** `src/styles/accessibility.css`

**Features:**
- WCAG compliance
- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast

### 15.2 Accessibility Context

**Provider:** `AccessibilityContext`
- Accessibility preferences
- Font size scaling
- High contrast mode
- Reduced motion

---

## 16. Key Findings & Recommendations

### 16.1 Strengths

1. **Well-Organized Architecture**
   - Clear domain separation
   - Centralized routing
   - Consistent component patterns

2. **Mobile-First Design**
   - Dedicated mobile routes
   - Touch-optimized interface
   - Capacitor integration

3. **Comprehensive UI Library**
   - 80+ shadcn/ui components
   - Consistent design system
   - RTL support

4. **Performance Optimization**
   - Lazy loading
   - Code splitting
   - Query caching

5. **TypeScript Adoption**
   - Full type coverage
   - Database type generation
   - Route type safety

### 16.2 Areas for Improvement

1. **Component Versioning**
   - Multiple versions of similar components
   - Consider consolidating or using feature flags

2. **Documentation**
   - Missing inline documentation
   - No component storybook
   - Limited API documentation

3. **Test Coverage**
   - Limited test coverage visible
   - Consider adding more unit tests
   - E2E test expansion

4. **State Management**
   - Multiple contexts could be consolidated
   - Consider state management library for complex flows

5. **Bundle Size**
   - Large number of dependencies
   - Consider tree-shaking improvements
   - Bundle size budget monitoring

### 16.3 Technical Debt

1. **Commented-Out Code**
   - ThemeProvider temporarily disabled
   - TooltipProvider disabled due to useRef errors
   - CommandPalette conditionally rendered

2. **Compatibility Issues**
   - Radix UI forwardRef errors
   - Framer Motion conflicts
   - React Hook Form issues

3. **Database Schema Assumptions**
   - Some components assume specific tables
   - Business type variations (car rental vs property)

---

## 17. File Index

### 17.1 Critical Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main application entry point |
| `src/routes/index.ts` | Route registry (100+ routes) |
| `src/routes/types.ts` | Route type definitions |
| `src/components/layouts/BentoLayout.tsx` | Main layout |
| `src/components/router/RouteProvider.tsx` | Route context provider |
| `tailwind.config.ts` | Tailwind configuration |
| `vite.config.ts` | Vite build configuration |
| `capacitor.config.ts` | Capacitor mobile config |
| `src/index.css` | Global styles (1250+ lines) |
| `src/integrations/supabase/client.ts` | Supabase client |
| `src/integrations/supabase/types.ts` | Database types |
| `src/lib/errorBoundary.tsx` | Error boundary |

### 17.2 Domain Directories

| Domain | Component Count | Key Files |
|--------|----------------|-----------|
| customers | 20+ | CustomerDetailsPage, CustomerCRM |
| contracts | 30+ | ContractDetailsPage, ContractWizard |
| fleet | 25+ | VehicleDetailsPage, MaintenanceForm |
| finance | 40+ | InvoiceScanner, PaymentUpload |
| legal | 15+ | LegalCasesTracking, SmartDocumentGenerator |
| hr | 10+ | Employees, Attendance |
| mobile | 20+ | MobileApp, MobileContractWizard |
| admin | 15+ | SuperAdmin, Companies |
| dashboard | 20+ | BentoSidebar, DashboardWidgets |

---

## Conclusion

Fleetify is a well-architected, comprehensive ERP system with strong separation of concerns, mobile-first design, and extensive component coverage. The codebase demonstrates mature React patterns with proper TypeScript usage, performance optimizations, and accessibility considerations.

**Overall Assessment:** Production-ready enterprise application with room for documentation and testing improvements.

**Recommendation:** Focus on consolidating component versions, improving test coverage, and resolving temporarily disabled features (ThemeProvider, TooltipProvider).

---

**Report Generated:** 2025-01-10
**Total Files Analyzed:** 1000+
**Total Lines of Code:** Estimated 100,000+
