# 🌍 Global Page Customization - Quick Integration Examples

## Example 1: Dashboard.tsx Integration

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'

// ... other imports ...

// Define dashboard widgets
const dashboardWidgets: DashboardWidget[] = [
  {
    id: 'revenue-stats',
    title: 'Total Revenue',
    titleAr: 'إجمالي الإيرادات',
    component: RevenueStatsWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'active-contracts',
    title: 'Active Contracts',
    titleAr: 'العقود النشطة',
    component: ActiveContractsWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'pending-invoices',
    title: 'Pending Invoices',
    titleAr: 'الفواتير المعلقة',
    component: PendingInvoicesWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'vehicle-utilization',
    title: 'Vehicle Utilization',
    titleAr: 'استخدام المركبات',
    component: VehicleUtilizationWidget,
    defaultVisible: true,
    defaultSize: 'large',
    category: 'charts',
  },
]

export default function Dashboard() {
  return (
    <PageCustomizer
      pageId="main-dashboard"
      title="Dashboard"
      titleAr="لوحة التحكم"
      widgets={dashboardWidgets}
    >
      {/* Your existing dashboard content */}
      <DashboardContent />
    </PageCustomizer>
  )
}
```

---

## Example 2: Contracts.tsx Integration

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'

const contractsWidgets: DashboardWidget[] = [
  {
    id: 'contract-count-stats',
    title: 'Total Contracts',
    titleAr: 'إجمالي العقود',
    component: () => <ContractCountStatsWidget />,
    defaultVisible: true,
    defaultSize: 'small',
    category: 'stats',
  },
  {
    id: 'revenue-by-contract',
    title: 'Revenue by Contract',
    titleAr: 'الإيرادات حسب العقد',
    component: () => <RevenueChartWidget />,
    defaultVisible: true,
    defaultSize: 'large',
    category: 'charts',
  },
  {
    id: 'contract-status-summary',
    title: 'Contract Status',
    titleAr: 'حالة العقود',
    component: () => <ContractStatusWidget />,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
]

export default function Contracts() {
  return (
    <PageCustomizer
      pageId="contracts-page"
      title="Contracts"
      titleAr="العقود"
      widgets={contractsWidgets}
    >
      <ContractsPageContent />
    </PageCustomizer>
  )
}
```

---

## Example 3: Finance.tsx Integration

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'

const financeWidgets: DashboardWidget[] = [
  {
    id: 'total-revenue',
    title: 'Total Revenue',
    titleAr: 'إجمالي الإيرادات',
    component: TotalRevenueWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'total-expenses',
    title: 'Total Expenses',
    titleAr: 'إجمالي النفقات',
    component: TotalExpensesWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'net-income',
    title: 'Net Income',
    titleAr: 'الربح الصافي',
    component: NetIncomeWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'cash-flow-chart',
    title: 'Cash Flow',
    titleAr: 'تدفق النقد',
    component: CashFlowChartWidget,
    defaultVisible: true,
    defaultSize: 'large',
    category: 'charts',
  },
  {
    id: 'income-statement',
    title: 'Income Statement',
    titleAr: 'بيان الدخل',
    component: IncomeStatementWidget,
    defaultVisible: true,
    defaultSize: 'full',
    category: 'lists',
  },
]

export default function Finance() {
  return (
    <PageCustomizer
      pageId="finance-page"
      title="Finance Management"
      titleAr="إدارة المالية"
      widgets={financeWidgets}
    >
      <FinanceContent />
    </PageCustomizer>
  )
}
```

---

## Example 4: Collections.tsx Integration

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'

const collectionsWidgets: DashboardWidget[] = [
  {
    id: 'total-outstanding',
    title: 'Outstanding Amount',
    titleAr: 'المبالغ المستحقة',
    component: OutstandingAmountWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'collection-rate',
    title: 'Collection Rate',
    titleAr: 'معدل التحصيل',
    component: CollectionRateWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'overdue-invoices',
    title: 'Overdue Invoices',
    titleAr: 'الفواتير المتأخرة',
    component: OverdueInvoicesWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'ar-aging-summary',
    title: 'AR Aging Summary',
    titleAr: 'ملخص أعمار الذمم',
    component: ARAgingSummaryWidget,
    defaultVisible: true,
    defaultSize: 'large',
    category: 'charts',
  },
]

export default function Collections() {
  return (
    <PageCustomizer
      pageId="collections-page"
      title="Collections"
      titleAr="التحصيل"
      widgets={collectionsWidgets}
    >
      <CollectionsContent />
    </PageCustomizer>
  )
}
```

---

## Example 5: Customers.tsx Integration

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'

const customersWidgets: DashboardWidget[] = [
  {
    id: 'total-customers',
    title: 'Total Customers',
    titleAr: 'إجمالي العملاء',
    component: TotalCustomersWidget,
    defaultVisible: true,
    defaultSize: 'small',
    category: 'stats',
  },
  {
    id: 'active-customers',
    title: 'Active Customers',
    titleAr: 'العملاء النشطين',
    component: ActiveCustomersWidget,
    defaultVisible: true,
    defaultSize: 'small',
    category: 'stats',
  },
  {
    id: 'new-customers',
    title: 'New Customers This Month',
    titleAr: 'عملاء جدد هذا الشهر',
    component: NewCustomersWidget,
    defaultVisible: true,
    defaultSize: 'small',
    category: 'stats',
  },
  {
    id: 'customer-growth-chart',
    title: 'Customer Growth',
    titleAr: 'نمو العملاء',
    component: CustomerGrowthChartWidget,
    defaultVisible: true,
    defaultSize: 'large',
    category: 'charts',
  },
]

export default function Customers() {
  return (
    <PageCustomizer
      pageId="customers-page"
      title="Customers"
      titleAr="العملاء"
      widgets={customersWidgets}
    >
      <CustomersContent />
    </PageCustomizer>
  )
}
```

---

## Example 6: Fleet.tsx Integration

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'

const fleetWidgets: DashboardWidget[] = [
  {
    id: 'total-vehicles',
    title: 'Total Vehicles',
    titleAr: 'إجمالي المركبات',
    component: TotalVehiclesWidget,
    defaultVisible: true,
    defaultSize: 'small',
    category: 'stats',
  },
  {
    id: 'available-vehicles',
    title: 'Available Vehicles',
    titleAr: 'المركبات المتاحة',
    component: AvailableVehiclesWidget,
    defaultVisible: true,
    defaultSize: 'small',
    category: 'stats',
  },
  {
    id: 'maintenance-due',
    title: 'Maintenance Due',
    titleAr: 'الصيانة المستحقة',
    component: MaintenanceDueWidget,
    defaultVisible: true,
    defaultSize: 'small',
    category: 'stats',
  },
  {
    id: 'vehicle-utilization',
    title: 'Utilization Rate',
    titleAr: 'معدل الاستخدام',
    component: UtilizationChartWidget,
    defaultVisible: true,
    defaultSize: 'large',
    category: 'charts',
  },
  {
    id: 'maintenance-schedule',
    title: 'Maintenance Schedule',
    titleAr: 'جدول الصيانة',
    component: MaintenanceScheduleWidget,
    defaultVisible: true,
    defaultSize: 'full',
    category: 'lists',
  },
]

export default function Fleet() {
  return (
    <PageCustomizer
      pageId="fleet-page"
      title="Fleet Management"
      titleAr="إدارة الأسطول"
      widgets={fleetWidgets}
    >
      <FleetContent />
    </PageCustomizer>
  )
}
```

---

## Integration Checklist

### For Each Page You Want to Customize

- [ ] Import PageCustomizer
- [ ] Import DashboardWidget type
- [ ] Define widgets array for page
- [ ] Choose appropriate `pageId`
- [ ] Wrap page content with PageCustomizer
- [ ] Test drag-and-drop
- [ ] Test show/hide
- [ ] Test layout persistence
- [ ] Test on mobile
- [ ] Test with multiple users
- [ ] Deploy to production

---

## Widget Types by Page

### Stats Widgets (Single Metric)
- Total counts (vehicles, customers, contracts)
- Current amounts (revenue, expenses, outstanding)
- Percentages (utilization, completion, collection rate)

### Chart Widgets (Visualizations)
- Revenue trends
- Collection trends
- Utilization rates
- Customer growth
- Cash flow charts

### List Widgets (Data Tables)
- Pending items
- Recent activities
- Active records
- Detailed breakdowns

### Action Widgets (Quick Actions)
- Create new button
- Quick upload
- Bulk actions
- Fast filters

---

## Performance Tips

1. **Lazy load heavy widgets**
   ```typescript
   const HeavyChart = lazy(() => import('./HeavyChart'))
   ```

2. **Cache widget data**
   ```typescript
   const { data } = useQuery({
     queryKey: ['widget-data'],
     staleTime: 5 * 60 * 1000, // 5 minutes
   })
   ```

3. **Use React.memo for static widgets**
   ```typescript
   const StaticWidget = React.memo(() => <div>...</div>)
   ```

---

**Ready to customize all pages!** 🚀
