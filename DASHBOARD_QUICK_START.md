# 🎨 Dashboard Customization - Quick Start

## ⚡ 5-Minute Setup

### 1️⃣ Install Dependencies (30 seconds)

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2️⃣ Apply Database Migration (1 minute)

Run in Supabase Dashboard SQL Editor:

```sql
-- Copy contents from:
-- supabase/migrations/20251027_create_user_dashboard_layouts.sql
```

Or via CLI:
```bash
supabase migration up 20251027_create_user_dashboard_layouts
```

### 3️⃣ Import Component (30 seconds)

```typescript
import { CustomizableDashboard, DashboardWidget } from '@/components/dashboard'
```

### 4️⃣ Define Widgets (2 minutes)

```typescript
import { Car, Users, DollarSign } from 'lucide-react'
import { StatsWidget } from '@/components/dashboard'

// Create your widget components
function TotalVehiclesWidget() {
  return <StatsWidget title="Total Vehicles" value="125" icon={Car} />
}

function TotalCustomersWidget() {
  return <StatsWidget title="Total Customers" value="450" icon={Users} />
}

// Define widget configuration
const widgets: DashboardWidget[] = [
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
    id: 'total-customers',
    title: 'Total Customers',
    titleAr: 'إجمالي العملاء',
    component: TotalCustomersWidget,
    defaultVisible: true,
    defaultSize: 'small',
    category: 'stats',
  },
]
```

### 5️⃣ Render Dashboard (1 minute)

```typescript
export default function MyDashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>
      
      <CustomizableDashboard
        widgets={widgets}
        dashboardId="my-dashboard"
      />
    </div>
  )
}
```

---

## 🎯 What You Get

✅ **Drag-and-Drop**: Rearrange widgets by dragging  
✅ **Show/Hide**: Toggle widget visibility  
✅ **Auto-Save**: Layouts persist per user  
✅ **Reset**: One-click restore to defaults  
✅ **Responsive**: Works on mobile, tablet, desktop  

---

## 📱 User Controls

| Button | Action |
|--------|--------|
| **تخصيص** (Customize) | Enter edit mode |
| **إدارة العناصر** (Manage Widgets) | Show/hide widgets |
| **حفظ التخطيط** (Save Layout) | Save current layout |
| **إعادة الافتراضي** (Reset) | Restore defaults |

---

## 🎨 Widget Sizes

```typescript
defaultSize: 'small'  // 1 column
defaultSize: 'medium' // 2 columns (tablet+)
defaultSize: 'large'  // 3 columns (desktop)
defaultSize: 'full'   // 4 columns (full width)
```

---

## 🔧 Widget Categories

```typescript
category: 'stats'   // KPIs and statistics
category: 'charts'  // Graphs and visualizations
category: 'lists'   // Data tables and lists
category: 'actions' // Quick action buttons
```

---

## 🚀 Example Demo

Try the demo page:

```typescript
// src/pages/CustomDashboardDemo.tsx already created!
import CustomDashboardDemo from '@/pages/CustomDashboardDemo'
```

Navigate to `/custom-dashboard-demo` to see it in action.

---

## 📦 Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `CustomizableDashboard.tsx` | Main component | 487 |
| `20251027_create_user_dashboard_layouts.sql` | Database schema | 46 |
| `StatsWidget.tsx` | Example widget | 37 |
| `CustomDashboardDemo.tsx` | Demo page | 251 |
| `index.ts` | Export file | 4 |

---

## 🔐 Security Built-In

- ✅ Row-Level Security (RLS) enabled
- ✅ Multi-tenant isolation (company_id)
- ✅ User-specific layouts (user_id)
- ✅ Secure JSONB storage

---

## 📚 Full Documentation

See `DASHBOARD_CUSTOMIZATION_GUIDE.md` for:
- Complete implementation guide
- Architecture details
- Troubleshooting
- Best practices
- Advanced features

---

## ✅ Verification Checklist

After setup:

- [ ] Dependencies installed
- [ ] Database table created
- [ ] RLS policies active
- [ ] Can see dashboard
- [ ] Drag-and-drop works
- [ ] Layout persists after reload
- [ ] Reset button works

---

## 🐛 Quick Troubleshooting

**Widgets not saving?**
→ Check Supabase connection and RLS policies

**Can't drag widgets?**
→ Make sure you're in edit mode (click "تخصيص")

**Layout not loading?**
→ Verify user is authenticated

**Empty state showing?**
→ Check widget `defaultVisible: true`

---

## 💡 Pro Tips

1. **Use unique `dashboardId`** for each dashboard page
2. **Group related widgets** in same category
3. **Start with fewer widgets** (5-10) for best UX
4. **Test on mobile** to ensure responsive layout
5. **Create reusable widgets** for common patterns

---

**Need Help?** Check the full guide or contact support.

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2025-10-27
