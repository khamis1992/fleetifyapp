# FleetifyApp Navigation Testing Plan

## Testing Overview
Comprehensive testing of all navigation elements and page-to-page routing in the fleetifyapp.

## Test Environment
- URL: http://localhost:5173
- Browser: Chrome (via Playwright)
- Viewport: Desktop (1280x720) and Mobile (375x667)

## 1. Main Navigation Elements Testing

### 1.1 Header Navigation
- [ ] Logo click - should navigate to Dashboard
- [ ] Company Selector - should switch between companies
- [ ] Quick Search - should search and navigate to results
- [ ] Notification Bell - should open notifications dropdown
- [ ] Attendance Button - should mark attendance
- [ ] User Profile Dropdown - should show profile, settings, logout options

### 1.2 Sidebar Navigation (Primary)
Based on navigationConfig.ts:

#### Main Sections
- [ ] Dashboard (لوحة التحكم) → /dashboard
- [ ] Customer Management (إدارة العملاء) submenu:
  - [ ] Customers List (قائمة العملاء) → /customers
  - [ ] Customer CRM (إدارة العلاقات) → /customers/crm
- [ ] Fleet Management (إدارة الأسطول) submenu:
  - [ ] Vehicles Management (إدارة المركبات) → /fleet
  - [ ] Maintenance (الصيانة) → /fleet/maintenance
  - [ ] Dispatch Permits (تصاريح الحركة) → /fleet/dispatch-permits
  - [ ] Traffic Violations (المخالفات والمدفوعات) → /fleet/traffic-violations
  - [ ] Fleet Reports (التقارير والتحليلات) → /fleet/reports
  - [ ] Vehicle Installments (أقساط المركبات) → /fleet/vehicle-installments
  - [ ] Reservation System (نظام الحجوزات) → /fleet/reservation-system
- [ ] Quotations & Contracts (العروض والعقود) submenu:
  - [ ] Quotations (عروض الأسعار) → /quotations
  - [ ] Contracts (العقود) → /contracts
- [ ] Finance (المالية) submenu (Admin only):
  - [ ] Chart of Accounts (دليل الحسابات) → /finance/chart-of-accounts
  - [ ] Ledger (دفتر الأستاذ) → /finance/ledger
  - [ ] Invoices & Payments (الفواتير والمدفوعات) → /finance/invoices
  - [ ] Treasury & Banks (الخزينة والبنوك) → /finance/treasury
  - [ ] Accounts Receivable Aging (الذمم المدينة) → /finance/ar-aging
  - [ ] Payment Tracking (تتبع الدفعات) → /finance/payment-tracking
  - [ ] Analysis & Reports (التحليل والتقارير) → /finance/reports
- [ ] Sales (المبيعات) submenu:
  - [ ] Sales Pipeline (مسار المبيعات) → /sales/pipeline
  - [ ] Leads & Quotes (العملاء المحتملين والعروض) → /sales/leads
  - [ ] Orders (الطلبات) → /sales/orders
  - [ ] Sales Analytics (تحليلات المبيعات) → /sales/analytics
- [ ] Inventory (المخزون) submenu:
  - [ ] Items & Categories (الأصناف والتصنيفات) → /inventory
  - [ ] Warehouses (المستودعات) → /inventory/warehouses
  - [ ] Stock Movements & Reports (حركات المخزون والتقارير) → /inventory/movements
- [ ] Human Resources (الموارد البشرية) submenu (Admin only):
  - [ ] Employee Management (إدارة الموظفين) → /hr/employees
  - [ ] Attendance & Leave (الحضور والإجازات) → /hr/attendance
  - [ ] Payroll (الرواتب) → /hr/payroll
  - [ ] HR Reports (التقارير) → /hr/reports
- [ ] Legal Affairs (الشؤون القانونية) submenu:
  - [ ] Legal Advisor (المستشار القانوني) → /legal/advisor
  - [ ] Case Tracking (تتبع القضايا) → /legal/cases
  - [ ] Invoice Disputes (نزاعات الفواتير) → /legal/invoice-disputes
  - [ ] Late Fees & Reminders (غرامات التأخير والتذكيرات) → /legal/late-fees
- [ ] Reports (التقارير) → /reports
- [ ] Support (الدعم الفني) → /support
- [ ] Help & Documentation (المساعدة والتوثيق) submenu:
  - [ ] Help Center (مركز المساعدة) → /help
  - [ ] User Guide (دليل المستخدم) → /help/user-guide
  - [ ] Dashboard Guide (دليل لوحة التحكم) → /help/dashboard
  - [ ] Contracts Guide (دليل العقود) → /help/contracts
  - [ ] Customers Guide (دليل العملاء) → /help/customers
  - [ ] Finance Guide (دليل المالية) → /help/finance
  - [ ] Collections Guide (دليل التحصيل) → /help/collections
  - [ ] Fleet Guide (دليل الأسطول) → /help/fleet
  - [ ] FAQ (الأسئلة الشائعة) → /help/faq

### 1.3 Sidebar Settings Sections (Admin only)
#### Finance Settings
- [ ] Accounting Wizard (معالج النظام المحاسبي) → /finance/accounting-wizard
- [ ] Account Mappings (ربط الحسابات) → /finance/account-mappings
- [ ] Budgets (الموازنات) → /finance/budgets
- [ ] Cost Centers (مراكز التكلفة) → /finance/cost-centers
- [ ] Vendor Management (إدارة الموردين) → /finance/vendors
- [ ] Vendor Categories (تصنيفات الموردين) → /finance/vendor-categories
- [ ] Purchase Orders (أوامر الشراء) → /finance/purchase-orders
- [ ] Fixed Assets (الأصول الثابتة) → /finance/assets

#### HR Settings
- [ ] Location Settings (إعدادات الموقع) → /hr/location-settings
- [ ] HR Configuration (إعدادات الموارد البشرية) → /hr/settings

#### System Administration (Super Admin only)
- [ ] Approval System (نظام الموافقات) → /approvals
- [ ] Audit Log (سجل العمليات) → /audit
- [ ] Backup (النسخ الاحتياطية) → /backup

### 1.4 Sidebar Footer
- [ ] Sign Out button - should logout and redirect to auth

## 2. Page-Level Navigation Testing

### 2.1 Dashboard Page
- [ ] Quick Action buttons navigation
- [ ] Chart/Widget navigation links
- [ ] "View All" links for each section

### 2.2 Customers Page
- [ ] "Add Customer" button navigation
- [ ] Customer row click → Customer Details page
- [ ] Customer Actions (Edit, Delete, etc.)

### 2.3 Fleet Page
- [ ] "Add Vehicle" button navigation
- [ ] Vehicle row click → Vehicle Details page
- [ ] Filter/Sort navigation (maintains URL state)

### 2.4 Contracts Page
- [ ] "Add Contract" button navigation
- [ ] Contract row click → Contract Details page
- [ ] Contract status filters navigation

### 2.5 Finance Pages
- [ ] Navigation between finance sub-pages
- [ ] Transaction detail views
- [ ] Report generation navigation

## 3. Form Navigation Testing

### 3.1 Multi-Step Forms
- [ ] Next/Previous buttons in forms
- [ ] Progress navigation clicks
- [ ] Form completion redirects

### 3.2 Tab Navigation
- [ ] Tab switching within pages
- [ ] URL updates on tab change
- [ ] Tab state persistence

### 3.3 Modal/Dialog Navigation
- [ ] Modal open/close navigation
- [ ] Modal form submissions
- [ ] Cancel button navigation

## 4. Route Testing

### 4.1 Direct URL Access
- [ ] All primary routes load correctly
- [ ] Dynamic routes (/:id, etc.) handle parameters
- [ ] Invalid routes show 404 page

### 4.2 Browser Navigation
- [ ] Back button works correctly
- [ ] Forward button works correctly
- [ ] Refresh maintains state
- [ ] URL changes are reflected in UI

### 4.3 Redirect Routes
- [ ] Legacy routes redirect properly
- [ ] Authentication redirects work
- [ ] Role-based redirects function

## 5. Permission Testing

### 5.1 Unauthenticated Access
- [ ] Protected routes redirect to /auth
- [ ] Public routes remain accessible
- [ ] Login flow navigation

### 5.2 Role-Based Access
- [ ] Admin routes require admin role
- [ ] Super Admin routes require super admin role
- [ ] User role limits navigation options

### 5.3 Company Context
- [ ] Company switching updates navigation
- [ ] Data isolation between companies
- [ ] Cross-company navigation restrictions

## 6. Performance Testing

### 6.1 Loading States
- [ ] Navigation shows loading indicators
- [ ] Lazy loading works for heavy pages
- [ ] Skeleton screens display appropriately

### 6.2 Error Handling
- [ ] Broken routes show error page
- [ ] Navigation errors are handled gracefully
- [ ] Console error checking

## 7. Accessibility Testing

### 7.1 Keyboard Navigation
- [ ] Tab navigation works through menus
- [ ] Arrow key navigation in submenus
- [ ] Enter/Space activate menu items
- [ ] Escape closes dropdowns/menus

### 7.2 Screen Reader Support
- [ ] ARIA labels on navigation elements
- [ ] Link descriptions are meaningful
- [ ] Focus management works correctly
- [ ] Announcements for route changes

## 8. Responsive Testing

### 8.1 Mobile Navigation
- [ ] Hamburger menu opens/closes
- [ ] Touch interactions work
- [ ] Mobile-specific navigation patterns
- [ ] Swipe gestures (if implemented)

### 8.2 Tablet Navigation
- [ ] Adaptive layouts work
- [ ] Touch and input interactions
- [ ] Orientation changes handled

## Test Results Summary

### Working Navigation ✅
[List of confirmed working navigation elements]

### Broken Navigation ❌
[List of broken navigation elements with error details]

### Permission Issues ⚠️
[List of navigation elements with permission problems]

### Performance Issues 🐌
[List of slow-loading navigation elements]

### Accessibility Issues ♿
[List of accessibility-related navigation problems]

## Recommendations

### High Priority Fixes
1. [Most critical navigation issues]

### Medium Priority Improvements
1. [Performance and UX improvements]

### Low Priority Enhancements
1. [Nice-to-have navigation features]

## Test Environment Details
- Browser: Chrome [Version]
- Viewport: [Sizes tested]
- Network: [Connection speed]
- User Role: [Roles tested]
- Company: [Company contexts tested]