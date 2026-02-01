# 📱 Mobile Employee Workspace - مرجع المطورين

## 🎯 نظرة سريعة

هذا المستند يحتوي على جميع المعلومات التقنية التي تحتاجها لتطوير تطبيق مساحة عمل الموظف.

---

## 📂 هيكل المشروع

```
src/
├── pages/mobile/employee/              # صفحات التطبيق
│   ├── MobileEmployeeHome.tsx          # الرئيسية
│   ├── MobileCollections.tsx           # التحصيل الشهري
│   ├── MobileEmployeeContracts.tsx     # العقود
│   ├── MobileEmployeeTasks.tsx         # المهام
│   ├── MobileEmployeePerformance.tsx   # الأداء
│   └── MobileNotifications.tsx         # الإشعارات
│
├── components/mobile/employee/         # المكونات
│   ├── layout/                         # تخطيطات
│   │   ├── MobileEmployeeLayout.tsx
│   │   ├── MobileEmployeeHeader.tsx
│   │   ├── MobileBottomNav.tsx
│   │   └── MobileFAB.tsx
│   ├── cards/                          # بطاقات العرض
│   │   ├── MobileStatsCard.tsx
│   │   ├── MobileContractCard.tsx
│   │   ├── MobileTaskItem.tsx
│   │   ├── MobileCustomerCollectionCard.tsx
│   │   └── MobilePriorityAlert.tsx
│   ├── dialogs/                        # نوافذ منبثقة
│   │   ├── QuickPaymentModal.tsx
│   │   ├── CallLogModal.tsx
│   │   ├── ScheduleFollowupModal.tsx
│   │   ├── AddNoteModal.tsx
│   │   └── ContractDetailsModal.tsx
│   └── widgets/                        # ودجات
│       ├── PerformanceChart.tsx
│       ├── TasksTimeline.tsx
│       └── CollectionProgress.tsx
│
├── hooks/                              # Custom Hooks
│   ├── useEmployeeContracts.ts
│   ├── useEmployeeTasks.ts
│   ├── useEmployeePerformance.ts
│   ├── useEmployeeNotifications.ts
│   ├── useEmployeeStats.ts
│   └── useMonthlyCollections.ts        # ✅ موجود
│
└── types/                              # TypeScript Types
    └── mobile-employee.types.ts
```

---

## 🔧 TypeScript Types

### **EmployeeContract**
```typescript
interface EmployeeContract {
  id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  status: 'active' | 'expired' | 'cancelled' | 'suspended' | 'under_legal_procedure' | 'pending';
  start_date: string;
  end_date: string;
  monthly_amount: number;
  balance_due: number;
  total_paid: number;
  days_overdue: number | null;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  priority_reason?: 'overdue_payment' | 'expiring_soon' | 'high_balance';
  priority_reason_ar?: string;
  assigned_to_profile_id: string;
}
```

### **EmployeeTask**
```typescript
interface EmployeeTask {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  type: 'call' | 'followup' | 'visit' | 'payment' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string;
  scheduled_time?: string;
  completed_at?: string;
  contract_id?: string;
  customer_id?: string;
  customer_name?: string;
  assigned_to_profile_id: string;
  created_by: string;
  notes?: string;
}
```

### **EmployeePerformance**
```typescript
interface EmployeePerformance {
  profile_id: string;
  month: string;
  year: number;
  performance_score: number;
  collection_rate: number;
  followup_completion_rate: number;
  calls_logged: number;
  notes_added: number;
  tasks_completed: number;
  total_collected: number;
  target_amount: number;
  grade: 'excellent' | 'good' | 'average' | 'poor';
  grade_ar: string;
}
```

### **CustomerCollection**
```typescript
interface CustomerCollection {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  invoices: Invoice[];
}

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  contract_id: string;
  contract_number: string;
  amount: number;
  paid_amount: number;
  status: 'paid' | 'unpaid' | 'partially_paid' | 'overdue';
  due_date: string;
  payment_date?: string;
}
```

### **EmployeeStats**
```typescript
interface EmployeeStats {
  totalContracts: number;
  activeContracts: number;
  totalBalanceDue: number;
  todayTasks: number;
  completedTasks: number;
  completionRate: number;
  performanceScore: number;
  performanceGrade: string;
  monthlyTarget: number;
  monthlyCollected: number;
  collectionRate: number;
}
```

---

## 🎨 Design Tokens

### **Colors**
```typescript
export const colors = {
  // Primary
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',  // Main
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  
  // Secondary
  secondary: {
    500: '#8f51d2',  // Purple
  },
  
  // Status
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  
  // Backgrounds
  bg: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
  },
  
  // Text
  text: {
    primary: '#0f172a',
    secondary: '#64748b',
    tertiary: '#94a3b8',
  },
};
```

### **Typography**
```typescript
export const typography = {
  h1: 'text-2xl font-bold',
  h2: 'text-xl font-bold',
  h3: 'text-lg font-semibold',
  h4: 'text-base font-semibold',
  body: 'text-base',
  small: 'text-sm',
  tiny: 'text-xs',
};
```

### **Spacing**
```typescript
export const spacing = {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
};
```

### **Border Radius**
```typescript
export const borderRadius = {
  sm: '0.5rem',   // 8px
  md: '0.75rem',  // 12px
  lg: '1rem',     // 16px
  xl: '1.5rem',   // 24px
  '2xl': '2rem',  // 32px
  full: '9999px',
};
```

---

## 🎬 Animations

### **Page Transitions**
```typescript
export const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3 }
};
```

### **Card Animations**
```typescript
export const cardAnimation = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 }
};
```

### **FAB Animation**
```typescript
export const fabAnimation = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  whileTap: { scale: 0.9 },
  transition: { type: 'spring', stiffness: 200 }
};
```

### **Swipe Actions**
```typescript
export const swipeActions = {
  left: {
    x: -80,
    backgroundColor: colors.info,
    icon: Phone,
    label: 'اتصال'
  },
  right: {
    x: 80,
    backgroundColor: colors.success,
    icon: DollarSign,
    label: 'دفعة'
  }
};
```

---

## 🔌 API Hooks Usage

### **useEmployeeContracts**
```typescript
import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';

function MyComponent() {
  const {
    contracts,           // جميع العقود
    priorityContracts,   // العقود ذات الأولوية
    stats,               // إحصائيات العقود
    isLoading,
    refetch
  } = useEmployeeContracts();
  
  return (
    <div>
      <p>إجمالي العقود: {stats.totalContracts}</p>
      <p>العقود النشطة: {stats.activeContracts}</p>
      <p>المبالغ المستحقة: {stats.totalBalanceDue}</p>
    </div>
  );
}
```

### **useEmployeeTasks**
```typescript
import { useEmployeeTasks } from '@/hooks/useEmployeeTasks';

function MyComponent() {
  const {
    tasks,              // جميع المهام
    todayTasks,         // مهام اليوم
    stats,              // إحصائيات المهام
    isLoading,
    refetch,
    completeTask,       // إكمال مهمة
    deleteTask          // حذف مهمة
  } = useEmployeeTasks();
  
  return (
    <div>
      <p>مهام اليوم: {stats.todayTasks}</p>
      <p>نسبة الإنجاز: {stats.completionRate}%</p>
    </div>
  );
}
```

### **useEmployeePerformance**
```typescript
import { useEmployeePerformance } from '@/hooks/useEmployeePerformance';

function MyComponent() {
  const {
    performance,        // بيانات الأداء
    performanceGrade,   // التقدير
    isLoading,
    refetch
  } = useEmployeePerformance();
  
  return (
    <div>
      <p>نقاط الأداء: {performance?.performance_score}</p>
      <p>التقدير: {performanceGrade?.label_ar}</p>
      <p>نسبة التحصيل: {performance?.collection_rate}%</p>
    </div>
  );
}
```

### **useMonthlyCollections**
```typescript
import { useMonthlyCollections } from '@/hooks/useMonthlyCollections';

function MyComponent() {
  const {
    collections,        // قائمة الفواتير
    stats,              // إحصائيات التحصيل
    isLoading,
    refetch
  } = useMonthlyCollections();
  
  return (
    <div>
      <p>المستهدف: {stats.totalDue}</p>
      <p>تم التحصيل: {stats.totalCollected}</p>
      <p>المتبقي: {stats.totalPending}</p>
      <p>نسبة التحصيل: {stats.collectionRate}%</p>
    </div>
  );
}
```

---

## 📱 Component Examples

### **MobileStatsCard**
```tsx
<MobileStatsCard
  icon={FileText}
  label="إجمالي العقود"
  value={stats.totalContracts}
  subtitle={`${stats.activeContracts} عقد نشط`}
  color="from-blue-500 to-blue-600"
  onClick={() => navigate('/mobile/contracts')}
/>
```

### **MobileContractCard**
```tsx
<MobileContractCard
  contract={contract}
  onCall={() => handleCall(contract.customer_phone)}
  onPayment={() => handlePayment(contract.id)}
  onNote={() => handleNote(contract.id)}
  onSchedule={() => handleSchedule(contract.id)}
/>
```

### **MobileTaskItem**
```tsx
<MobileTaskItem
  task={task}
  onComplete={() => completeTask(task.id)}
  onEdit={() => editTask(task.id)}
/>
```

### **MobileCustomerCollectionCard**
```tsx
<MobileCustomerCollectionCard
  customer={customer}
  invoices={customer.invoices}
  onPayment={() => handlePayment(customer.customer_id)}
  onCall={() => handleCall(customer.customer_phone)}
  onExpand={() => toggleExpanded(customer.customer_id)}
/>
```

---

## 🎯 Bottom Navigation

```tsx
const tabs = [
  {
    id: 'home',
    icon: Home,
    label: 'الرئيسية',
    path: '/mobile/employee/home'
  },
  {
    id: 'collections',
    icon: DollarSign,
    label: 'التحصيل',
    path: '/mobile/employee/collections'
  },
  {
    id: 'contracts',
    icon: FileText,
    label: 'العقود',
    path: '/mobile/employee/contracts'
  },
  {
    id: 'tasks',
    icon: CheckCircle,
    label: 'المهام',
    path: '/mobile/employee/tasks'
  },
  {
    id: 'performance',
    icon: Star,
    label: 'الأداء',
    path: '/mobile/employee/performance'
  }
];
```

---

## 🚀 FAB Menu

```tsx
const fabActions = [
  {
    icon: Phone,
    label: 'تسجيل مكالمة',
    color: 'bg-blue-600',
    onClick: () => setShowCallDialog(true)
  },
  {
    icon: DollarSign,
    label: 'تسجيل دفعة',
    color: 'bg-emerald-600',
    onClick: () => setShowPaymentDialog(true)
  },
  {
    icon: Calendar,
    label: 'جدولة موعد',
    color: 'bg-purple-600',
    onClick: () => setShowFollowupDialog(true)
  },
  {
    icon: FileText,
    label: 'ملاحظة جديدة',
    color: 'bg-amber-600',
    onClick: () => setShowNoteDialog(true)
  }
];
```

---

## 🎨 Status Badges

### **Contract Status**
```typescript
const getContractStatusStyle = (status: string) => {
  const styles = {
    active: {
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: PlayCircle,
      label: 'نشط'
    },
    expired: {
      badge: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
      label: 'منتهي'
    },
    cancelled: {
      badge: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: XCircle,
      label: 'ملغي'
    },
    suspended: {
      badge: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: PauseCircle,
      label: 'موقوف'
    },
    under_legal_procedure: {
      badge: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Scale,
      label: 'تحت الإجراء القانوني'
    }
  };
  
  return styles[status] || styles.active;
};
```

### **Task Status**
```typescript
const getTaskStatusStyle = (status: string) => {
  const styles = {
    pending: {
      badge: 'bg-amber-100 text-amber-700',
      icon: Clock,
      label: 'قيد الانتظار'
    },
    in_progress: {
      badge: 'bg-blue-100 text-blue-700',
      icon: PlayCircle,
      label: 'قيد التنفيذ'
    },
    completed: {
      badge: 'bg-emerald-100 text-emerald-700',
      icon: CheckCircle,
      label: 'مكتمل'
    },
    cancelled: {
      badge: 'bg-gray-100 text-gray-700',
      icon: XCircle,
      label: 'ملغي'
    }
  };
  
  return styles[status] || styles.pending;
};
```

---

## 🔔 Notifications

### **Notification Types**
```typescript
type NotificationType = 
  | 'payment_received'
  | 'contract_expiring'
  | 'task_completed'
  | 'followup_reminder'
  | 'overdue_payment'
  | 'new_task_assigned';

const getNotificationStyle = (type: NotificationType) => {
  const styles = {
    payment_received: {
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    contract_expiring: {
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    task_completed: {
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    followup_reminder: {
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    overdue_payment: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50'
    },
    new_task_assigned: {
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    }
  };
  
  return styles[type];
};
```

---

## 📊 Charts & Visualizations

### **Performance Chart**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={200}>
  <LineChart data={performanceData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Line 
      type="monotone" 
      dataKey="score" 
      stroke="#14b8a6" 
      strokeWidth={2}
    />
  </LineChart>
</ResponsiveContainer>
```

### **Collection Progress**
```tsx
<div className="relative">
  <Progress value={collectionRate} className="h-3" />
  <span className="absolute right-0 top-0 text-xs font-bold">
    {collectionRate}%
  </span>
</div>
```

---

## 🔒 Authentication

### **Check if Employee**
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, profile } = useAuth();
  
  // التحقق من أن المستخدم موظف
  const isEmployee = profile?.role === 'employee';
  
  if (!isEmployee) {
    return <Navigate to="/dashboard" />;
  }
  
  return <div>محتوى الموظف</div>;
}
```

---

## 🎯 Best Practices

### **1. استخدام React Query**
```typescript
// ✅ جيد
const { data, isLoading } = useQuery({
  queryKey: ['contracts', profileId],
  queryFn: fetchContracts,
  staleTime: 5 * 60 * 1000, // 5 دقائق
});

// ❌ سيء
const [data, setData] = useState([]);
useEffect(() => {
  fetchContracts().then(setData);
}, []);
```

### **2. استخدام Framer Motion**
```typescript
// ✅ جيد
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
  محتوى
</motion.div>

// ❌ سيء
<div className="fade-in">
  محتوى
</div>
```

### **3. استخدام TypeScript**
```typescript
// ✅ جيد
interface Props {
  contract: EmployeeContract;
  onAction: (id: string) => void;
}

// ❌ سيء
function MyComponent(props: any) {
  // ...
}
```

### **4. Error Handling**
```typescript
// ✅ جيد
try {
  await savePayment(data);
  toast.success('تم حفظ الدفعة بنجاح');
} catch (error) {
  console.error('Error:', error);
  toast.error('فشل حفظ الدفعة');
}

// ❌ سيء
await savePayment(data);
```

---

## 🐛 Debugging

### **Console Logs**
```typescript
// Development only
if (process.env.NODE_ENV === 'development') {
  console.log('[MobileEmployeeHome] Stats:', stats);
}
```

### **React Query DevTools**
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

---

## 📚 Resources

### **Documentation:**
- [React Query Docs](https://tanstack.com/query/latest)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI Docs](https://www.radix-ui.com/docs)

### **Icons:**
- [Lucide React](https://lucide.dev/)

### **Date Handling:**
- [date-fns](https://date-fns.org/)

---

## 🚀 Quick Start

```bash
# 1. إنشاء الـ Types
touch src/types/mobile-employee.types.ts

# 2. إنشاء الـ Hooks
touch src/hooks/useEmployeeContracts.ts
touch src/hooks/useEmployeeTasks.ts
touch src/hooks/useEmployeePerformance.ts

# 3. إنشاء المكونات
mkdir -p src/components/mobile/employee/{layout,cards,dialogs,widgets}

# 4. إنشاء الصفحات
mkdir -p src/pages/mobile/employee

# 5. البدء بالتطوير
npm run dev
```

---

## 📞 الدعم

إذا واجهت أي مشاكل، راجع:
1. `MOBILE_APP_TRANSFORMATION_PLAN.md` - الخطة الكاملة
2. `tasks/mobile-employee-workspace-transformation.md` - TODO List
3. `MOBILE_TRANSFORMATION_SUMMARY.md` - الملخص

**Happy Coding! 🚀**
