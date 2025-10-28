# CustomerDetailsPage Component

## نظرة عامة

مكون صفحة تفاصيل العميل - صفحة شاملة لعرض جميع معلومات وبيانات العميل في FleetifyApp.

## الميزات الرئيسية

### 1. رأس الصفحة (Header)
- شريط تنقل ثابت في الأعلى
- زر الرجوع للصفحة السابقة
- إشعارات وإعدادات
- صورة رمزية للمستخدم الحالي

### 2. بطاقة معلومات العميل (Customer Header Card)
- صورة رمزية للعميل (Avatar) مع الأحرف الأولى من الاسم
- اسم العميل وحالته (نشط/غير نشط)
- نوع العميل (مميز/عادي)
- معلومات أساسية:
  - رقم العميل
  - تاريخ التسجيل
  - آخر نشاط
- أزرار الإجراءات:
  - تعديل البيانات
  - إنشاء تقرير
  - أرشفة العميل
  - حذف العميل

### 3. الملخص السريع (Quick Stats)
بطاقات ملونة تعرض إحصائيات سريعة:
- عدد العقود النشطة (أزرق)
- المبلغ المستحق (برتقالي)
- نسبة الالتزام مع شريط تقدم (أخضر)
- إجمالي المدفوعات (بنفسجي)

### 4. المعلومات الشخصية (Personal Information)
معلومات مفصلة مع أيقونات ملونة:
- البريد الإلكتروني
- رقم الجوال
- العنوان
- تاريخ الميلاد
- رقم الهوية الوطنية
- نوع العميل

### 5. نظام التبويبات (Tabs System)
خمسة تبويبات رئيسية:

#### العقود النشطة (Contracts)
- عرض جميع العقود في بطاقات منفصلة
- معلومات كل عقد:
  - اسم المركبة
  - رقم العقد
  - تاريخ البدء والانتهاء
  - المبلغ الشهري
  - الأيام المتبقية (بألوان تحذيرية)
  - حالة الدفع
- أزرار لعرض التفاصيل وتجديد العقد
- زر لإضافة عقد جديد

#### المدفوعات (Payments)
- جدول شامل بجميع المدفوعات
- أعمدة:
  - رقم الدفعة
  - التاريخ
  - رقم العقد
  - المبلغ
  - طريقة الدفع
  - الحالة
  - الإجراءات
- زر لتسجيل دفعة جديدة

#### السيارات (Vehicles)
- قائمة بالسيارات المؤجرة للعميل

#### المستندات (Documents)
- إدارة المستندات والملفات

#### سجل النشاط (Activity)
- سجل بجميع أنشطة العميل

### 6. الإحصائيات والرسوم البيانية (Statistics)
ثلاث بطاقات إحصائية:
- رسم بياني للمدفوعات الشهرية (أعمدة)
- مخطط دائري لحالة العقود
- نسبة الالتزام مع تقييم

## الاستخدام

### الاستيراد

```typescript
import { CustomerDetailsPage } from '@/components/customers';
```

### في React Router

```typescript
import { Routes, Route } from 'react-router-dom';
import { CustomerDetailsPage } from '@/components/customers';

function App() {
  return (
    <Routes>
      <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
    </Routes>
  );
}
```

### مثال على الاستخدام المباشر

```typescript
import { CustomerDetailsPage } from '@/components/customers';

function MyComponent() {
  return <CustomerDetailsPage />;
}
```

## أنواع البيانات (Types)

### CustomerInfo
```typescript
interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  nationalId: string;
  customerType: string;
  status: 'active' | 'inactive' | 'pending';
  registrationDate: string;
  lastActivity: string;
  avatar?: string;
}
```

### Contract
```typescript
interface Contract {
  id: string;
  vehicleName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  status: 'active' | 'pending' | 'expired';
  paymentStatus: 'paid' | 'pending' | 'overdue';
  daysRemaining: number;
}
```

### Payment
```typescript
interface Payment {
  id: string;
  paymentNumber: string;
  date: string;
  contractNumber: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'failed';
}
```

### CustomerStats
```typescript
interface CustomerStats {
  activeContracts: number;
  outstandingAmount: number;
  commitmentRate: number;
  totalPayments: number;
}
```

## المكونات الفرعية

### InfoItem
عرض عنصر معلومات مع أيقونة:
```typescript
interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
  mono?: boolean;
  dir?: 'ltr' | 'rtl';
}
```

### ContractCard
بطاقة عرض العقد:
```typescript
interface ContractCardProps {
  contract: Contract;
  index: number;
}
```

### PaymentsTable
جدول المدفوعات:
```typescript
interface PaymentsTableProps {
  payments: Payment[];
}
```

### StatCard
بطاقة إحصائية:
```typescript
interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  color: 'blue' | 'green' | 'purple';
  percentage?: number;
  value?: number;
}
```

## التخصيص

### الألوان

المكون يستخدم نظام ألوان متسق:
- **الأساسي (Primary):** أزرق (#3b82f6)
- **النجاح (Success):** أخضر (#10b981)
- **التحذير (Warning):** أصفر/برتقالي (#f59e0b)
- **الخطر (Danger):** أحمر (#ef4444)
- **محايد (Neutral):** رمادي (#6b7280)

### الحركات (Animations)

المكون يتضمن حركات سلسة:
- `animate-in fade-in-50 duration-400`: ظهور تدريجي للبطاقات
- `animate-in fade-in-50 duration-600`: ظهور تدريجي للتبويبات
- `transition-all hover:shadow-lg`: تأثيرات عند التمرير
- `animate-pulse`: نبض للإشعارات

### التجاوب (Responsive)

المكون متجاوب بالكامل:
- **Mobile:** عمود واحد
- **Tablet (md):** عمودين
- **Desktop (lg):** شبكة 12 عمود

## الدوال المساعدة

### getStatusColor
```typescript
const getStatusColor = (status: string): string
```
تعيد لون CSS للحالة المحددة.

### getDaysRemainingColor
```typescript
const getDaysRemainingColor = (days: number): string
```
تعيد لون تحذيري بناءً على الأيام المتبقية.

### getInitials
```typescript
const getInitials = (name: string): string
```
تستخرج الأحرف الأولى من الاسم للصورة الرمزية.

## معالجات الأحداث

- `handleBack`: الرجوع للصفحة السابقة
- `handleEdit`: فتح نموذج التعديل
- `handleDelete`: حذف العميل
- `handleArchive`: أرشفة العميل
- `handleGenerateReport`: إنشاء تقرير

## التكامل مع API

حالياً يستخدم بيانات وهمية للعرض التجريبي. للتكامل مع API:

```typescript
// استبدل useMemo بـ useQuery أو useEffect
const { data: customerData, isLoading } = useQuery(
  ['customer', customerId],
  () => fetchCustomerData(customerId)
);

const { data: contracts } = useQuery(
  ['contracts', customerId],
  () => fetchCustomerContracts(customerId)
);

const { data: payments } = useQuery(
  ['payments', customerId],
  () => fetchCustomerPayments(customerId)
);
```

## الإضافات المستقبلية

- [ ] إضافة تحرير مباشر للبيانات
- [ ] تصدير التقارير PDF
- [ ] رسوم بيانية تفاعلية مع Recharts
- [ ] تصفية وبحث متقدم
- [ ] إشعارات فورية
- [ ] تاريخ التعديلات
- [ ] رفع المستندات
- [ ] معاينة المستندات
- [ ] طباعة العقود

## الاعتمادات

المكون يعتمد على:
- React 19+
- TypeScript
- React Router
- Lucide Icons
- Radix UI Components
- Tailwind CSS
- Custom UI Components من المشروع

## الترخيص

هذا المكون جزء من FleetifyApp وخاضع لنفس الترخيص.

## المؤلف

تم تطويره بواسطة فريق FleetifyApp

---

**ملاحظة:** هذا المكون قابل للتوسع والتخصيص بسهولة حسب احتياجات المشروع.

