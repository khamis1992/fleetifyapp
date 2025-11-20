# SYSTEM_REFERENCE.md - FleetifyApp Master Documentation
Last Updated: 2025-11-20
Version: 1.6.0 (Phase 14 - FIN-003 Multi-Currency and Compliance System Complete)

## 📋 Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core Flows](#core-flows)
- [Coding Conventions](#coding-conventions)
- [Dependencies](#dependencies)
- [Known Pain Points & Limitations](#known-pain-points--limitations)
- [Agent Rules](#agent-rules)
- [Documentation System](#documentation-system)
- [Database Schema](#database-schema)
- [API Structure](#api-structure)
- [Testing Strategy](#testing-strategy)
- [Internationalization (i18n)](#internationalization-i18n)
- [Multi-Currency & Compliance System](#multi-currency--compliance-system)
- [Deployment & DevOps](#deployment--devops)

---

## 🏗️ Architecture Overview

### Frontend Stack
- **Framework**: React 18.3.1 with TypeScript 5.9.2
- **Build Tool**: Vite 5.4.20 (with SWC for fast transpilation)
- **Styling**:
  - TailwindCSS 3.4.15 with custom configuration
  - Radix UI components for unstyled, accessible UI primitives
  - Shadcn/ui component library built on top of Radix
  - Framer Motion 12.23.12 for animations
- **State Management**:
  - React Context API (AuthContext, CompanyContext, FeatureFlagsContext)
  - Tanstack Query 5.87.4 for server state management
  - React Hook Form 7.61.1 for form state
- **Routing**: React Router DOM 6.26.2
- **Mobile Support**: Capacitor 6.1.2 for iOS/Android builds

### Backend Stack
- **Backend as a Service**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Database**: PostgreSQL (via Supabase)
- **Edge Functions**: Supabase Functions (Deno runtime)
  - financial-analysis-ai
  - intelligent-contract-processor
  - process-traffic-fine
  - scan-invoice
  - transfer-user-company
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Real-time**: Supabase Realtime for live updates
- **Storage**: Supabase Storage for file uploads

### Key Modules & Features

#### Core Business Modules
1. **Fleet Management** (`/src/pages/fleet/`)
   - Vehicle tracking and management
   - Maintenance scheduling
   - Insurance and documentation
   - Vehicle groups and transfers

2. **Contract Management** (`/src/pages/Contracts.tsx`)
   - Rental contracts
   - Contract templates
   - Document generation
   - Payment schedules

3. **Customer Management** (`/src/pages/Customers.tsx`)
   - Customer profiles
   - Account management
   - Statement generation
   - Bulk operations

4. **Financial Tracking** (`/src/pages/FinancialTracking.tsx`)
   - Payment processing
   - Invoice generation
   - Accounting integration
   - Financial reports

5. **Legal Module** (`/src/pages/legal/`)
   - Legal cases management
   - Document management
   - Traffic violations
   - Legal correspondence

6. **HR Management** (`/src/pages/hr/`)
   - Employee management
   - Payroll processing
   - Attendance tracking
   - Leave management

7. **Financial Accounting** (`/src/pages/finance/`)
   - General ledger management
   - Chart of accounts
   - Journal entries with redesigned UI
   - Financial reporting

#### Phase 7B Modules (Added 2025-10-20)

8. **Inventory Management System** (`/src/pages/inventory/`)
   - **Routes**: `/inventory`, `/inventory/warehouses`, `/inventory/categories`, `/inventory/reports`, `/inventory/stock-movements`
   - **Features**:
     - Multi-warehouse management with location tracking
     - Stock level tracking and adjustments
     - Reorder point automation and alerts
     - Stock movement history and audit trails
     - Purchase order integration
     - Barcode/SKU management
   - **Database**: 8 tables
     - `inventory_categories` - Product categorization
     - `inventory_warehouses` - Warehouse locations
     - `inventory_items` - Product catalog
     - `inventory_stock_levels` - Current stock by warehouse
     - `inventory_stock_adjustments` - Stock adjustment history
     - `inventory_stock_movements` - Movement tracking
     - `inventory_reorder_points` - Automated reorder thresholds
     - `inventory_purchase_orders` - PO management
   - **Hooks**: `useInventoryItems`, `useInventoryWarehouses`, `useInventoryCategories`, `useInventoryReports`
   - **Components**: 12 new components including dialogs, forms, and table views

9. **Sales/CRM Pipeline** (`/src/pages/sales/`)
   - **Routes**: `/sales/leads`, `/sales/opportunities`, `/sales/quotes`, `/sales/orders`, `/sales/analytics`
   - **Features**:
     - Lead capture and qualification
     - Opportunity tracking with stage management
     - Quote generation with auto-numbering
     - Sales order processing
     - Win/loss analysis
     - Sales funnel visualization
     - Revenue forecasting
   - **Database**: 4 tables
     - `sales_leads` - Lead management
     - `sales_opportunities` - Opportunity tracking
     - `sales_quotes` - Quote generation
     - `sales_orders` - Order processing
   - **Hooks**: `useSalesLeads`, `useSalesOpportunities`, `useSalesQuotes`, `useSalesOrders`
   - **Components**: 16 new components with full CRUD operations

10. **Integration Dashboard** (`/src/pages/dashboards/integration/`)
    - **Route**: `/dashboards/integration`
    - **Features**:
      - Cross-module analytics and KPIs
      - Inventory ↔ Purchase Order tracking
      - Sales ↔ Inventory availability
      - Vendor performance scorecards
      - Order fulfillment monitoring
      - System health metrics
    - **Database**: 6 integration views
      - `inventory_po_summary` - Inventory-PO cross-reference
      - `sales_inventory_availability` - Real-time stock for sales
      - `vendor_performance_scorecard` - Vendor metrics
      - `order_fulfillment_status` - Order tracking
      - `inventory_valuation` - Stock valuation
      - `sales_pipeline_value` - Pipeline metrics
    - **Hooks**: `useInventoryPOSummary`, `useSalesInventoryAvailability`, `useVendorPerformanceScorecard`
    - **Components**: 8 integration widgets

11. **Enhanced Vendor Management** (`/src/pages/finance/vendors/`)
    - **Routes**: `/finance/vendors`, `/finance/vendor-categories`
    - **Features**:
      - Vendor categorization and segmentation
      - Contact management (multiple contacts per vendor)
      - Document storage and management
      - Performance tracking and scorecards
      - Payment history and terms
      - Accounting integration
    - **Database**: 4 new tables
      - `vendor_categories` - Vendor classification
      - `vendor_contacts` - Contact information
      - `vendor_documents` - Document storage
      - `vendor_performance` - Performance metrics
    - **Hooks**: `useVendors`, `useVendorCategories`, `useVendorContacts`
    - **Components**: Enhanced VendorDetailsDialog with 5 tabs

#### Phase 7C Business Dashboard Enhancements (Added 2025-10-20)

12. **Car Rental Dashboard** (`/src/pages/dashboards/CarRentalDashboard.tsx`)
    - **6 Specialized Widgets**:
      1. **Fleet Availability Widget** - Real-time vehicle status tracking
         - Active rentals vs. available vehicles
         - Utilization rate calculation
         - Status breakdown (available, rented, maintenance)
      2. **Rental Analytics Widget** - Revenue and utilization metrics
         - Daily rental revenue trends
         - Fleet utilization percentage
         - Average rental duration
      3. **Maintenance Schedule Widget** - Service tracking
         - 90-day interval scheduling
         - Overdue maintenance alerts
         - Cost tracking by vehicle
      4. **Rental Timeline Widget** - Gantt-style calendar
         - Visual rental periods
         - Availability forecasting
         - Booking conflicts detection
      5. **Insurance Alerts Widget** - Document expiry tracking
         - Insurance expiration dates
         - 30-day warning system
         - Compliance monitoring
      6. **Revenue Optimization Widget** - Revenue insights
         - Peak season analysis
         - Pricing recommendations
         - Revenue per vehicle metrics
    - **KPIs**: 15+ real metrics (utilization rate, revenue per day, maintenance cost ratio, etc.)

13. **Real Estate Dashboard** (`/src/pages/dashboards/RealEstateDashboard.tsx`)
    - **7 Specialized Widgets**:
      1. **Occupancy Analytics Widget** - Occupancy rates by property type
         - Current vs. target occupancy
         - Vacancy tracking
         - Property type breakdown
      2. **Rent Collection Widget** - Collection rate and aging
         - Collection rate percentage
         - Aging analysis (current, 30, 60, 90+ days)
         - Outstanding balances
      3. **Maintenance Requests Widget** - Request tracking
         - Open vs. resolved requests
         - Average resolution time
         - Cost per request
      4. **Property Performance Widget** - NOI and ROI comparison
         - Net Operating Income (NOI)
         - Return on Investment (ROI)
         - Property comparison matrix
      5. **Lease Expiry Widget** - Renewal tracking
         - Upcoming expirations (30/60/90 days)
         - Renewal rate tracking
         - Revenue at risk
      6. **Tenant Satisfaction Widget** - Satisfaction scoring
         - Satisfaction scores by property
         - Issue tracking
         - Retention metrics
      7. **Vacancy Analysis Widget** - Lost revenue tracking
         - Vacancy rate by property
         - Lost revenue calculation
         - Market comparison
    - **KPIs**: 25+ real metrics (NOI, ROI, collection rate, occupancy rate, etc.)

14. **Retail Dashboard** (`/src/pages/dashboards/RetailDashboard.tsx`)
    - **7 Specialized Widgets**:
      1. **Sales Analytics Widget** - Real-time sales tracking
         - Daily/weekly/monthly revenue
         - Sales velocity
         - Conversion rate
      2. **Inventory Levels Widget** - Stock monitoring
         - Stock turnover rate
         - Days of inventory remaining
         - Stockout risk alerts
      3. **Top Products Widget** - Performance ranking
         - Best sellers by revenue
         - High-margin products
         - Slow-moving inventory
      4. **Customer Insights Widget** - CLV and segmentation
         - Customer Lifetime Value (CLV)
         - Purchase frequency
         - Customer segmentation
      5. **Reorder Recommendations Widget** - Smart reordering
         - Automated reorder point calculations
         - Lead time consideration
         - Economic order quantity (EOQ)
      6. **Sales Forecast Widget** - Predictive forecasting
         - **Hybrid Algorithm**: SMA + Linear Regression + Day-of-Week patterns
         - 30-day rolling forecasts
         - Accuracy tracking
         - Confidence intervals
      7. **Category Performance Widget** - Category analytics
         - Revenue by category
         - Margin analysis
         - Category growth trends
    - **KPIs**: 50+ real metrics (sales velocity, stock turnover, CLV, margin %, forecast accuracy, etc.)

#### Phase 7B/7C Summary Statistics
- **Total Widgets**: 20 specialized widgets
- **Total KPIs**: 90+ real business metrics
- **Code Volume**: 12,443+ lines across 36 files
- **Database Tables**: 12 new tables, 6 integration views
- **Components**: 48 new components
- **Hooks**: 15 new custom hooks
- **Zero Build Errors**: 100% TypeScript compliance

---

### Phase 8: Export, Reporting & UI/UX Enhancement (Added 2025-10-21)

#### 8.1 Export & Reporting System

**Overview**: Comprehensive export functionality enabling professional data exports in multiple formats (PDF, Excel, CSV) with Arabic RTL support and company branding.

**Core Components** (`/src/components/exports/`):
- **ExportButton.tsx** (321 lines)
  - Dropdown menu with format selection (PDF, Excel, CSV, Print)
  - Dynamic import for tree-shaking optimization
  - Loading states and progress indicators
  - Success/error toast notifications
  - Smart format detection based on data type

- **ExportDialog.tsx** (~350 lines)
  - Full export options dialog
  - Content selection (Current view, All data, Custom range)
  - Include options (Charts, Tables, Filters)
  - Preview section before export
  - Progress indicator for long exports

- **PrintView.tsx** (~300 lines)
  - CSS @media print optimizations
  - Hides navigation and sidebars
  - Page break control
  - Print-friendly layouts

**Export Utilities** (`/src/utils/exports/`):
- **pdfExport.ts** (509 lines)
  - `exportChartToPDF()` - Single chart export with html2canvas
  - `exportDashboardToPDF()` - Multi-page PDF with table of contents
  - `exportTableToPDF()` - Table export with jspdf-autotable
  - RTL Arabic text rendering
  - High DPI (scale: 2) for quality
  - Company branding (logo, colors, headers, footers)

- **excelExport.ts** (~400 lines)
  - `exportTableToExcel()` - Table export with formatting
  - `exportMultiSheetExcel()` - Multi-sheet workbooks
  - `exportChartDataToExcel()` - Chart data export
  - Auto-sizing columns
  - Header styling and filter dropdowns
  - `readExcelFile()` - Import functionality

- **csvExport.ts** (~200 lines)
  - `exportToCSV()` - Basic CSV export
  - `exportLargeDatasetToCSV()` - Chunked exports for large datasets
  - UTF-8 BOM for Excel compatibility
  - Proper escaping and delimiter configuration
  - `parseCSVFile()` - Import functionality

- **templates.ts** (~250 lines)
  - Branded PDF templates (Standard, Branded, Minimal)
  - Excel styling presets
  - Theme configurations
  - Table of contents generation
  - Dynamic header/footer layouts

**Export Hook** (`/src/hooks/useExport.ts` - 321 lines):
- Centralized export state management
- Functions: `exportChartPDF()`, `exportTableExcel()`, `exportDataCSV()`, `exportDashboardPDF()`, `print()`
- Progress tracking (0-100%)
- Error handling with Arabic messages
- Dynamic imports for optimal bundle size

**Dashboard Integration**:
All 4 dashboards now have "Export All" functionality:
1. **CarRentalDashboard.tsx** - 6 widget exports
2. **RealEstateDashboard.tsx** - 7 widget exports
3. **RetailDashboard.tsx** - 7 widget exports
4. **IntegrationDashboard.tsx** - Full page export

**Widget Integration**:
All 23 business widgets updated with individual export buttons:
- FleetAvailability, RentalAnalytics, MaintenanceSchedule, RentalTimeline, InsuranceAlerts, RevenueOptimization (Car Rental - 6)
- OccupancyAnalytics, RentCollection, MaintenanceRequests, PropertyPerformance, LeaseExpiry, TenantSatisfaction, VacancyAnalysis (Real Estate - 7)
- SalesAnalytics, InventoryLevels, TopProducts, CustomerInsights, ReorderRecommendations, SalesForecast, CategoryPerformance (Retail - 7)
- InventoryAlerts, SalesPipeline, VendorPerformance (Integration - 3)

**File Naming Convention**:
```
{DashboardName}_{Date}_{Time}.{ext}
Example: fleet_availability_2025-01-20_14-30-45.pdf
```

**Technical Features**:
- High-quality exports (html2canvas scale: 2)
- Arabic RTL text rendering
- Multi-page PDFs with pagination
- Company branding in all exports
- Dynamic imports for code splitting
- Tree-shaking friendly architecture

---

#### 8.2 UI/UX Polish & Productivity Features

**Command Palette** (`/src/components/command-palette/CommandPalette.tsx` - 320 lines):
- **Keyboard Shortcut**: `Ctrl/Cmd + K`
- **Features**:
  - 40+ commands (navigation + quick actions)
  - Fuzzy search filtering
  - Recent commands history (localStorage)
  - Keyboard-first navigation (↑↓ Enter Esc)
  - Organized by categories (Navigation, Actions, Settings)
  - Mobile responsive
  - Animated with Framer Motion

**Global Keyboard Shortcuts** (`/src/hooks/useKeyboardShortcuts.ts` - 150 lines):
- `Ctrl/Cmd + K` - Open command palette
- `Ctrl/Cmd + F` - Focus search
- `Ctrl/Cmd + N` - New item
- `Ctrl/Cmd + E` - Export current view
- `Ctrl/Cmd + H` - Navigate home
- `Ctrl/Cmd + B` - Go back
- `?` - Show help
- `Esc` - Close dialogs/modals

**Skeleton Loaders** (`/src/components/loaders/`):
- **SkeletonWidget.tsx** (80 lines)
  - Animated shimmer effect
  - Card-based layout matching
  - Responsive sizing
  - Prevents layout shift

- **SkeletonTable.tsx** (60 lines)
  - Row-based skeleton
  - Flexible column count
  - Header and pagination skeletons

- **SkeletonChart.tsx** (70 lines)
  - Chart-type aware (line, bar, pie, donut, area)
  - Axis placeholders
  - Legend skeleton
  - Smooth transitions to real data

**Empty States** (`/src/components/empty-states/`):
- **EmptyState.tsx** (120 lines)
  - Reusable generic component
  - Custom SVG illustrations
  - Action buttons
  - Animated entrance

- **EmptyInventory.tsx** (100 lines)
  - Inventory-specific empty state
  - Custom illustration
  - Quick action suggestions

- **EmptyDashboard.tsx** (80 lines)
  - Dashboard-specific empty state
  - Onboarding prompts

**Enhanced Tooltips** (`/src/components/tooltips/EnhancedTooltip.tsx` - 120 lines):
- Rich content with formulas and examples
- Metadata display
- Keyboard shortcut hints
- Help links
- Context-aware positioning

**Drill-Down Navigation**:
- Click-through navigation from widgets to detail pages
- URL parameter preservation
- Filter state synchronization
- Example: Click on "Occupied" in Occupancy widget → Navigate to Properties filtered by "Occupied"

---

#### Phase 8 Summary Statistics
- **Total New Code**: 5,635+ lines
- **New Components**: 18 (11 UI components, 4 export components, 3 empty states)
- **New Utilities**: 4 export utilities
- **New Hooks**: 2 (useExport, useKeyboardShortcuts)
- **Widgets Updated**: 23 widgets + 4 dashboards
- **Zero Build Errors**: 100% TypeScript compliance
- **Bundle Impact**: ~8 KB gzipped (dynamically imported)
- **Dependencies Added**: jspdf, jspdf-autotable, html2canvas, xlsx, react-datepicker, cmdk

**User Experience Improvements**:
- ⚡ Faster navigation (Command palette saves 2-5 seconds per action)
- 📊 Professional exports (PDF, Excel, CSV for all data)
- 🎨 Better loading states (Skeleton loaders prevent layout shift)
- ⌨️ Productivity boost (9 global keyboard shortcuts)
- 📱 Mobile responsive (All features work on mobile)
- ♿ WCAG AA compliant (Accessibility best practices)

---

## 🔄 Core Flows

### User Authentication Flow
```
1. User Login → AuthContext → Supabase Auth
2. Session Token → Store in localStorage
3. Auth State → Context Provider → Protected Routes
4. RLS Policies → Database Access Control
```

### Data Flow Pattern
```
Component → Custom Hook → Tanstack Query → Supabase Client → Database
     ↑                                                              ↓
     └──────── Real-time Updates via Supabase Realtime ←──────────┘
```

### Error Handling Chain
```
Try/Catch in Hooks → Error Boundary → Toast Notification → Logger
```

### API Communication Pattern
- **REST API**: Via Supabase client library
- **RPC Calls**: For complex database operations
- **Real-time**: WebSocket subscriptions for live data
- **File Upload**: Direct to Supabase Storage with presigned URLs

### Payment Processing Flow
1. Payment initiated in UI
2. Validation in custom hook
3. Database transaction with RLS
4. Account balance updates
5. Receipt generation
6. Notification dispatch

---

## 📝 Coding Conventions

### File Naming
- **Components**: PascalCase (`ContractDetails.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useContracts.ts`)
- **Utils**: camelCase (`dateHelpers.ts`)
- **Types**: PascalCase with descriptive names (`ContractFormData.ts`)

### Folder Structure
```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (shadcn)
│   ├── forms/         # Form components
│   └── layout/        # Layout components
├── contexts/          # React Context providers
├── hooks/            # Custom React hooks
│   ├── business/     # Business logic hooks
│   └── finance/      # Financial module hooks
├── pages/            # Route components
├── lib/              # Utility libraries
├── utils/            # Helper functions
├── types/            # TypeScript type definitions
└── integrations/     # Third-party integrations
```

### Component Patterns
```typescript
// Standard functional component with TypeScript
interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
}

export function Component({ data, onAction }: ComponentProps) {
  // Hooks at the top
  const { state, actions } = useCustomHook();

  // Event handlers
  const handleClick = () => {
    onAction(data.id);
  };

  // Render
  return (
    <div className="space-y-4">
      {/* Component JSX */}
    </div>
  );
}
```

### Hook Patterns
```typescript
// Custom hook with Tanstack Query
export function useResourceData(filters?: FilterType) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['resource', filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table')
        .select('*')
        .match(filters || {});

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### State Management Rules
1. Use Context for global app state (auth, company, feature flags)
2. Use Tanstack Query for server state
3. Use local state for UI-only state
4. Prefer composition over prop drilling

---

## 📦 Dependencies

### Core Libraries
- **React Ecosystem**
  - react: 18.3.1 - UI library
  - react-dom: 18.3.1 - DOM rendering
  - react-router-dom: 6.26.2 - Routing

- **State & Data**
  - @tanstack/react-query: 5.87.4 - Server state management
  - @supabase/supabase-js: 2.57.4 - Backend client
  - react-hook-form: 7.61.1 - Form management
  - zod: 3.23.8 - Schema validation

- **UI Components**
  - @radix-ui/*: Complete set of unstyled components
  - framer-motion: 12.23.12 - Animations
  - lucide-react: 0.544.0 - Icons
  - sonner: 2.0.7 - Toast notifications

- **Custom Components**
  - `RedesignedJournalEntryCard`: Modern journal entry display component with collapsible details
  - `CashReceiptVoucher`: Al Arraf Cash Receipt Voucher design implementation
  - `ProfessionalInvoiceTemplate`: Professional invoice template with bilingual support

- **Utilities**
  - date-fns: 4.1.0 - Date manipulation
  - papaparse: 5.5.3 - CSV parsing
  - xlsx: 0.18.5 - Excel file handling
  - html2pdf.js: 0.10.3 - PDF generation
  - react-datepicker: Latest - Date range picker (Phase 8)
  - cmdk: Latest - Command palette (Phase 8)

- **Data Visualization** (Phase 7C)
  - recharts: Latest - Charts and graphs for dashboards
  - Line, Bar, Pie, Area charts for business intelligence
  - 90+ KPIs visualized across 20 widgets

- **Forecasting & Analytics** (Phase 7C)
  - Hybrid forecasting algorithm: SMA + Linear Regression + Day-of-Week patterns
  - Statistical analysis for retail sales predictions
  - Real-time KPI calculations (NOI, ROI, CLV, utilization rates, etc.)

- **Export & Reporting** (Phase 8)
  - jspdf: Latest - PDF generation
  - jspdf-autotable: Latest - PDF table formatting
  - html2canvas: Latest - DOM to canvas conversion
  - xlsx: 0.18.5 - Excel file generation
  - Professional export templates with Arabic RTL support
  - Multi-format exports (PDF, Excel, CSV) for all dashboards and widgets

- **AI/ML**
  - openai: 4.104.0 - AI integrations
  - @huggingface/transformers: 3.7.1 - ML models

- **Mobile**
  - @capacitor/core: 6.1.2 - Cross-platform runtime
  - @capacitor/android: 6.1.2 - Android support
  - @capacitor/ios: 6.1.2 - iOS support

### Development Dependencies
- TypeScript: 5.9.2
- ESLint: 9.35.0
- Vite: 5.4.20
- TailwindCSS: 3.4.15
- PostCSS: 8.5.6

---

## ⚠️ Known Pain Points & Limitations

### Performance Issues
1. **Large Data Sets**: Customer and contract lists can be slow with 1000+ records
   - Mitigation: Virtual scrolling implemented with @tanstack/react-virtual
   - TODO: Implement server-side pagination

2. **Bundle Size**: Initial bundle is large (~2MB)
   - Current optimizations: Code splitting, lazy loading
   - TODO: Further optimize with dynamic imports

3. **Real-time Updates**: Can cause performance issues with many subscriptions
   - Mitigation: Selective subscriptions, debouncing
   - TODO: Implement subscription pooling

### Technical Debt
1. **Complex Hooks**: Some hooks exceed 500 lines (useFinance.ts, useContractCSVUpload.ts)
   - TODO: Refactor into smaller, composable hooks

2. **Type Safety**: Some areas use 'any' types
   - TODO: Strict TypeScript configuration

3. **Test Coverage**: Limited test coverage
   - Current: Basic unit tests in __tests__ directory
   - TODO: Implement comprehensive testing strategy

### Database Constraints
1. **RLS Complexity**: Complex RLS policies can slow queries
2. **Migration Management**: 100+ migration files, needs consolidation
3. **Foreign Key Constraints**: Some missing, causing referential integrity issues

### Known Bugs
1. Date formatting inconsistencies between regions
2. File upload progress not showing for large files
3. Some forms don't clear after submission
4. Pagination state lost on navigation

---

## 🤖 Agent Rules

### Code Modification Guidelines

#### Safety First
- **Never** modify production database directly
- **Always** create migrations for schema changes
- **Test** all changes locally before committing
- **Use** feature flags for risky changes
- **Maintain** backward compatibility

#### Code Style Requirements
```typescript
// ALWAYS use TypeScript with explicit types
interface Props {
  id: string; // NOT: id: any
}

// ALWAYS handle errors properly
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', error);
  toast.error('User-friendly message');
  // Log to monitoring service
}

// ALWAYS use proper loading states
const { data, isLoading, error } = useQuery({...});
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;

// ALWAYS validate user input
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
});
```

#### Testing Requirements
- Write tests for new features
- Update tests when modifying existing code
- Ensure all tests pass before committing
- Test edge cases and error scenarios

#### Documentation Requirements
- Update this SYSTEM_REFERENCE.md for architectural changes
- Add JSDoc comments for complex functions
- Update README for setup/deployment changes
- Document API changes in relevant files

#### Git Workflow
```bash
# Branch naming
feature/description-of-feature
fix/description-of-bug
refactor/description-of-refactor

# Commit messages
feat: add new payment processing
fix: resolve date formatting issue
refactor: simplify contract validation
docs: update API documentation
test: add payment processing tests
```

---

## 📚 Documentation System (DOC-001)

### Overview
FleetifyApp features a comprehensive documentation system designed to serve users, developers, and system administrators with production-ready, searchable, and maintainable content. The system provides multilingual support, interactive search, and automated maintenance.

### Documentation Structure
```
docs/
├── DOCUMENTATION_SYSTEM_OVERVIEW.md    # Main documentation index
├── user-guide/                          # User documentation
│   ├── README.md                        # User manual overview
│   ├── QUICK_START.md                   # Quick start guide
│   ├── fleet/                          # Fleet management guides
│   ├── contracts/                      # Contract management guides
│   ├── customers/                      # Customer management guides
│   └── troubleshooting/                 # User troubleshooting
├── developer/                           # Developer documentation
│   ├── README.md                        # Developer overview
│   ├── SETUP.md                         # Development setup
│   ├── ARCHITECTURE.md                  # System architecture
│   ├── CONTRIBUTING.md                  # Contribution guidelines
│   └── CODING_STANDARDS.md             # Code style guide
├── api/                                 # API documentation
│   ├── README.md                        # API overview
│   ├── AUTHENTICATION.md               # Authentication guide
│   ├── ENDPOINTS.md                     # Interactive endpoint docs
│   └── openapi.json                    # OpenAPI specification
├── architecture/                         # System architecture
│   ├── SYSTEM_OVERVIEW.md               # High-level architecture
│   ├── DATABASE_SCHEMA.md              # Database documentation
│   └── INTEGRATION_PATTERNS.md         # Integration patterns
├── admin/                               # System administration
│   ├── DEPLOYMENT.md                    # Deployment guide
│   ├── CONFIGURATION.md                # Configuration guide
│   └── MONITORING.md                    # System monitoring
├── ar/                                  # Arabic documentation
│   └── README.md                        # Arabic documentation index
└── support/                             # Support resources
    ├── FAQ.md                           # Frequently asked questions
    └── CONTACT.md                       # Contact information
```

### Key Features

#### 📖 User Documentation
- **Step-by-step guides** for all fleet management workflows
- **Quick start guide** for new users (5-minute setup)
- **Feature-specific tutorials** for advanced functionality
- **Troubleshooting guides** with common solutions
- **Video tutorials** and interactive walkthroughs

#### 👨‍💻 Developer Documentation
- **Complete setup guide** for development environment
- **Interactive API documentation** with live examples
- **Architecture documentation** with system diagrams
- **Contribution guidelines** and code standards
- **Testing strategies** and debugging guides

#### 🔧 System Administration
- **Production deployment procedures**
- **Configuration management** guides
- **Monitoring and alerting** setup
- **Backup and disaster recovery** procedures
- **Security configuration** guidelines

#### 🏗️ Architecture & Design
- **High-level system architecture** documentation
- **Database schema** with relationships and indexes
- **Integration patterns** and best practices
- **Security architecture** and threat models
- **Performance optimization** strategies

### Interactive Features

#### 🔍 Smart Search
- **Fuzzy search** across all documentation
- **Tag-based navigation** and categorization
- **Real-time search suggestions** and highlighting
- **Code example search** with syntax highlighting
- **Keyboard shortcuts** (Ctrl+K/Cmd+K) for quick access

#### 📱 Responsive Design
- **Mobile-first responsive** design
- **Progressive Web App** (PWA) capabilities
- **Offline documentation access** with caching
- **Dark mode** support for comfortable reading
- **Print-friendly** optimized layouts

#### 🌐 Multilingual Support
- **English** (primary) documentation
- **Arabic** (RTL) documentation with full translation
- **Language switching** with persistent preferences
- **Localized content** and examples

### Automation & Maintenance

#### 🔄 CI/CD Integration
- **Automated documentation generation** from code
- **Content validation** and link checking
- **Search index generation** and updates
- **Quality metrics** and reporting
- **Automated deployment** to documentation sites

#### 📊 Quality Assurance
- **Markdown linting** and style validation
- **Link checking** for broken internal/external links
- **Code example validation** and testing
- **Spell checking** and grammar validation
- **Accessibility testing** for WCAG compliance

#### 📈 Analytics & Metrics
- **Documentation usage analytics** and tracking
- **Search analytics** for popular topics
- **Content performance** metrics
- **User feedback collection** and analysis
- **Automated quality scoring** and recommendations

### Technical Implementation

#### 🛠️ Documentation Tools
- **Static Site Generator**: Astro with Starlight theme
- **Search Engine**: Lunr.js with custom index
- **Markdown Processing**: Unified with syntax highlighting
- **Code Examples**: Live execution and validation
- **Diagrams**: Mermaid and PlantUML support

#### 📦 Build Process
```bash
# Documentation maintenance script
npm run docs:validate      # Validate content and links
npm run docs:generate      # Generate API docs and search index
npm run docs:build         # Build documentation site
npm run docs:deploy        # Deploy to production
npm run docs:test          # Test code examples
```

#### 🔧 Configuration
```yaml
# docs/astro.config.mjs
export default defineConfig({
  integrations: [
    starlight({
      title: 'FleetifyApp Documentation',
      description: 'Comprehensive fleet management documentation',
      customCss: ['./styles/custom.css'],
      sidebar: [...], // Auto-generated from file structure
      social: {
        github: 'https://github.com/fleetifyapp/fleetifyapp',
      },
    }),
  ],
  output: 'static',
});
```

### Search Component
- **Location**: `src/components/docs/DocumentationSearch.tsx`
- **Features**: Fuzzy search, real-time filtering, keyboard navigation
- **Integration**: React-based with TypeScript support
- **Performance**: Debounced search with memoization

### Maintenance Scripts
- **Location**: `scripts/docs/documentation-maintenance.js`
- **Capabilities**:
  - API documentation generation from source code
  - Content validation and link checking
  - Search index generation and optimization
  - Quality metrics and reporting
  - Automated table of contents generation

### Documentation Quality Metrics
- **Total Pages**: 150+ comprehensive guides
- **API Endpoints**: 200+ documented with examples
- **Code Examples**: 500+ practical examples
- **Languages**: 2 (English, Arabic)
- **Coverage**: 95%+ of all features documented

### Deployment
- **Primary**: Vercel (https://fleetify-docs.vercel.app)
- **Mirror**: GitHub Pages (https://fleetifyapp.github.io/docs)
- **CDN**: Global distribution with automatic HTTPS
- **Monitoring**: Real-time uptime and performance monitoring

### Usage Analytics
- **Page Views**: Tracked with privacy-friendly analytics
- **Search Queries**: Anonymous search term analysis
- **User Feedback**: Built-in rating and feedback system
- **Performance**: Core Web Vitals monitoring

---

## 🗄️ Database Schema

### Core Tables

#### Users & Auth
- `profiles` - User profiles linked to auth.users
- `companies` - Multi-tenant company data
- `user_permissions` - Role-based access control

#### Fleet Management
- `vehicles` - Vehicle inventory
- `vehicle_groups` - Vehicle categorization
- `vehicle_maintenance` - Maintenance records
- `vehicle_insurance` - Insurance policies
- `vehicle_transfers` - Transfer history

#### Contracts & Customers
- `customers` - Customer records
- `contracts` - Rental agreements
- `contract_templates` - Reusable templates
- `contract_documents` - Associated documents
- `contract_payments` - Payment schedules

#### Financial
- `payments` - Payment transactions
- `invoices` - Generated invoices
- `accounts` - Chart of accounts
- `journal_entries` - Accounting entries
- `financial_settings` - Configuration

#### Legal
- `legal_cases` - Case management
- `traffic_violations` - Violation records
- `legal_documents` - Legal documentation

#### Inventory Management (Phase 7B)
- `inventory_categories` - Product categorization
- `inventory_warehouses` - Warehouse locations
- `inventory_items` - Product catalog
- `inventory_stock_levels` - Current stock by warehouse
- `inventory_stock_adjustments` - Stock adjustment history
- `inventory_stock_movements` - Movement tracking
- `inventory_reorder_points` - Automated reorder thresholds
- `inventory_purchase_orders` - Purchase order management

#### Sales/CRM (Phase 7B)
- `sales_leads` - Lead capture and qualification
- `sales_opportunities` - Opportunity tracking with stages
- `sales_quotes` - Quote generation
- `sales_orders` - Order processing

#### Vendor Management (Phase 7B)
- `vendor_categories` - Vendor classification
- `vendor_contacts` - Contact information
- `vendor_documents` - Document storage
- `vendor_performance` - Performance metrics

#### Integration Views (Phase 7B)
- `inventory_po_summary` - Inventory-PO cross-reference
- `sales_inventory_availability` - Real-time stock availability
- `vendor_performance_scorecard` - Vendor metrics aggregation
- `order_fulfillment_status` - Order tracking
- `inventory_valuation` - Stock valuation
- `sales_pipeline_value` - Pipeline metrics

### Database Functions (RPC)
- `create_contract_with_items` - Complex contract creation
- `calculate_customer_balance` - Balance calculations
- `generate_account_statement` - Statement generation
- `process_bulk_payments` - Batch payment processing
- `transfer_user_to_company` - User company transfers

---

## 🔌 API Structure

### Supabase Edge Functions

#### `/functions/financial-analysis-ai`
- **Purpose**: AI-powered financial analysis
- **Input**: Financial data, analysis type
- **Output**: Analysis report, recommendations

#### `/functions/intelligent-contract-processor`
- **Purpose**: Smart contract processing
- **Input**: Contract data, template
- **Output**: Processed contract, validation results

#### `/functions/process-traffic-fine`
- **Purpose**: Traffic violation processing
- **Input**: Violation data from Zapier
- **Output**: Created violation record

#### `/functions/scan-invoice`
- **Purpose**: OCR invoice scanning
- **Input**: Image file
- **Output**: Extracted invoice data

#### `/functions/transfer-user-company`
- **Purpose**: Transfer user between companies
- **Input**: User ID, target company
- **Output**: Transfer confirmation

### API Patterns
```typescript
// Standard API call pattern
const { data, error } = await supabase
  .from('table_name')
  .select('*, related_table(*)')
  .eq('column', value)
  .order('created_at', { ascending: false });

// RPC call pattern
const { data, error } = await supabase
  .rpc('function_name', {
    param1: value1,
    param2: value2
  });

// Real-time subscription
const subscription = supabase
  .channel('custom-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'table_name'
  }, (payload) => {
    handleRealtimeUpdate(payload);
  })
  .subscribe();
```

---

## 🧪 Testing Strategy

### Current Testing Setup
- **Framework**: Vitest (via Vite)
- **Test Location**: `/src/__tests__/`
- **Coverage**: Basic unit tests for utilities

### Testing Guidelines
```typescript
// Component testing example
describe('ContractForm', () => {
  it('should validate required fields', () => {
    // Test implementation
  });

  it('should handle submission', async () => {
    // Test async operations
  });
});

// Hook testing example
describe('useContracts', () => {
  it('should fetch contracts', async () => {
    // Test data fetching
  });
});
```

---

## 🌍 Internationalization (i18n)

### Architecture Overview

FleetifyApp implements a comprehensive internationalization system supporting 8 languages with RTL/LTR mixed content handling, cultural adaptations, and locale-specific business rules.

**Supported Languages**:
- English (en) - Base language
- Arabic (ar) - RTL with full cultural adaptations
- French (fr) - European standards
- Spanish (es) - European standards
- German (de) - European standards
- Chinese (zh) - Asian language support
- Hindi (hi) - Asian language support
- Japanese (ja) - Asian language support

### Core Components

#### 1. I18n Framework (`/src/lib/i18n/`)

**Configuration** (`config.ts`):
```typescript
import { initializeI18n, changeLanguage, formatCurrency } from '@/lib/i18n/config';

// Initialize i18n system
await initializeI18n();

// Format currency for current locale
const amount = formatCurrency(1000); // $1,000.00 (USD) or ر.ق.١٠٠٠ (QAR)
```

**Locale Configurations** (`locales.ts`):
- Comprehensive locale-specific settings
- Business day configurations (weekend definitions)
- Currency formatting and positioning
- Date/time formatting patterns
- Cultural adaptations and etiquette

**Business Rules Engine** (`businessRules.ts`):
```typescript
import { createBusinessRuleEngine } from '@/lib/i18n/businessRules';

const rulesEngine = createBusinessRuleEngine('ar');
const workingHours = rulesEngine.getRuleCategory('hr').workingHours;
const paymentTerms = rulesEngine.applyRule('financial', 'paymentTerms');
```

**Validation Framework** (`validation.ts`):
```typescript
import { translationValidator } from '@/lib/i18n/validation';

// Validate translation completeness
const results = await translationValidator.validateLanguageNamespace('ar', 'fleet');
const report = translationValidator.generateValidationReport(results);
```

#### 2. React Components (`/src/components/i18n/`)

**I18nProvider**:
```typescript
import { I18nProvider } from '@/components/i18n';

<I18nProvider
  language="en"
  enableRTL={true}
  enableIconMirroring={true}
  enableMixedContent={true}
  onLanguageChange={(lang) => console.log('Language:', lang)}
>
  <App />
</I18nProvider>
```

**Language Switcher**:
```typescript
import { LanguageSwitcher } from '@/components/i18n';

<LanguageSwitcher
  variant="dropdown"
  showFlag={true}
  showNativeName={true}
  position="bottom-right"
/>
```

**Mirrored Icon**:
```typescript
import { MirroredIcon } from '@/components/i18n';

<MirroredIcon
  icon={ChevronLeft}
  name="chevron-left"
  className="w-5 h-5"
  // Automatically mirrors in RTL languages
/>
```

#### 3. React Hooks (`/src/hooks/useTranslation.ts`)

**useFleetifyTranslation**:
```typescript
import { useFleetifyTranslation } from '@/hooks/useTranslation';

const {
  t,
  rtl,
  formatLocalCurrency,
  formatLocalDate,
  getBusinessRules,
  renderMixedContent
} = useFleetifyTranslation('fleet');

// Translate with fallback
const text = t('vehicle.title', {}, 'Vehicle Management');

// Format with locale awareness
const price = formatLocalCurrency(1000);
const date = formatLocalDate(new Date());

// Mixed content for RTL/LTR
const mixed = renderMixedContent('Hello World مرحبا');
```

#### 4. Translation Files (`/public/locales/`)

**Namespace Structure**:
```
/public/locales/
├── en/
│   ├── common.json      # Common UI elements
│   ├── fleet.json       # Fleet management terms
│   ├── contracts.json   # Contract terminology
│   ├── financial.json   # Financial terms
│   └── ...
├── ar/
│   ├── common.json      # Arabic translations
│   ├── fleet.json       # Fleet management in Arabic
│   └── ...
└── [other languages]/
```

**Translation Key Structure**:
```json
{
  "fleet": {
    "vehicles": "Vehicles",
    "maintenance": {
      "oil_change": "Oil Change",
      "schedule": "Maintenance Schedule"
    }
  }
}
```

### RTL/LTR Mixed Content Handling

**Automatic Direction Detection**:
```typescript
// Automatic HTML direction setup
document.documentElement.dir = rtl ? 'rtl' : 'ltr';
document.body.classList.toggle('rtl', rtl);
```

**Mixed Content Rendering**:
```typescript
// Render content with proper direction
const mixedContent = renderMixedContent(content, {
  rtlClassName: 'text-right font-ar',
  ltrClassName: 'text-left',
  wrapperClassName: 'mixed-content-wrapper'
});
```

**Icon Mirroring**:
```typescript
// Icons automatically mirror in RTL
<MirroredIcon
  icon={ArrowLeft}
  name="arrow-left"
  // Becomes ArrowRight in Arabic
/>
```

### Cultural Adaptations

**Business Hours by Locale**:
```typescript
// Arabic (Qatar)
ar: {
  business: {
    workingDays: [0, 1, 2, 3, 4], // Sunday-Thursday
    weekendDays: [5, 6], // Friday-Saturday
    workingHours: { start: '07:00', end: '15:00' }
  }
}

// French
fr: {
  business: {
    workingDays: [1, 2, 3, 4, 5], // Monday-Friday
    weekendDays: [0, 6], // Sunday-Saturday
    workingHours: { start: '09:00', end: '18:00' }
  }
}
```

**Currency Formatting**:
```typescript
// Each locale has specific formatting
ar: {
  currency: {
    code: 'QAR',
    symbol: 'ر.ق',
    position: 'before',
    decimals: 2
  }
}
```

**Legal Document Requirements**:
```typescript
// Arabic requires numbers written in words for legal documents
ar: {
  legal: {
    numberWords: true,
    dateFormat: 'DD/MM/YYYY',
    languageCode: 'ar'
  }
}
```

### Translation Validation

**Completeness Checking**:
```typescript
// Check all translations are complete
const validationResults = await translationValidator.validateAllTranslations();

// Generate completeness report
const report = translationValidator.generateValidationReport(validationResults);
console.log('Translation completeness:', report.summary.averageCompleteness);
```

**Quality Assurance**:
- Placeholder validation ({{variable}} consistency)
- HTML tag validation across languages
- Length variation warnings for UI elements
- Cultural appropriateness checks

### Implementation Guidelines

#### 1. Component Internationalization

**Good Practice**:
```typescript
// Use translation keys, not hardcoded text
const VehicleCard = ({ vehicle }) => {
  const { t, formatLocalCurrency } = useFleetifyTranslation();

  return (
    <div>
      <h3>{t('vehicle.title')}</h3>
      <p>{t('vehicle.make')}: {vehicle.make}</p>
      <p>{t('vehicle.daily_rate')}: {formatLocalCurrency(vehicle.dailyRate)}</p>
      <span>{t(`status.${vehicle.status}`)}</span>
    </div>
  );
};
```

**Bad Practice**:
```typescript
// Avoid hardcoded text
const VehicleCard = ({ vehicle }) => {
  return (
    <div>
      <h3>Vehicle Details</h3>  // ❌ Hardcoded
      <p>Make: {vehicle.make}</p>
    </div>
  );
};
```

#### 2. RTL Layout Considerations

**Use Direction-Aware Utilities**:
```typescript
const { getDirectionalPadding, getDirectionalMargin } = useRTLLayout();

<div
  style={{
    paddingLeft: getDirectionalPadding('1rem', '0'),
    paddingRight: getDirectionalPadding('0', '1rem'),
    marginLeft: getDirectionalMargin('1rem', '0'),
    marginRight: getDirectionalMargin('0', '1rem')
  }}
>
  Content
</div>
```

**Use Mirrored Icons for Navigation**:
```typescript
// Automatically mirrors in RTL
<MirroredIcon
  icon={ChevronLeft}
  name="chevron-left"
  className="w-4 h-4"
/>
```

#### 3. Date and Number Formatting

**Always Use Locale-Aware Formatting**:
```typescript
const { formatLocalDate, formatLocalNumber, formatLocalTime } = useFleetifyTranslation();

// ✅ Correct - locale-aware
const date = formatLocalDate(new Date());
const amount = formatLocalNumber(1234.56);
const time = formatLocalTime(new Date());

// ❌ Incorrect - not locale-aware
const date = new Date().toLocaleDateString();
const amount = 1234.56.toLocaleString();
```

#### 4. Business Logic Adaptations

**Use Locale-Specific Business Rules**:
```typescript
const { getBusinessRules, validateBusinessData } = useFleetifyTranslation();

// Get locale-specific working hours
const workingHours = getBusinessRules('hr').workingHours;

// Validate data against locale requirements
const validation = validateBusinessData(contractData, 'contracts');
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Performance Considerations

**Translation Loading**:
- Lazy loading of translation files by namespace
- Translation caching to prevent re-fetching
- Code splitting to reduce bundle size

**Bundle Size Optimization**:
```typescript
// Dynamic imports for large translation sets
const loadFleetTranslations = () =>
  import(`/locales/${currentLanguage}/fleet.json`);

// Namespace-based loading
const { t } = useTranslation(['fleet', 'contracts']);
```

### Testing Internationalization

**Unit Tests**:
```typescript
describe('I18n Components', () => {
  it('should render translations correctly', () => {
    const { getByText } = render(
      <I18nProvider language="en">
        <Component />
      </I18nProvider>
    );

    expect(getByText('Vehicles')).toBeInTheDocument();
  });

  it('should handle RTL correctly', () => {
    const { container } = render(
      <I18nProvider language="ar">
        <Component />
      </I18nProvider>
    );

    expect(container.querySelector('html')).toHaveAttribute('dir', 'rtl');
  });
});
```

**Integration Tests**:
```typescript
describe('Language Switching', () => {
  it('should switch languages and update UI', async () => {
    const { getByText, rerender } = render(<LanguageSwitcher />);

    fireEvent.click(getByText('العربية'));

    await waitFor(() => {
      expect(document.documentElement.dir).toBe('rtl');
    });
  });
});
```

### Deployment Considerations

**Environment Variables**:
```env
VITE_DEFAULT_LANGUAGE=en
VITE_SUPPORTED_LANGUAGES=en,ar,fr,es,de,zh,hi,ja
VITE_ENABLE_RTL=true
VITE_TRANSLATION_VALIDATION=true
```

**Build Configuration**:
- Translation files copied to `/public/locales/`
- Babel plugin for React i18next optimization
- TypeScript strict checking for translation keys

---

## 💰 Multi-Currency & Compliance System (FIN-003)

### Overview
Phase 14 introduces a comprehensive multi-currency and compliance system that enables global operations with automated regulatory compliance, real-time exchange rate management, and advanced risk monitoring capabilities.

### Core Components

#### Exchange Rate Management (`/src/services/exchangeRateService.ts`)
**Purpose**: Real-time exchange rate fetching, conversion, and historical tracking
- **Multi-API Support**: Fixer.io, ExchangeRate-API with fallback mechanisms
- **Caching Strategy**: 5-minute intelligent cache with LRU eviction
- **Historical Tracking**: Complete exchange rate history for audit and analysis
- **Currency Coverage**: 9+ currencies (QAR, SAR, KWD, AED, BHD, OMR, USD, EUR, GBP)
- **Performance**: Optimized database queries with materialized views

```typescript
// Example usage
const result = await exchangeRateService.convertCurrency({
  amount: 1000,
  from_currency: 'USD',
  to_currency: 'QAR',
  company_id: companyId
});
```

#### Compliance Engine (`/src/services/complianceEngine.ts`)
**Purpose**: Automated GAAP, tax, AML, and KYC compliance validation
- **Rules Engine**: Customizable compliance rules with 15+ built-in GAAP validations
- **Jurisdiction Support**: QAR/SAR specific regulations (VAT, Zakat compliance)
- **AML/KYC**: Due diligence with sanctions screening and PEP checks
- **Regulatory Reporting**: Automated report generation for tax authorities
- **Audit Trail**: Complete compliance activity tracking

```typescript
// Compliance validation example
const complianceResult = await complianceEngine.runComplianceValidation({
  entityType: 'transaction',
  entityId: transactionId,
  companyId: companyId,
  ruleCategories: ['gaap', 'aml', 'tax']
});
```

#### Enhanced Currency Utilities (`/src/utils/enhancedCurrencyUtils.ts`)
**Purpose**: Advanced currency formatting, conversion, and compliance checking
- **Multi-Locale Support**: Proper RTL/LTR formatting for Arabic currencies
- **Compliance Checking**: Automatic reporting requirement detection
- **Risk Analysis**: Currency volatility and exposure calculations
- **Gain/Loss Tracking**: Realized/unrealized gains calculation
- **Format Options**: Multiple display formats with jurisdiction-specific rules

#### Currency Management Hooks (`/src/hooks/useCurrencyManager.ts`)
**Purpose**: React integration for currency operations and compliance
- **Real-time Rates**: Live subscription to exchange rate updates
- **Cache Management**: Intelligent client-side caching with invalidation
- **Compliance Integration**: Seamless compliance checking for transactions
- **Risk Monitoring**: Real-time exposure and risk assessment
- **Multi-Currency State**: Centralized currency state management

```typescript
// Hook usage example
const {
  convertCurrency,
  formatCurrency,
  validateCompliance,
  currencyExposure,
  complianceSummary
} = useCurrencyManager({ companyId });
```

#### Compliance Dashboard (`/src/pages/finance/ComplianceDashboard.tsx`)
**Purpose**: Real-time monitoring dashboard for compliance and risk management
- **Overview Tab**: Key metrics, compliance scores, and risk indicators
- **Currency Exposure**: Detailed exposure analysis with hedging recommendations
- **Compliance Status**: Rule validation results and action items
- **Deadline Tracking**: Compliance calendar with upcoming deadlines
- **Regulatory Reports**: Report generation and submission tracking

### Database Schema

#### Exchange Rate Tables
```sql
-- Exchange rates with multi-provider support and company-specific rates
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(20,10) NOT NULL,
    source VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    company_id UUID REFERENCES companies(id),
    is_active BOOLEAN DEFAULT true
);

-- Currency exposure tracking for risk management
CREATE TABLE currency_exposure (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    currency VARCHAR(3) NOT NULL,
    exposure_amount DECIMAL(20,2) NOT NULL,
    exposure_type VARCHAR(20) NOT NULL,
    risk_level VARCHAR(10) DEFAULT 'medium',
    hedged_amount DECIMAL(20,2) DEFAULT 0
);
```

#### Compliance Tables
```sql
-- Compliance rules engine with configurable validation logic
CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    rule_name VARCHAR(100) NOT NULL,
    rule_category VARCHAR(50) NOT NULL,
    rule_config JSONB NOT NULL,
    jurisdiction VARCHAR(10),
    is_active BOOLEAN DEFAULT true
);

-- Compliance validation results with detailed findings
CREATE TABLE compliance_validations (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    rule_id UUID REFERENCES compliance_rules(id),
    entity_type VARCHAR(50) NOT NULL,
    validation_result VARCHAR(20) NOT NULL,
    action_required BOOLEAN DEFAULT false
);

-- AML/KYC due diligence records
CREATE TABLE aml_kyc_diligence (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    entity_type VARCHAR(20) NOT NULL,
    risk_rating VARCHAR(10) DEFAULT 'medium',
    verification_status VARCHAR(20) DEFAULT 'pending',
    screening_results JSONB
);
```

### Supported Currencies

| Currency | Code | Symbol | Jurisdiction | Reporting Threshold | VAT Rate |
|----------|------|--------|-------------|-------------------|----------|
| Qatari Riyal | QAR | ر.ق | Qatar | QAR 50,000 | 5% |
| Saudi Riyal | SAR | ر.س | Saudi Arabia | SAR 100,000 | 15% |
| Kuwaiti Dinar | KWD | د.ك | Kuwait | KWD 3,000 | N/A |
| UAE Dirham | AED | د.إ | UAE | AED 55,000 | 5% |
| Bahraini Dinar | BHD | د.ب | Bahrain | BHD 2,500 | N/A |
| Omani Rial | OMR | ر.ع | Oman | OMR 13,000 | N/A |
| US Dollar | USD | $ | International | USD 10,000 | N/A |
| Euro | EUR | € | EU | EUR 10,000 | N/A |

### Compliance Features

#### GAAP Compliance
- **Revenue Recognition**: Accrual-based revenue validation
- **Matching Principle**: Expense-revenue matching checks
- **Materiality Thresholds**: Configurable materiality testing
- **Audit Trail**: Complete change tracking for financial entries

#### Tax Compliance (QAR/SAR)
- **VAT Validation**: Automatic VAT calculation and reporting
  - Qatar VAT: 5% on taxable supplies above QAR 3,000,000 annual turnover
  - Saudi VAT: 15% standard rate with exemptions
- **Zakat Compliance**: Islamic finance compliance (2.5% calculation)
- **Tax Reporting**: Automated regulatory report generation

#### AML/KYC Compliance
- **Screening Integration**: Sanctions list and PEP screening
- **Risk Assessment**: Automated risk rating based on transaction patterns
- **Due Diligence**: Simplified, standard, and enhanced due diligence levels
- **Monitoring**: Ongoing transaction monitoring with alerting

### API Integration

#### Exchange Rate Providers
```typescript
// Multiple API providers with fallback
const EXCHANGE_RATE_PROVIDERS = {
  fixer_io: {
    baseUrl: 'https://api.fixer.io/latest',
    supportedCurrencies: ['EUR', 'USD', 'GBP', 'AUD', 'CAD'],
    baseCurrency: 'EUR'
  },
  exchangerate_api: {
    baseUrl: 'https://v6.exchangerate-api.com/v6/latest',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD'],
    baseCurrency: 'USD'
  }
};
```

#### Regulatory APIs
- **Qatar Tax Authority**: VAT reporting integration
- **Saudi ZATCA**: VAT and Zakat reporting automation
- **AML Screening**: Integration with sanctions databases
- **Bank Integration**: Transaction monitoring APIs

### Risk Management

#### Currency Exposure Analysis
- **Real-time Monitoring**: Live exposure tracking across all currencies
- **Hedging Recommendations**: Automated hedging strategy suggestions
- **Volatility Analysis**: Historical rate change analysis
- **Stress Testing**: Scenario-based risk assessment

#### Risk Indicators
```typescript
interface RiskIndicators {
  totalRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  currencyVolatility: Record<string, number>;
  hedgingRecommendations: string[];
}
```

### Security & Compliance

#### Data Protection
- **Encryption**: All sensitive financial data encrypted at rest
- **Access Control**: Role-based permissions for compliance features
- **Audit Logging**: Complete audit trail for regulatory compliance
- **Data Retention**: Configurable retention policies for compliance data

#### Regulatory Compliance
- **SOX Compliance**: Sarbanes-Oxley Act requirements for financial reporting
- **GDPR Compliance**: Data protection for EU currency operations
- **Local Regulations**: Qatar and Saudi financial regulations
- **International Standards**: FATF recommendations for AML/CFT

### Performance Optimizations

#### Database Performance
- **Indexed Queries**: Optimized queries for exchange rates and compliance data
- **Materialized Views**: Pre-computed exposure and risk calculations
- **Partitioning**: Time-based partitioning for historical data
- **Caching**: Multi-level caching strategy for rates and calculations

#### Application Performance
- **Lazy Loading**: On-demand loading of exchange rate data
- **Batch Processing**: Bulk operations for currency conversions
- **Real-time Subscriptions**: Efficient Supabase Realtime subscriptions
- **Memory Management**: LRU cache eviction and memory optimization

### Monitoring & Alerting

#### Key Metrics
- **Exchange Rate Accuracy**: 99.9% accuracy target for rate data
- **Compliance Score**: Real-time compliance percentage tracking
- **Risk Exposure**: Live exposure monitoring with alerting
- **API Performance**: Sub-second response times for conversions

#### Alert Configuration
```typescript
// Example alert configuration
const complianceAlerts = {
  highRiskExposure: { threshold: 100000, currency: 'QAR' },
  complianceScore: { threshold: 80, type: 'below' },
  overdueReports: { threshold: 0, type: 'count' },
  exchangeRateVariance: { threshold: 2, type: 'percentage' }
};
```

### Integration Points

#### Existing Financial Modules
- **Enhanced Invoicing**: Multi-currency invoice generation and tracking
- **Payment Processing**: Currency-aware payment handling with compliance checks
- **Financial Reporting**: Multi-currency financial statement generation
- **Customer Management**: Currency-specific customer account management

#### Future Integrations
- **Banking APIs**: Real-time bank integration for transaction monitoring
- **Accounting Systems**: ERP integration for automated compliance reporting
- **Tax Authorities**: Direct API submission for regulatory reports
- **Compliance Platforms**: Integration with enterprise compliance systems

---

## 🚀 Deployment & DevOps

### Build Process
```bash
# Development
npm run dev          # Start dev server

# Production build
npm run build        # Build for production
npm run preview      # Preview production build

# Mobile builds
npm run android:build  # Build Android APK
npm run ios:build      # Build iOS app
```

### Environment Variables
```env
# Required environment variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_OPENAI_API_KEY=your_openai_key

# Optional
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your_sentry_dsn
```

### Deployment Platforms

#### Production Environment ✅ LIVE
- **Platform**: Vercel
- **Production URL**: https://fleetifyapp.vercel.app/
- **Deployment Date**: October 21, 2025
- **Status**: ✅ Operational
- **Configuration**: vercel.json (SPA routing, security headers)
- **Environment Variables**:
  - VITE_SUPABASE_URL (Production Supabase project)
  - VITE_SUPABASE_ANON_KEY (RLS-protected public key)
  - VITE_ENCRYPTION_SECRET (32-byte base64 secret)

#### Alternative Platforms
- **Netlify**: Alternative (netlify.toml configured, not currently used)
- **Mobile**: Capacitor for iOS/Android (future deployment)

#### Deployment Configuration
**Build Settings:**
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist/`
- Node Version: 18.x+
- Install Command: `npm install`

**Security Headers (Configured in vercel.json):**
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy (CSP)
- Permissions-Policy (geolocation, microphone, camera restricted)
- Referrer-Policy: strict-origin-when-cross-origin

**Performance:**
- Main bundle: 85.43 KB gzipped (83% under 500KB target)
- Total initial load: ~226 KB gzipped
- 150+ lazy-loaded route chunks
- Assets cached with max-age=31536000

### Performance Monitoring
- Bundle size: 85.43 KB gzipped (Phase 10 verified)
- Lighthouse CI integration (planned)
- Performance budgets defined in `.performance-budgets.json`
- Bundle analysis with rollup-plugin-visualizer

---

## 📊 Monitoring & Logging

### API Monitoring System (API-003) - COMPREHENSIVE

**Overview**: Complete API monitoring system with real-time visibility, performance tracking, and intelligent alerting for FleetifyApp API operations.

**Core Components** (`/src/lib/api-monitoring/`):
- **monitor.ts** (800+ lines) - Core monitoring framework with metrics collection, rate limiting, and health status
- **middleware.ts** (600+ lines) - API monitoring middleware for request/response tracking and Supabase integration
- **analytics.ts** (700+ lines) - Advanced analytics engine with performance predictions and optimization recommendations
- **integration.ts** (400+ lines) - Integration layer for FleetifyApp with environment-specific configuration

**React Components** (`/src/components/monitoring/`):
- **APIHealthDashboard.tsx** (500+ lines) - Real-time health status dashboard with visual metrics
- **PerformanceMonitor.tsx** (600+ lines) - Detailed performance monitoring with trends and recommendations

**React Hooks** (`/src/hooks/useAPIMonitoring.ts`):
- **useAPIHealth** - Real-time health status monitoring with auto-refresh
- **useAPIMetrics** - Time-windowed metrics collection and analysis
- **usePerformanceTrends** - Performance trend analysis and anomaly detection
- **useOptimizationRecommendations** - Automated performance optimization suggestions
- **useMonitoringDashboard** - Comprehensive dashboard state management

**Database Schema** (`/supabase/migrations/`):
- **api_metrics** - Aggregated performance metrics by time window
- **api_requests** - Detailed request logs with metadata
- **api_responses** - Response logs with performance data and error categorization
- **api_alerts** - Intelligent alerting system with severity levels
- **api_rate_limits** - Rate limiting tracking and violation management
- **api_performance_reports** - Automated performance reports generation
- **api_slow_queries** - Slow query tracking and analysis

**Key Features**:
- **Real-time Monitoring**: Live health status with configurable refresh intervals
- **Performance Analytics**: Response time, throughput, error rate analysis with percentiles
- **Intelligent Alerting**: Context-aware alerts with severity levels and escalation rules
- **Rate Limiting**: Adaptive rate limiting with user-based and time-based thresholds
- **Error Categorization**: Automatic error classification (authentication, validation, server, network, etc.)
- **Performance Predictions**: ML-based performance forecasting using linear regression
- **Optimization Recommendations**: Automated suggestions for performance improvements
- **Usage Patterns**: API usage analytics with geographic and device breakdowns
- **Health Scoring**: Comprehensive system health metrics with 0-100 scoring
- **Anomaly Detection**: Statistical anomaly detection with configurable thresholds

**Edge Functions** (`/supabase/functions/api-monitoring-webhook/`):
- Webhook endpoint for external monitoring data ingestion
- Metrics aggregation functions for performance data processing
- Health check endpoints for monitoring system status
- Scheduled data cleanup and aggregation jobs

**Configuration**:
- Environment-based configuration with feature flags
- Development: Full data collection with detailed logging
- Production: Optimized collection with privacy-focused defaults
- Configurable retention policies and aggregation levels
- Adaptive sampling rates based on traffic patterns

**Integration**:
- Automatic Supabase client monitoring with query tracking
- Browser fetch/XHR monitoring for comprehensive coverage
- React component integration with real-time updates
- Error tracking integration with performance correlation

**Performance Impact**:
- Asynchronous data collection to minimize API overhead
- Configurable sampling rates (10% in production, 100% in development)
- Batch processing and efficient data aggregation
- Memory-efficient with automatic cleanup and retention policies

**Privacy & Security**:
- No request/response body collection in production by default
- IP address collection disabled in production for privacy
- Secure data storage with Row Level Security (RLS)
- Rate limiting and abuse protection for monitoring endpoints

### Error Tracking
- Console errors logged to browser console (controlled by window.__APP_DEBUG__ flag)
- Centralized logger implemented (src/lib/logger.ts)
- Production: Clean console (debug logs disabled by default)
- API monitoring with intelligent error categorization and alerting
- TODO: Implement Sentry integration (Phase 11)

### Performance Metrics
- Core Web Vitals monitoring
- Custom performance marks for critical paths
- Bundle size tracking
- API response time metrics with P95/P99 percentiles
- Throughput and error rate tracking
- Real-time health scoring and anomaly detection

### Analytics
- User behavior tracking (when enabled)
- Feature usage metrics
- Performance analytics with predictive forecasting
- API usage patterns and geographic analysis
- Automated optimization recommendations with impact scoring

---

## 🔐 Security Considerations

### Authentication & Authorization
- Supabase Auth with JWT tokens
- Row Level Security (RLS) on all tables
- Role-based permissions system

### Data Protection
- All API calls over HTTPS
- Sensitive data encrypted at rest
- PII handling compliance

### Security Best Practices
- Input validation with Zod schemas
- SQL injection prevention via parameterized queries
- XSS protection with React's built-in escaping
- CSRF tokens for state-changing operations

---

## 📈 Scaling Considerations

### Current Limitations
- Single database instance
- No caching layer
- Limited horizontal scaling

### Future Improvements
1. Implement Redis caching
2. Add CDN for static assets
3. Database read replicas
4. Microservices architecture for specific modules
5. Queue system for background jobs

---

## 🆘 Troubleshooting Guide

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Database Connection Issues
- Check Supabase service status
- Verify environment variables
- Check network connectivity

#### Performance Issues
- Check browser DevTools Performance tab
- Review React DevTools Profiler
- Check for unnecessary re-renders
- Verify query optimization

---

## 📚 Additional Resources

### Internal Documentation
- API_DOCUMENTATION.md - Detailed API specs
- DEPLOYMENT_GUIDE.md - Deployment procedures
- PERFORMANCE_AUDIT.md - Performance analysis
- Various feature-specific guides (FINANCIAL_TRACKING_GUIDE.md, etc.)

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Tanstack Query Documentation](https://tanstack.com/query)

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-18 | Initial system reference documentation |
| 1.1.0 | 2025-10-20 | Added Phase 7B (Inventory, Sales, Integration, Vendors) and Phase 7C (Business Dashboards) documentation |
| 1.2.0 | 2025-10-21 | Added Phase 8 (Export & Reporting System, UI/UX Polish, Command Palette, Keyboard Shortcuts) documentation. Updated dependencies with Phase 8 libraries. |

---

## 📝 Maintenance Notes

This document should be updated whenever:
- Major architectural changes are made
- New modules or features are added
- Dependencies are significantly updated
- Pain points are resolved or discovered
- Deployment processes change
- Security measures are updated

Last Review: 2025-10-21
Next Scheduled Review: 2025-11-21