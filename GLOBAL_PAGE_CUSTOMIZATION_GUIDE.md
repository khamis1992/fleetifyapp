# 🌍 Global Page Customization System - Implementation Guide

**Date**: 2025-10-27  
**Feature**: Enable Dashboard Customization on All Pages  
**Status**: ✅ READY FOR INTEGRATION  

---

## 📋 Overview

The **Global Page Customization System** allows any page in your application to have drag-and-drop widget rearrangement, show/hide controls, and persistent layout saving per user.

### Key Features
- ✅ Works on ANY page in the app
- ✅ Independent layouts per page per user
- ✅ Drag-and-drop widget rearrangement
- ✅ Show/hide widget visibility
- ✅ Save layout to Supabase
- ✅ Reset to default option
- ✅ Multi-tenant support (company isolation)

---

## 🛠️ Implementation Steps

### Step 1: Import PageCustomizer

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
```

### Step 2: Wrap Your Page

Replace your page structure like this:

**BEFORE**:
```typescript
export default function Contracts() {
  return (
    <ResponsiveContainer className="space-y-4">
      <h1 className="text-3xl font-bold">Contracts</h1>
      <ContractsContent />
    </ResponsiveContainer>
  )
}
```

**AFTER**:
```typescript
import { PageCustomizer } from '@/components/PageCustomizer'

export default function Contracts() {
  return (
    <PageCustomizer
      pageId="contracts"
      title="Contracts"
      titleAr="العقود"
    >
      <ContractsContent />
    </PageCustomizer>
  )
}
```

### Step 3: Define Page Widgets (Optional)

If you want customizable widgets on a page, define them:

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'

const contractsWidgets: DashboardWidget[] = [
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
    id: 'pending-contracts',
    title: 'Pending Contracts',
    titleAr: 'العقود المعلقة',
    component: PendingContractsWidget,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
]

export default function Contracts() {
  return (
    <PageCustomizer
      pageId="contracts"
      title="Contracts"
      titleAr="العقود"
      widgets={contractsWidgets}
    >
      <ContractsContent />
    </PageCustomizer>
  )
}
```

---

## 📊 Pages Ready for Customization

Here's a list of pages that can be customized with suggested `pageId` values:

### Main Pages

| Page | File | pageId | Suggested Widgets |
|------|------|--------|-------------------|
| Dashboard | `src/pages/Dashboard.tsx` | `main-dashboard` | Stats, charts, quick actions |
| Contracts | `src/pages/Contracts.tsx` | `contracts-page` | Active, pending, expired contracts |
| Finance | `src/pages/Finance.tsx` | `finance-page` | Revenue, expenses, cash flow |
| Fleet | `src/pages/Fleet.tsx` | `fleet-page` | Vehicles, maintenance, availability |
| Customers | `src/pages/Customers.tsx` | `customers-page` | Top customers, new, inactive |
| Collections | `src/pages/Collections.tsx` | `collections-page` | AR aging, pending payments, reminders |
| Invoices | `src/pages/finance/Invoices.tsx` | `invoices-page` | Pending, approved, overdue, paid |
| Reports | `src/pages/Reports.tsx` | `reports-page` | Revenue reports, expense reports |
| Quotations | `src/pages/Quotations.tsx` | `quotations-page` | Pending, approved, converted |
| Inventory | `src/pages/Inventory.tsx` | `inventory-page` | Stock levels, low stock, movements |
| Properties | `src/pages/Properties.tsx` | `properties-page` | Occupied, vacant, maintenance needed |
| HR/Employees | `src/pages/hr/Employees.tsx` | `employees-page` | Active, on leave, department stats |

### Fleet Sub-pages

| Page | File | pageId |
|------|------|--------|
| Maintenance | `src/pages/fleet/Maintenance.tsx` | `maintenance-page` |
| Traffic Violations | `src/pages/fleet/TrafficViolations.tsx` | `violations-page` |
| Dispatch Permits | `src/pages/fleet/DispatchPermits.tsx` | `dispatch-page` |
| Reservations | `src/pages/fleet/ReservationSystem.tsx` | `reservations-page` |

---

## 🎯 Step-by-Step Integration Plan

### Phase 1: Critical Pages (Week 1)
- [ ] Dashboard.tsx
- [ ] Contracts.tsx
- [ ] Finance.tsx
- [ ] Collections.tsx

### Phase 2: Important Pages (Week 2)
- [ ] Invoices.tsx
- [ ] Customers.tsx
- [ ] Fleet.tsx
- [ ] Reports.tsx

### Phase 3: Secondary Pages (Week 3)
- [ ] Quotations.tsx
- [ ] Inventory.tsx
- [ ] Properties.tsx
- [ ] HR pages

---

## 📝 Example Integration

### Example 1: Dashboard Page

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'
import { StatsWidget } from '@/components/dashboard/example-widgets/StatsWidget'

// ... other imports ...

const dashboardWidgets: DashboardWidget[] = [
  {
    id: 'total-revenue',
    title: 'Total Revenue',
    titleAr: 'إجمالي الإيرادات',
    component: () => <StatsWidget title="Total Revenue" value="$125,450" />,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  {
    id: 'active-contracts',
    title: 'Active Contracts',
    titleAr: 'العقود النشطة',
    component: () => <StatsWidget title="Active Contracts" value="45" />,
    defaultVisible: true,
    defaultSize: 'medium',
    category: 'stats',
  },
  // ... more widgets ...
]

export default function Dashboard() {
  return (
    <PageCustomizer
      pageId="main-dashboard"
      title="Dashboard"
      titleAr="لوحة التحكم"
      widgets={dashboardWidgets}
    >
      {/* Optional: Keep existing dashboard content as fallback */}
      <ExistingDashboardContent />
    </PageCustomizer>
  )
}
```

### Example 2: Collections Page

```typescript
import { PageCustomizer } from '@/components/PageCustomizer'
import { Collections } from '@/pages/Collections' // existing component

export default function CollectionsPage() {
  return (
    <PageCustomizer
      pageId="collections-page"
      title="Collections Management"
      titleAr="إدارة التحصيل"
    >
      <Collections />
    </PageCustomizer>
  )
}
```

---

## 🎨 Creating Custom Widgets for Pages

### Widget Template

```typescript
// src/components/widgets/ContractsWidget.tsx

import { DashboardWidget } from '@/components/dashboard/CustomizableDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ActiveContractsWidget() {
  // Your widget logic here
  const activeCount = 45 // Replace with actual data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{activeCount}</div>
        <p className="text-xs text-muted-foreground mt-2">
          Currently in use
        </p>
      </CardContent>
    </Card>
  )
}

export const activeContractsWidgetConfig: DashboardWidget = {
  id: 'active-contracts',
  title: 'Active Contracts',
  titleAr: 'العقود النشطة',
  component: ActiveContractsWidget,
  defaultVisible: true,
  defaultSize: 'medium',
  category: 'stats',
}
```

### Using the Widget

```typescript
import { activeContractsWidgetConfig } from '@/components/widgets/ContractsWidget'

const contractsWidgets: DashboardWidget[] = [
  activeContractsWidgetConfig,
  // ... more widgets ...
]
```

---

## 🔄 Data Flow

```
User Visits Page
    ↓
PageCustomizer loads with pageId
    ↓
CustomizableDashboard fetches saved layout from Supabase
    ↓
Load user_dashboard_layouts table
    WHERE user_id = current_user
    AND company_id = current_company
    AND dashboard_id = pageId
    ↓
Apply saved layout (visibility, order, sizes)
    ↓
Display customized page
    ↓
User drags, shows/hides, or resets
    ↓
Save to Supabase user_dashboard_layouts
    ↓
Next visit: Load saved layout automatically
```

---

## 🔐 Security & Multi-Tenancy

✅ **Row-Level Security (RLS)** enforced
- Users only see/modify own layouts
- Company isolation via company_id
- Dashboard isolation via dashboard_id

✅ **Database**: `user_dashboard_layouts` table
- Multi-tenant support
- Unique constraint per user/company/dashboard
- Cascade deletion

---

## 📱 Responsive Behavior

- **Mobile (< 640px)**: 1 column, full-width widgets
- **Tablet (640-1024px)**: 2 columns
- **Desktop (> 1024px)**: 4 columns max
- **All sizes responsive**: Widgets adapt to screen size

---

## 🚀 Deployment Checklist

### Before Integration
- [ ] Database migration applied: `20251027_create_user_dashboard_layouts.sql`
- [ ] Supabase RLS policies verified
- [ ] @dnd-kit packages installed

### Integration Steps
- [ ] Create PageCustomizer wrapper
- [ ] Import on target pages
- [ ] Define widgets for pages
- [ ] Test on development
- [ ] Test on staging
- [ ] Deploy to production

### Post-Integration
- [ ] Monitor Supabase logs
- [ ] Collect user feedback
- [ ] Track usage analytics
- [ ] Optimize widget performance

---

## 🐛 Troubleshooting

### Issue: Layout Not Saving

**Check**:
1. Is Supabase connection working?
2. Are RLS policies active?
3. Is user authenticated?
4. Check browser console for errors

### Issue: Widgets Not Appearing

**Check**:
1. Are widgets defined in array?
2. Is `defaultVisible` set to `true`?
3. Are widget components rendering?
4. Check component for errors

### Issue: Drag Not Working

**Check**:
1. Is edit mode enabled?
2. Are @dnd-kit packages installed?
3. Is drag handle visible?
4. Try different browser

---

## 📈 Performance Considerations

✅ **Optimizations**:
- Lazy load page content
- Cache layouts with React Query
- Minimal re-renders with proper keys
- JSONB storage for flexible queries
- Indexes on frequent queries

⚠️ **Monitor**:
- Database query performance
- Layout save latency
- Page load time
- Memory usage with many widgets

---

## 🔮 Future Enhancements

### Phase 2 (Optional)
- [ ] Widget resizing (drag corners)
- [ ] Widget templates per role
- [ ] Share layouts with team
- [ ] Widget refresh intervals
- [ ] Widget data caching

### Phase 3 (Optional)
- [ ] Export/import layouts
- [ ] Preset layouts
- [ ] Multi-dashboard tabs
- [ ] Analytics on widget usage
- [ ] A/B test layouts

---

## 📞 Support

### Documentation
- `DASHBOARD_CUSTOMIZATION_GUIDE.md` - Full customization guide
- `DASHBOARD_QUICK_START.md` - Quick reference
- `PageCustomizer.tsx` - Component comments

### Questions?
Check:
1. This guide
2. Component documentation
3. Database schema
4. Example implementations

---

## ✅ Summary

**What You Get**:
- ✅ Customizable layouts on ANY page
- ✅ Per-user, per-page persistence
- ✅ Drag-and-drop rearrangement
- ✅ Show/hide widget visibility
- ✅ Reset to default option
- ✅ Mobile responsive
- ✅ Multi-tenant secure

**Time to Integration**: 30 minutes per page
**Total Setup Time**: 2-3 hours for all pages
**Maintenance**: Low (reusable component)

---

**Ready to customize ALL your pages!** 🚀

*Last updated: 2025-10-27*
