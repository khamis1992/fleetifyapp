# Phase 9: Parallel Integration - 3 Agent Plan

## Executive Summary
Three specialized agents will work in parallel to deliver complete ERP integration:
- **Agent A**: Sales & Inventory Integration
- **Agent B**: Financial Integration
- **Agent C**: Reporting & Analytics

**Total Timeline**: 3-4 days (parallel execution)
**Coordination**: Daily sync points to avoid conflicts

---

## 🎯 Agent A: Sales & Inventory Integration

### Objective
Create seamless workflow from sales opportunity → quote → order → inventory deduction → vendor restocking.

### Acceptance Criteria
- [ ] Sales order automatically reduces inventory stock
- [ ] Low stock triggers vendor purchase order suggestion
- [ ] Quote converts to order with one click
- [ ] Opportunity converts to quote with one click
- [ ] Inventory alerts integrated with sales pipeline
- [ ] Stock reservation system for pending orders
- [ ] Automated stock-in from purchase orders

### Scope & Impact Radius
**Modules touched:**
- `src/hooks/useSalesOrders.ts` - Add inventory integration
- `src/hooks/useSalesQuotes.ts` - Add order conversion
- `src/hooks/useSalesOpportunities.ts` - Add quote conversion
- `src/hooks/useInventoryItems.ts` - Add stock deduction logic
- `src/hooks/useVendors.ts` - Add purchase order generation
- `src/pages/sales/SalesOrders.tsx` - Add inventory checks
- `src/pages/inventory/Inventory.tsx` - Add sales integration UI
- New: `src/hooks/useStockReservation.ts`
- New: `src/hooks/useInventoryTransactions.ts`
- New: `src/components/sales/OrderInventoryCheck.tsx`
- New: `src/components/inventory/PurchaseOrderSuggestion.tsx`

**Database changes:**
- New table: `inventory_transactions` (stock movements)
- New table: `stock_reservations` (pending orders)
- New table: `purchase_orders`
- New view: `low_stock_with_vendor_info`

**Out of scope:**
- Multi-warehouse allocation
- Advanced picking/packing workflows
- Batch/serial number tracking

### Risks & Mitigations
- **Risk**: Race conditions in stock deduction
  - **Mitigation**: Use PostgreSQL row-level locking with `SELECT FOR UPDATE`
- **Risk**: Order fails after stock deduction
  - **Mitigation**: Wrap in database transaction with rollback
- **Risk**: Conflicts with Agent B on order hooks
  - **Mitigation**: Agent A owns order creation, Agent B owns payment linking

### Implementation Steps

#### Day 1: Foundation (8 hours)
- [ ] **Task 1.1**: Create database migrations
  - `inventory_transactions` table
  - `stock_reservations` table
  - `purchase_orders` table
  - `low_stock_with_vendor_info` view
- [ ] **Task 1.2**: Create `useInventoryTransactions` hook
  - `createStockMovement()` - record all stock changes
  - `getStockHistory()` - view movement history
  - Types: 'sale', 'purchase', 'adjustment', 'return'
- [ ] **Task 1.3**: Create `useStockReservation` hook
  - `reserveStock()` - hold stock for pending order
  - `releaseReservation()` - cancel reservation
  - `confirmReservation()` - convert to actual deduction

#### Day 2: Sales → Inventory Flow (8 hours)
- [ ] **Task 2.1**: Update `useCreateSalesOrder` hook
  - Check stock availability before creating order
  - Auto-create stock reservation
  - Auto-create inventory transaction on order confirmation
  - Rollback on failure
- [ ] **Task 2.2**: Create `OrderInventoryCheck` component
  - Show real-time stock availability
  - Warn if insufficient stock
  - Show alternative items if out of stock
- [ ] **Task 2.3**: Add order → quote conversion
  - Update `useSalesQuotes` with `convertToOrder()` mutation
  - Copy all line items
  - Check inventory before conversion

#### Day 3: Vendor Integration & Purchase Orders (8 hours)
- [ ] **Task 3.1**: Create `usePurchaseOrders` hook
  - `createPurchaseOrder()` from low stock alert
  - `receivePurchaseOrder()` - stock-in workflow
  - `cancelPurchaseOrder()`
- [ ] **Task 3.2**: Create `PurchaseOrderSuggestion` component
  - Show in low stock alerts
  - Pre-fill vendor and quantities
  - One-click PO creation
- [ ] **Task 3.3**: Build Purchase Order page
  - List all POs (pending, received, cancelled)
  - Receive stock workflow
  - Print PO PDF

#### Day 4: Polish & Testing (4 hours)
- [ ] **Task 4.1**: Add opportunity → quote conversion
  - Update `useSalesOpportunities` with `convertToQuote()`
  - Pre-fill customer and estimated value
- [ ] **Task 4.2**: Integration testing
  - Test full flow: Opportunity → Quote → Order → Stock Deduction
  - Test low stock → PO → Receive → Stock-in
  - Test reservation release on order cancellation
- [ ] **Task 4.3**: Error handling
  - Insufficient stock errors
  - Concurrent order conflicts
  - PO receive validation

### Deliverables
1. Complete sales-to-inventory workflow
2. Purchase order system
3. Stock reservation system
4. 3 new database tables + 1 view
5. 4 new React components
6. 3 new custom hooks
7. Integration test suite

---

## 💰 Agent B: Financial Integration

### Objective
Automatic journal entries for all sales, purchases, and inventory movements with proper accounting integration.

### Acceptance Criteria
- [ ] Sales order creates AR journal entry automatically
- [ ] Purchase order creates AP journal entry automatically
- [ ] Customer payment auto-links to invoice and creates journal entry
- [ ] Vendor payment auto-links to PO and creates journal entry
- [ ] Inventory movements create COGS entries
- [ ] All entries follow double-entry bookkeeping
- [ ] Configurable account mappings
- [ ] Audit trail for all auto-generated entries

### Scope & Impact Radius
**Modules touched:**
- `src/hooks/useGeneralLedger.ts` - Add auto-entry creation
- `src/hooks/usePayments.ts` - Add invoice linking
- `src/hooks/useFinance.ts` - Add AP/AR automation
- `src/hooks/useInventoryItems.ts` - Add COGS tracking
- `src/pages/finance/AccountMappings.tsx` - Enhance mappings UI
- New: `src/hooks/useAutoJournalEntries.ts`
- New: `src/hooks/useAccountsReceivable.ts`
- New: `src/hooks/useAccountsPayable.ts`
- New: `src/components/finance/AutoEntryReview.tsx`
- New: `src/components/finance/PaymentInvoiceLinker.tsx`

**Database changes:**
- New table: `auto_journal_config` (mapping rules)
- New table: `ar_transactions` (receivables tracking)
- New table: `ap_transactions` (payables tracking)
- Alter table: `journal_entries` add `source_type`, `source_id`
- New view: `accounts_receivable_aging`
- New view: `accounts_payable_aging`

**Out of scope:**
- Multi-currency transactions
- Complex tax calculations
- Bank reconciliation
- Payroll accounting

### Risks & Mitigations
- **Risk**: Double-posting of journal entries
  - **Mitigation**: Add unique constraint on `source_type` + `source_id`
- **Risk**: Conflicts with Agent A on payment hooks
  - **Mitigation**: Agent B owns payment creation, Agent A owns order creation
- **Risk**: Incorrect COGS calculations
  - **Mitigation**: Use FIFO/weighted average with rigorous testing
- **Risk**: Breaking existing manual journal entries
  - **Mitigation**: Feature flag `ENABLE_AUTO_JOURNAL_ENTRIES` (default: false)

### Implementation Steps

#### Day 1: Foundation & Configuration (8 hours)
- [ ] **Task 1.1**: Create database migrations
  - `auto_journal_config` table
  - `ar_transactions` table
  - `ap_transactions` table
  - Alter `journal_entries` for source tracking
  - Create aging views
- [ ] **Task 1.2**: Create `useAutoJournalEntries` hook
  - `createSalesJournalEntry()` - DR: AR, CR: Revenue
  - `createPurchaseJournalEntry()` - DR: Inventory, CR: AP
  - `createPaymentJournalEntry()` - DR: Cash, CR: AR
  - `createCOGSJournalEntry()` - DR: COGS, CR: Inventory
- [ ] **Task 1.3**: Build account mapping configuration UI
  - Sales revenue account
  - AR account
  - AP account
  - Inventory asset account
  - COGS expense account
  - Cash/bank accounts

#### Day 2: AR Automation (8 hours)
- [ ] **Task 2.1**: Create `useAccountsReceivable` hook
  - Auto-create AR entry on sales order confirmation
  - Track aging (current, 30, 60, 90+ days)
  - Link payments to invoices
  - Calculate outstanding balance
- [ ] **Task 2.2**: Create `PaymentInvoiceLinker` component
  - Search and select invoice
  - Auto-fill payment amount
  - Show outstanding balance
  - Support partial payments
- [ ] **Task 2.3**: Update customer payment flow
  - Link payment to invoice
  - Create journal entry (DR: Cash, CR: AR)
  - Update AR balance
  - Send payment confirmation

#### Day 3: AP Automation & COGS (8 hours)
- [ ] **Task 3.1**: Create `useAccountsPayable` hook
  - Auto-create AP entry on purchase order
  - Track aging
  - Link vendor payments
  - Calculate outstanding balance
- [ ] **Task 3.2**: Implement COGS tracking
  - Calculate COGS on sale (FIFO method)
  - Create journal entry (DR: COGS, CR: Inventory)
  - Update inventory valuation
  - Track cost per item
- [ ] **Task 3.3**: Build AP dashboard
  - Show all payables
  - Aging analysis
  - Payment scheduling
  - Vendor payment batch processing

#### Day 4: Testing & Audit Trail (4 hours)
- [ ] **Task 4.1**: Create `AutoEntryReview` component
  - Show all auto-generated entries
  - Highlight unbalanced entries (if any)
  - Allow reversal with reason
  - Audit log
- [ ] **Task 4.2**: Integration testing
  - Test full sales cycle with accounting
  - Test purchase cycle with accounting
  - Verify all entries are balanced
  - Test partial payment scenarios
- [ ] **Task 4.3**: Feature flag implementation
  - Add `ENABLE_AUTO_JOURNAL_ENTRIES` flag
  - Settings page toggle
  - Migration script for existing companies

### Deliverables
1. Complete AR/AP automation
2. COGS tracking system
3. Payment-invoice linking
4. Account mapping configuration
5. 3 new database tables + 2 views
6. 4 new React components
7. 3 new custom hooks
8. Feature flag system
9. Audit trail dashboard

---

## 📊 Agent C: Reporting & Analytics

### Objective
Comprehensive reporting dashboard with real-time analytics, forecasting, and exportable reports.

### Acceptance Criteria
- [ ] Sales dashboard with pipeline metrics
- [ ] Inventory dashboard with turnover rates
- [ ] Vendor performance scorecard
- [ ] P&L by product/category
- [ ] Revenue forecasting (trend-based)
- [ ] Customizable date ranges
- [ ] Export to PDF/Excel
- [ ] Real-time widgets
- [ ] Drill-down capability

### Scope & Impact Radius
**Modules touched:**
- `src/hooks/useReportExport.ts` - Enhance export capabilities
- `src/pages/reports/*` - New report pages
- New: `src/hooks/useSalesAnalytics.ts`
- New: `src/hooks/useInventoryAnalytics.ts`
- New: `src/hooks/useVendorAnalytics.ts`
- New: `src/hooks/useFinancialForecasting.ts`
- New: `src/components/reports/SalesDashboard.tsx`
- New: `src/components/reports/InventoryDashboard.tsx`
- New: `src/components/reports/VendorScorecard.tsx`
- New: `src/components/reports/ProductProfitability.tsx`
- New: `src/components/reports/RevenueForecast.tsx`
- New: `src/components/reports/CustomDateRangePicker.tsx`

**Database changes:**
- New view: `sales_pipeline_metrics`
- New view: `inventory_turnover_analysis`
- New view: `vendor_performance_metrics`
- New view: `product_profitability`
- New materialized view: `monthly_revenue_forecast` (updated daily)

**Out of scope:**
- AI/ML-based forecasting
- Custom report builder
- Real-time streaming analytics
- Multi-dimensional OLAP cubes

### Risks & Mitigations
- **Risk**: Slow query performance on large datasets
  - **Mitigation**: Use materialized views, indexed columns
- **Risk**: Conflicts with Agent A/B on shared hooks
  - **Mitigation**: Agent C only reads data, no writes
- **Risk**: Export timeout on large reports
  - **Mitigation**: Implement pagination + background job queue

### Implementation Steps

#### Day 1: Analytics Foundation (8 hours)
- [ ] **Task 1.1**: Create database views
  - `sales_pipeline_metrics` - conversion rates, avg deal size
  - `inventory_turnover_analysis` - turnover rate, days to sell
  - `vendor_performance_metrics` - on-time delivery, quality
  - `product_profitability` - revenue, COGS, margin by product
  - `monthly_revenue_forecast` (materialized)
- [ ] **Task 1.2**: Create `useSalesAnalytics` hook
  - `getPipelineMetrics()` - stage conversion, velocity
  - `getRevenueByPeriod()` - daily/weekly/monthly
  - `getTopProducts()` - best sellers
  - `getSalesPersonPerformance()` - if applicable
- [ ] **Task 1.3**: Create `useInventoryAnalytics` hook
  - `getTurnoverRate()` - by category
  - `getAgingAnalysis()` - slow-moving items
  - `getStockoutHistory()` - missed sales opportunities
  - `getInventoryValuation()` - current value

#### Day 2: Sales & Inventory Dashboards (8 hours)
- [ ] **Task 2.1**: Build `SalesDashboard` component
  - Pipeline funnel chart
  - Revenue trend line graph
  - Win rate KPI
  - Average deal size KPI
  - Top products table
  - Conversion rate by stage
- [ ] **Task 2.2**: Build `InventoryDashboard` component
  - Stock value pie chart
  - Turnover rate bar chart
  - Low stock alerts widget
  - Top moving items table
  - Aging inventory analysis
  - Stock movement timeline
- [ ] **Task 2.3**: Create `CustomDateRangePicker` component
  - Preset ranges (Today, This Week, This Month, This Quarter, This Year)
  - Custom start/end date
  - Comparison period (vs last period)
  - Quick filters (Last 7/30/90 days)

#### Day 3: Vendor & Product Analytics (8 hours)
- [ ] **Task 3.1**: Create `useVendorAnalytics` hook
  - `getVendorPerformance()` - delivery time, quality score
  - `getPurchaseHistory()` - spend by vendor
  - `getVendorReliability()` - on-time percentage
- [ ] **Task 3.2**: Build `VendorScorecard` component
  - Vendor ranking table
  - On-time delivery rate
  - Average lead time
  - Total spend
  - Quality issues count
  - Star rating visualization
- [ ] **Task 3.3**: Build `ProductProfitability` component
  - Revenue by product
  - COGS by product
  - Margin percentage
  - Units sold
  - Contribution to total revenue
  - Profitability heatmap

#### Day 4: Forecasting & Export (4 hours)
- [ ] **Task 4.1**: Create `useFinancialForecasting` hook
  - Simple linear regression for revenue
  - Moving average for smoothing
  - Seasonal adjustment (if data available)
  - Confidence intervals
- [ ] **Task 4.2**: Build `RevenueForecast` component
  - Forecast chart (actual + predicted)
  - Show confidence band
  - Key assumptions display
  - Scenario analysis (best/worst case)
- [ ] **Task 4.3**: Enhance export functionality
  - PDF export for all dashboards
  - Excel export with formatting
  - Scheduled reports (email delivery)
  - Custom logo/branding

### Deliverables
1. 5 comprehensive dashboards
2. Real-time analytics widgets
3. Revenue forecasting system
4. Vendor performance tracking
5. Product profitability analysis
6. 5 new database views (4 regular, 1 materialized)
7. 10 new React components
8. 4 new custom hooks
9. Enhanced PDF/Excel export

---

## 🔄 Coordination & Dependencies

### Critical Sync Points

**Daily Standup (10 minutes at start of each day)**
- What did you complete yesterday?
- What are you working on today?
- Any blockers or conflicts?

**Shared Resources - Avoid Conflicts:**

| Resource | Agent A | Agent B | Agent C |
|----------|---------|---------|---------|
| `useSalesOrders` | ✍️ Writes (order creation) | 📖 Reads (for journal entries) | 📖 Reads (analytics) |
| `usePayments` | 📖 Reads | ✍️ Writes (payment creation) | 📖 Reads |
| `useInventoryItems` | ✍️ Writes (stock updates) | 📖 Reads (COGS) | 📖 Reads (analytics) |
| `useVendors` | ✍️ Writes (PO creation) | 📖 Reads (AP) | 📖 Reads (scorecard) |

**Conflict Resolution Protocol:**
1. Agent with ✍️ (Write) permission owns the hook
2. Other agents must coordinate before modifying
3. Use Git feature branches: `agent-a-sales-inventory`, `agent-b-financial`, `agent-c-reports`
4. Merge to `main` only after peer review from other agents

### Integration Testing (End of Day 3)

**Agent A + Agent B Integration:**
- [ ] Sales order creates journal entry automatically
- [ ] Purchase order creates AP entry
- [ ] Stock deduction triggers COGS entry

**Agent A + Agent C Integration:**
- [ ] Sales orders appear in analytics
- [ ] Inventory movements update dashboard
- [ ] POs tracked in vendor scorecard

**Agent B + Agent C Integration:**
- [ ] AR/AP aging in financial dashboard
- [ ] COGS appears in product profitability
- [ ] Payment data in revenue forecast

### Final Integration (Day 4 Morning - 2 hours)
- [ ] All three agents merge to `main`
- [ ] Full regression testing
- [ ] Performance testing with sample data
- [ ] UAT with stakeholder

---

## 📦 Deployment Strategy

### Feature Flags (Required)
```typescript
// .env or Supabase config
ENABLE_SALES_INVENTORY_INTEGRATION=false
ENABLE_AUTO_JOURNAL_ENTRIES=false
ENABLE_ADVANCED_REPORTS=false
```

### Migration Strategy
1. **Day 1 EOD**: Run all database migrations in staging
2. **Day 2 EOD**: Test migrations with production data snapshot
3. **Day 4**: Enable feature flags one by one
   - First: Agent C (reporting - read-only, safest)
   - Second: Agent A (sales-inventory)
   - Third: Agent B (financial - most critical)

### Rollback Plan
- Each agent maintains a `down` migration script
- Feature flags allow instant disable without code deploy
- Database backups before each flag enablement

---

## 🎯 Success Metrics

### Agent A
- Sales order → stock deduction in <2 seconds
- Zero race conditions in 100 concurrent orders
- 95% of low stock items have PO suggestions

### Agent B
- 100% of sales orders have corresponding journal entries
- All journal entries balanced (DR = CR)
- AR/AP aging accuracy: 100%

### Agent C
- Dashboard load time <3 seconds
- Report exports complete in <10 seconds
- Forecast accuracy: ±15% (measured after 1 month)

---

## 📋 Checklist Before Starting

- [ ] All agents read and understand this plan
- [ ] Git branches created: `agent-a-sales-inventory`, `agent-b-financial`, `agent-c-reports`
- [ ] Feature flags configured in environment
- [ ] Database backup created
- [ ] Staging environment ready
- [ ] Communication channel established (Slack/Discord)
- [ ] Code review assignments: A↔B, B↔C, C↔A (cross-review)

---

## 🚀 Let's Go!

**Agent A**: Start with Task 1.1 (database migrations)
**Agent B**: Start with Task 1.1 (database migrations)
**Agent C**: Start with Task 1.1 (database views)

**First sync point**: End of Day 1 (review database changes together)

Good luck! 🎉
