# Phase 7C: Business-Type Specific Features - 3-Agent Parallel Implementation Plan

**Date Created:** 2025-10-20
**Overall Goal:** Enhance business-type specific dashboards with real data, analytics, and workflows
**Execution Strategy:** 3 parallel agents working on separate business types
**Estimated Duration:** 2-3 days (with parallel execution)

---

## 📋 Executive Summary

Phase 7C enhances the three existing business-type dashboards (Car Rental, Real Estate, Retail) with real data integration, business-specific analytics, and specialized workflows. Building on Phase 7B's success, we'll use 3 agents working in parallel on independent business types.

**Current State:**
- ✅ Dashboard files exist but use mock data
- ✅ Some integration with core modules
- ✅ Basic UI structure in place
- ❌ Missing business-specific analytics
- ❌ Missing specialized workflows
- ❌ Missing real-time KPIs

**Target State:**
- ✅ Real data from existing modules
- ✅ Business-specific analytics widgets
- ✅ Specialized quick actions
- ✅ Industry-specific KPIs
- ✅ Custom reports and charts

---

## 🎯 Success Criteria

**Overall:**
- [ ] All 3 business dashboards enhanced
- [ ] Zero build errors
- [ ] Real data replacing mock data
- [ ] Business-specific widgets functional
- [ ] Custom analytics working
- [ ] Industry KPIs accurate

**Per Dashboard:**
- [ ] At least 6 real KPIs
- [ ] 3+ business-specific widgets
- [ ] 2+ specialized reports/charts
- [ ] 5+ quick actions
- [ ] Integration with Phase 7B modules

---

## 🤖 Agent 1: Car Rental Dashboard Enhancement

### Objective
Transform the Car Rental dashboard into a comprehensive fleet management control center with real-time vehicle tracking, rental analytics, maintenance scheduling, and revenue optimization.

### Current State Analysis
**File:** `src/pages/dashboards/CarRentalDashboard.tsx`

**✅ Already Exists:**
- Basic dashboard structure
- Some vehicle stats integration
- Activity feed
- Financial overview integration
- Quick actions component

**❌ Missing/Needs Enhancement:**
- Real-time fleet availability
- Rental analytics (utilization, revenue per vehicle)
- Maintenance scheduling integration
- Vehicle condition tracking
- Rental calendar/timeline
- Driver assignment tracking
- Insurance expiry alerts
- Revenue optimization metrics

### Tasks for Agent 1

#### Task 1.1: Enhance Fleet Availability Widget
**Priority:** High
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/car-rental/FleetAvailabilityWidget.tsx`
2. Show real-time vehicle availability:
   - Available vehicles (not rented)
   - Currently rented
   - Under maintenance
   - Out of service
3. Add vehicle type breakdown (Sedan, SUV, Van, etc.)
4. Color-code by status (Green: Available, Blue: Rented, Red: Maintenance)
5. Add quick filter by vehicle type
6. Show availability percentage
7. Add "View Fleet" quick action

**Data Source:**
- Use `useVehicles` hook from fleet module
- Filter by vehicle status
- Group by vehicle type

**Acceptance Criteria:**
- [ ] Real-time data from vehicles table
- [ ] Accurate counts per status
- [ ] Vehicle type breakdown
- [ ] Color-coded visualization
- [ ] Quick filter working
- [ ] Click to navigate to fleet page

#### Task 1.2: Create Rental Analytics Widget
**Priority:** High
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `src/components/dashboard/car-rental/RentalAnalyticsWidget.tsx`
2. Show key rental metrics:
   - Fleet utilization rate (rented / total × 100)
   - Average rental duration
   - Revenue per vehicle per day
   - Most popular vehicle types
   - Busiest rental days
3. Add time period selector (Today, This Week, This Month)
4. Create utilization chart (line chart over time)
5. Add comparison to previous period
6. Show top performing vehicles

**Data Source:**
- Query `contracts` table filtered by business_type = 'car_rental'
- Calculate metrics from rental periods
- Join with vehicles table for vehicle details

**Acceptance Criteria:**
- [ ] Accurate utilization calculations
- [ ] Revenue metrics correct
- [ ] Charts display properly
- [ ] Time period filter works
- [ ] Comparisons accurate

#### Task 1.3: Build Maintenance Schedule Widget
**Priority:** High
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/car-rental/MaintenanceScheduleWidget.tsx`
2. Show upcoming maintenance:
   - Vehicles due for service
   - Overdue maintenance
   - Scheduled maintenance this week
   - Last maintenance date
3. Add maintenance type (Oil change, Tire rotation, Inspection, etc.)
4. Color-code urgency (Red: Overdue, Yellow: Due soon, Green: On track)
5. Add quick action: "Schedule Maintenance"
6. Show cost impact of maintenance backlog

**Data Source:**
- Use `useMaintenance` hook from fleet module
- Filter by due date
- Join with vehicles table

**Acceptance Criteria:**
- [ ] Real maintenance data
- [ ] Accurate due date calculations
- [ ] Color coding works
- [ ] Quick actions functional
- [ ] Cost calculations correct

#### Task 1.4: Create Rental Calendar/Timeline
**Priority:** Medium
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `src/components/dashboard/car-rental/RentalTimelineWidget.tsx`
2. Build visual timeline showing:
   - Current rentals (start/end dates)
   - Upcoming reservations
   - Vehicle availability gaps
3. Show vehicle names on Y-axis, time on X-axis
4. Color-code by rental status (Active, Reserved, Available)
5. Add date range selector (This Week, Next Week, This Month)
6. Make rentals clickable to show details

**Data Source:**
- Query active and upcoming contracts
- Calculate rental periods
- Group by vehicle

**Acceptance Criteria:**
- [ ] Timeline displays correctly
- [ ] Date range selector works
- [ ] Color coding accurate
- [ ] Click to details works
- [ ] Responsive design

#### Task 1.5: Add Insurance & Documents Alerts
**Priority:** Medium
**Estimated Time:** 45 minutes

**Steps:**
1. Create `src/components/dashboard/car-rental/InsuranceAlertsWidget.tsx`
2. Show expiring documents:
   - Vehicle insurance
   - Registration
   - Inspection certificates
   - Driver licenses
3. Categorize by urgency:
   - Critical (< 7 days)
   - Warning (< 30 days)
   - Info (< 90 days)
4. Add quick action: "Renew Document"
5. Show count by category

**Data Source:**
- Use `useFleetVehicleInsurance` hook (from Phase 7B)
- Query vehicle documents
- Calculate days until expiry

**Acceptance Criteria:**
- [ ] Real expiry dates
- [ ] Accurate calculations
- [ ] Urgency categorization correct
- [ ] Quick actions work
- [ ] Counts accurate

#### Task 1.6: Build Revenue Optimization Widget
**Priority:** Medium
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/car-rental/RevenueOptimizationWidget.tsx`
2. Show revenue insights:
   - Revenue per vehicle type
   - Optimal pricing recommendations
   - Underutilized vehicles
   - Revenue trends
3. Add revenue comparison chart (actual vs target)
4. Show potential revenue from idle vehicles
5. Highlight top revenue generators

**Data Source:**
- Query payments linked to rental contracts
- Calculate revenue per vehicle
- Compare utilization vs revenue

**Acceptance Criteria:**
- [ ] Revenue calculations accurate
- [ ] Recommendations data-driven
- [ ] Charts display correctly
- [ ] Comparisons accurate

#### Task 1.7: Integration and Testing
**Priority:** High
**Estimated Time:** 30 minutes

**Steps:**
1. Add all new widgets to CarRentalDashboard.tsx
2. Arrange in optimal layout:
   - Row 1: Quick Stats (Fleet Availability, Active Rentals, Revenue)
   - Row 2: Rental Analytics, Maintenance Schedule
   - Row 3: Insurance Alerts, Revenue Optimization
   - Row 4: Rental Timeline (full width)
3. Test all widgets with real data
4. Verify build passes
5. Test responsive design

**Acceptance Criteria:**
- [ ] All widgets integrated
- [ ] Layout optimized
- [ ] Build passes
- [ ] No console errors
- [ ] Mobile responsive

### Deliverables for Agent 1
- [ ] 6 new car rental widgets
- [ ] Enhanced CarRentalDashboard.tsx
- [ ] Real-time fleet tracking
- [ ] Maintenance scheduling
- [ ] Revenue analytics
- [ ] Build passing
- [ ] Documentation

### Technical Specifications
- **Primary Color:** Teal gradient (from-teal-500 to-cyan-600)
- **Icons:** Car, Wrench, DollarSign, Calendar, AlertTriangle
- **Hooks:** useVehicles, useMaintenance, useContracts, useFleetVehicleInsurance
- **Charts:** Recharts (Line, Bar, Pie)
- **Multi-tenant:** Yes, company_id filtering

---

## 🤖 Agent 2: Real Estate Dashboard Enhancement

### Objective
Enhance the Real Estate dashboard with comprehensive property management analytics, tenant tracking, lease management, and financial performance metrics.

### Current State Analysis
**File:** `src/pages/dashboards/RealEstateDashboard.tsx`

**✅ Already Exists:**
- Property stats cards
- Financial overview
- Property contracts calendar
- Quick actions
- Activity feed

**❌ Missing/Needs Enhancement:**
- Occupancy analytics
- Rent collection tracking
- Maintenance request management
- Property performance comparison
- Lease expiry tracking
- Tenant satisfaction metrics
- Vacancy analysis

### Tasks for Agent 2

#### Task 2.1: Create Occupancy Analytics Widget
**Priority:** High
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/real-estate/OccupancyAnalyticsWidget.tsx`
2. Show occupancy metrics:
   - Overall occupancy rate (occupied / total × 100)
   - Occupancy by property type (Residential, Commercial, Mixed)
   - Occupancy trends over time
   - Vacant units count
   - Average vacancy duration
3. Add comparison to target occupancy (e.g., 95%)
4. Show occupancy heat map by location/area
5. Add quick action: "View Vacant Properties"

**Data Source:**
- Use `useProperties` hook
- Query `property_contracts` for active leases
- Calculate occupancy percentages

**Acceptance Criteria:**
- [ ] Real occupancy calculations
- [ ] Property type breakdown
- [ ] Trends chart accurate
- [ ] Heat map functional
- [ ] Quick actions work

#### Task 2.2: Build Rent Collection Tracker
**Priority:** High
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `src/components/dashboard/real-estate/RentCollectionWidget.tsx`
2. Show collection metrics:
   - Total rent collected this month
   - Outstanding rent (current month)
   - Overdue payments (by aging: 1-30, 31-60, 60+ days)
   - Collection rate (collected / expected × 100)
   - Top late payers
3. Add collection timeline chart
4. Show payment status by property
5. Add quick actions:
   - "Send Payment Reminders"
   - "View Overdue Accounts"

**Data Source:**
- Query `property_payments` table
- Join with `property_contracts` for expected amounts
- Calculate aging from due_date

**Acceptance Criteria:**
- [ ] Payment calculations accurate
- [ ] Aging buckets correct
- [ ] Collection rate accurate
- [ ] Timeline chart displays
- [ ] Quick actions functional

#### Task 2.3: Create Maintenance Requests Dashboard
**Priority:** High
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/real-estate/MaintenanceRequestsWidget.tsx`
2. Show maintenance metrics:
   - Open requests count
   - Average resolution time
   - Requests by priority (Urgent, High, Medium, Low)
   - Requests by category (Plumbing, Electrical, HVAC, etc.)
   - Cost of maintenance this month
3. Add status breakdown (New, In Progress, Completed)
4. Show top properties with most requests
5. Add quick action: "View All Requests"

**Data Source:**
- Use `usePropertyMaintenance` hook (from Phase 7B)
- Query `property_maintenance` table
- Calculate metrics from maintenance records

**Acceptance Criteria:**
- [ ] Real maintenance data
- [ ] Accurate counts
- [ ] Priority categorization
- [ ] Cost calculations correct
- [ ] Quick actions work

#### Task 2.4: Build Property Performance Comparison
**Priority:** High
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `src/components/dashboard/real-estate/PropertyPerformanceWidget.tsx`
2. Create comparison table/chart showing:
   - Property name
   - Occupancy rate
   - Rental income
   - Maintenance costs
   - Net operating income (NOI)
   - ROI percentage
3. Add sorting by any column
4. Highlight top performers (green) and underperformers (red)
5. Show average metrics
6. Add property type filter

**Data Source:**
- Use `usePropertyReports` hook
- Query properties with financial data
- Calculate NOI and ROI

**Acceptance Criteria:**
- [ ] All properties listed
- [ ] Metrics accurate
- [ ] Sorting works
- [ ] Color coding correct
- [ ] Filters functional

#### Task 2.5: Create Lease Expiry Tracker
**Priority:** Medium
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/real-estate/LeaseExpiryWidget.tsx`
2. Show lease expiry information:
   - Leases expiring this month
   - Leases expiring next 3 months
   - Leases expiring next 6 months
   - Renewal rate (renewed / expired × 100)
3. Categorize by urgency with color coding
4. Show tenant name, property, expiry date
5. Add quick actions:
   - "Send Renewal Notice"
   - "View Expiring Leases"

**Data Source:**
- Query `property_contracts` table
- Filter by end_date
- Calculate days until expiry

**Acceptance Criteria:**
- [ ] Expiry dates accurate
- [ ] Categorization correct
- [ ] Renewal rate calculated
- [ ] Quick actions functional

#### Task 2.6: Add Tenant Satisfaction Widget
**Priority:** Medium
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/real-estate/TenantSatisfactionWidget.tsx`
2. Show satisfaction metrics:
   - Average satisfaction score
   - Satisfaction by property
   - Recent feedback/reviews
   - Top complaints categories
   - Response time to requests
3. Add satisfaction trend chart
4. Show properties with lowest scores
5. Add quick action: "View All Feedback"

**Data Source:**
- Create new table: `tenant_feedback` (if doesn't exist)
- Query feedback records
- Calculate averages and trends

**Acceptance Criteria:**
- [ ] Satisfaction scores display
- [ ] Averages calculated
- [ ] Trend chart works
- [ ] Quick actions functional

#### Task 2.7: Build Vacancy Analysis Widget
**Priority:** Medium
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/real-estate/VacancyAnalysisWidget.tsx`
2. Show vacancy insights:
   - Current vacancy count
   - Vacancy rate trend
   - Average time to fill
   - Seasonal patterns
   - Estimated lost revenue from vacancy
3. Add vacancy reasons breakdown
4. Show areas with highest vacancy
5. Add quick action: "List Vacant Property"

**Data Source:**
- Query properties without active contracts
- Calculate vacancy duration
- Estimate lost revenue

**Acceptance Criteria:**
- [ ] Vacancy calculations accurate
- [ ] Trends display correctly
- [ ] Revenue loss calculated
- [ ] Quick actions work

#### Task 2.8: Integration and Testing
**Priority:** High
**Estimated Time:** 30 minutes

**Steps:**
1. Add all new widgets to RealEstateDashboard.tsx
2. Arrange in optimal layout:
   - Row 1: Occupancy Analytics, Rent Collection, Maintenance Requests
   - Row 2: Property Performance Comparison (full width)
   - Row 3: Lease Expiry, Tenant Satisfaction, Vacancy Analysis
3. Test all widgets
4. Verify build passes
5. Test responsive design

**Acceptance Criteria:**
- [ ] All widgets integrated
- [ ] Layout optimized
- [ ] Build passes
- [ ] No errors
- [ ] Mobile responsive

### Deliverables for Agent 2
- [ ] 7 new real estate widgets
- [ ] Enhanced RealEstateDashboard.tsx
- [ ] Occupancy tracking
- [ ] Rent collection management
- [ ] Property performance analytics
- [ ] Build passing
- [ ] Documentation

### Technical Specifications
- **Primary Color:** Emerald gradient (from-emerald-500 to-green-600)
- **Icons:** Building, Users, DollarSign, Wrench, Calendar, TrendingUp
- **Hooks:** useProperties, usePropertyReports, usePropertyMaintenance, usePropertyContracts
- **Charts:** Recharts (Line, Bar, Pie, Area)
- **Multi-tenant:** Yes, company_id filtering

---

## 🤖 Agent 3: Retail Dashboard Enhancement

### Objective
Transform the Retail dashboard into a comprehensive point-of-sale and inventory management control center with real-time sales analytics, inventory tracking, and customer insights.

### Current State Analysis
**File:** `src/pages/dashboards/RetailDashboard.tsx`

**✅ Already Exists:**
- Basic stats structure
- Mock data placeholders
- Financial overview integration
- Quick actions component

**❌ Missing/Needs Enhancement:**
- Real sales analytics
- Inventory level tracking
- Customer purchase patterns
- Product performance metrics
- Reorder recommendations
- Sales trends and forecasting
- Top products/categories

### Tasks for Agent 3

#### Task 3.1: Create Sales Analytics Widget
**Priority:** High
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `src/components/dashboard/retail/SalesAnalyticsWidget.tsx`
2. Show sales metrics:
   - Today's sales (revenue and transactions)
   - Sales this week/month
   - Average transaction value
   - Sales per hour (today)
   - Comparison to yesterday/last week
3. Add sales trend chart (hourly for today, daily for week, monthly for year)
4. Show payment method breakdown
5. Add quick action: "New Sale"

**Data Source:**
- Use `useSalesOrders` hook (from Phase 7B)
- Query `sales_orders` table
- Filter by date ranges
- Calculate aggregations

**Acceptance Criteria:**
- [ ] Real sales data
- [ ] Accurate calculations
- [ ] Trend chart displays
- [ ] Payment breakdown correct
- [ ] Quick actions work

#### Task 3.2: Build Inventory Levels Widget
**Priority:** High
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/retail/InventoryLevelsWidget.tsx`
2. Show inventory metrics:
   - Total inventory value
   - Low stock items count
   - Out of stock items count
   - Stock turnover rate
   - Dead stock (not sold in 90 days)
3. Add inventory distribution chart (by category)
4. Show top low stock items
5. Add quick actions:
   - "View Low Stock"
   - "Create Purchase Order"

**Data Source:**
- Use `useInventoryItems` and `useInventoryStockLevels` (from Phase 7B)
- Query inventory tables
- Calculate stock levels and turnover

**Acceptance Criteria:**
- [ ] Real inventory data
- [ ] Stock calculations accurate
- [ ] Charts display correctly
- [ ] Quick actions functional

#### Task 3.3: Create Top Products Widget
**Priority:** High
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/retail/TopProductsWidget.tsx`
2. Show product performance:
   - Top 10 products by revenue
   - Top 10 products by quantity sold
   - Top performing categories
   - Fastest moving items
   - Profit margin by product
3. Add time period selector (Today, Week, Month, Year)
4. Show product images (if available)
5. Add quick action: "View Product Details"

**Data Source:**
- Query `sales_orders` and order items
- Join with `inventory_items`
- Calculate revenue and quantities

**Acceptance Criteria:**
- [ ] Top products accurate
- [ ] Revenue calculations correct
- [ ] Time period filter works
- [ ] Quick actions functional

#### Task 3.4: Build Customer Insights Widget
**Priority:** High
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `src/components/dashboard/retail/CustomerInsightsWidget.tsx`
2. Show customer metrics:
   - New customers this month
   - Returning customers rate
   - Average customer lifetime value
   - Customer acquisition cost
   - Top customers by spending
3. Add customer segmentation (New, Regular, VIP, At-Risk)
4. Show purchase frequency distribution
5. Add quick action: "View Customers"

**Data Source:**
- Use `useCustomers` hook
- Query customer purchase history
- Calculate CLV and segmentation

**Acceptance Criteria:**
- [ ] Customer data accurate
- [ ] Metrics calculated correctly
- [ ] Segmentation works
- [ ] Quick actions functional

#### Task 3.5: Create Reorder Recommendations
**Priority:** Medium
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/retail/ReorderRecommendationsWidget.tsx`
2. Show reorder insights:
   - Items below reorder point
   - Recommended order quantities
   - Estimated stockout date
   - Seasonal trends consideration
   - Vendor lead times
3. Prioritize by urgency
4. Calculate estimated order cost
5. Add quick actions:
   - "Create PO for Selected Items"
   - "View Reorder Report"

**Data Source:**
- Use inventory integration view `inventory_reorder_recommendations` (from Phase 7B)
- Calculate based on sales velocity
- Consider vendor lead times

**Acceptance Criteria:**
- [ ] Recommendations accurate
- [ ] Calculations correct
- [ ] Urgency prioritization works
- [ ] Quick actions functional

#### Task 3.6: Build Sales Forecast Widget
**Priority:** Medium
**Estimated Time:** 1.5 hours

**Steps:**
1. Create `src/components/dashboard/retail/SalesForecastWidget.tsx`
2. Show forecast metrics:
   - Projected sales next 7 days
   - Projected sales next 30 days
   - Confidence interval
   - Comparison to actual (previous period)
3. Use simple forecasting algorithm:
   - Moving average
   - Trend analysis
   - Seasonal adjustment
4. Add forecast chart
5. Show impact of current trends

**Data Source:**
- Historical sales data
- Calculate moving averages
- Apply trend analysis

**Acceptance Criteria:**
- [ ] Forecast calculations work
- [ ] Chart displays correctly
- [ ] Confidence intervals shown
- [ ] Trends analyzed

#### Task 3.7: Add Category Performance Widget
**Priority:** Medium
**Estimated Time:** 1 hour

**Steps:**
1. Create `src/components/dashboard/retail/CategoryPerformanceWidget.tsx`
2. Show category metrics:
   - Revenue by category
   - Profit margin by category
   - Units sold by category
   - Growth rate by category
3. Add category comparison chart
4. Show underperforming categories
5. Add quick action: "View Category Details"

**Data Source:**
- Query sales orders
- Group by product category
- Calculate aggregations

**Acceptance Criteria:**
- [ ] Category data accurate
- [ ] Charts display correctly
- [ ] Comparisons work
- [ ] Quick actions functional

#### Task 3.8: Integration and Testing
**Priority:** High
**Estimated Time:** 30 minutes

**Steps:**
1. Add all new widgets to RetailDashboard.tsx
2. Arrange in optimal layout:
   - Row 1: Sales Analytics, Inventory Levels, Customer Insights
   - Row 2: Top Products, Reorder Recommendations
   - Row 3: Sales Forecast, Category Performance
3. Remove all mock data
4. Test all widgets
5. Verify build passes
6. Test responsive design

**Acceptance Criteria:**
- [ ] All widgets integrated
- [ ] No mock data remaining
- [ ] Layout optimized
- [ ] Build passes
- [ ] Mobile responsive

### Deliverables for Agent 3
- [ ] 7 new retail widgets
- [ ] Enhanced RetailDashboard.tsx
- [ ] Real sales analytics
- [ ] Inventory tracking
- [ ] Customer insights
- [ ] Sales forecasting
- [ ] Build passing
- [ ] Documentation

### Technical Specifications
- **Primary Color:** Orange gradient (from-orange-500 to-amber-600)
- **Icons:** ShoppingCart, Package, TrendingUp, Users, DollarSign, BarChart
- **Hooks:** useSalesOrders, useInventoryItems, useInventoryStockLevels, useCustomers
- **Charts:** Recharts (Line, Bar, Pie, Area)
- **Multi-tenant:** Yes, company_id filtering

---

## 📊 Parallel Execution Strategy

### Agent Independence
Each agent works on a separate business dashboard with no code conflicts:

| Aspect | Agent 1 (Car Rental) | Agent 2 (Real Estate) | Agent 3 (Retail) |
|--------|---------------------|---------------------|------------------|
| **Primary File** | CarRentalDashboard.tsx | RealEstateDashboard.tsx | RetailDashboard.tsx |
| **Components** | `src/components/dashboard/car-rental/*` | `src/components/dashboard/real-estate/*` | `src/components/dashboard/retail/*` |
| **Data Source** | Fleet, Vehicles, Contracts | Properties, Property Contracts | Sales, Inventory |
| **Dependencies** | Phase 7B modules | Phase 7B modules | Phase 7B modules |
| **Conflicts** | None (separate files) | None (separate files) | None (separate files) |

### Coordination Points
1. **Component Naming** - Use prefixed directories (car-rental/, real-estate/, retail/)
2. **Shared Hooks** - Use existing Phase 7B hooks (no modifications)
3. **Build Verification** - Each agent runs build after completion
4. **No Database Changes** - Use existing tables only

### Execution Timeline

**Day 1:**
- Hour 1: Launch all 3 agents simultaneously
- Hours 2-5: Agents work independently
- Hour 6: First checkpoint - verify progress
- Hours 7-8: Continue development

**Day 2:**
- Hours 1-4: Complete remaining widgets
- Hour 5: Individual testing
- Hour 6: Merge all changes
- Hour 7: Integration testing
- Hour 8: Documentation and final build

---

## ✅ Acceptance Criteria (Overall)

### Functional Requirements
- [ ] All dashboards use real data (no mock data)
- [ ] Business-specific widgets functional
- [ ] Analytics calculations accurate
- [ ] Quick actions working
- [ ] All routes accessible
- [ ] Multi-tenant isolation verified

### Technical Requirements
- [ ] Zero build errors
- [ ] Zero TypeScript errors
- [ ] Bundle size optimized
- [ ] Performance: Dashboards load in <2s

### Quality Requirements
- [ ] Arabic/RTL support
- [ ] Responsive design
- [ ] Consistent UI/UX
- [ ] Proper error handling
- [ ] Loading states

### Documentation Requirements
- [ ] tasks/todo.md updated
- [ ] CHANGELOG updated
- [ ] Inline code comments
- [ ] Component documentation

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All agent branches merged
- [ ] Conflicts resolved
- [ ] Build passes
- [ ] TypeScript compiles

### Deployment Steps
1. [ ] Deploy to staging
2. [ ] Run smoke tests
3. [ ] Test each dashboard
4. [ ] Deploy to production
5. [ ] Monitor performance

---

## 📈 Success Metrics

### Phase 7C.1 (Car Rental)
- Widgets: 6
- Real KPIs: 8+
- Quick Actions: 5+

### Phase 7C.2 (Real Estate)
- Widgets: 7
- Real KPIs: 10+
- Quick Actions: 6+

### Phase 7C.3 (Retail)
- Widgets: 7
- Real KPIs: 12+
- Quick Actions: 5+

### Overall
- **Total Widgets:** 20+
- **Total Components:** 20+
- **Mock Data Removed:** 100%
- **Code Quality:** Zero errors

---

**Plan Version:** 1.0
**Created:** 2025-10-20
**Status:** Ready for Execution
**Approval Required:** Yes - User must approve before launching agents
