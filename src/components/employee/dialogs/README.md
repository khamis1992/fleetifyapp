# Employee Workspace Dialogs

مكونات الحوارات السريعة لمساحة عمل الموظف.

## 📦 المكونات المتاحة

### 1. QuickPaymentDialog
حوار تسجيل دفعة سريع.

```tsx
import { QuickPaymentDialog } from '@/components/employee/dialogs';

<QuickPaymentDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  contracts={contractsData}
  preselectedContractId={contractId} // اختياري
/>
```

**Props:**
- `open`: boolean - حالة فتح/إغلاق الحوار
- `onOpenChange`: (open: boolean) => void - دالة تغيير الحالة
- `contracts`: Array - قائمة العقود المتاحة
- `preselectedContractId?`: string - عقد محدد مسبقاً (اختياري)

---

### 2. CallLogDialog
حوار تسجيل مكالمة مع العميل.

```tsx
import { CallLogDialog } from '@/components/employee/dialogs';

<CallLogDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  contracts={contractsData}
  preselectedContractId={contractId} // اختياري
/>
```

**Props:**
- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `contracts`: Array
- `preselectedContractId?`: string

---

### 3. ScheduleFollowupDialog
حوار جدولة متابعة.

```tsx
import { ScheduleFollowupDialog } from '@/components/employee/dialogs';

<ScheduleFollowupDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  contracts={contractsData}
  preselectedContractId={contractId} // اختياري
/>
```

**Props:**
- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `contracts`: Array
- `preselectedContractId?`: string

---

### 4. AddNoteDialog
حوار إضافة ملاحظة على العقد.

```tsx
import { AddNoteDialog } from '@/components/employee/dialogs';

<AddNoteDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  contracts={contractsData}
  preselectedContractId={contractId} // اختياري
/>
```

**Props:**
- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `contracts`: Array
- `preselectedContractId?`: string

---

## 🔧 مثال كامل

```tsx
import { useState } from 'react';
import {
  QuickPaymentDialog,
  CallLogDialog,
  ScheduleFollowupDialog,
  AddNoteDialog,
} from '@/components/employee/dialogs';

export function MyComponent() {
  const [showPayment, setShowPayment] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [showNote, setShowNote] = useState(false);
  
  const contracts = [
    {
      id: '123',
      contract_number: 'C-2024-001',
      customer_name: 'أحمد محمد',
      customer_id: 'cust-123',
      balance_due: 5000,
    },
    // ... المزيد من العقود
  ];

  return (
    <>
      <button onClick={() => setShowPayment(true)}>
        تسجيل دفعة
      </button>
      
      <QuickPaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        contracts={contracts}
      />
      
      {/* باقي الحوارات... */}
    </>
  );
}
```

---

## 📋 تنسيق بيانات العقود

يجب أن تكون بيانات العقود بالتنسيق التالي:

```typescript
interface ContractForDialog {
  id: string;                    // معرّف العقد
  contract_number: string;       // رقم العقد
  customer_name: string;         // اسم العميل
  customer_id: string;           // معرّف العميل
  balance_due: number;           // الرصيد المستحق (للدفعات فقط)
}
```

---

## 🔄 التحديث التلقائي

جميع الحوارات تستخدم `queryClient.invalidateQueries` لتحديث البيانات تلقائياً بعد الحفظ:

```typescript
queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
queryClient.invalidateQueries({ queryKey: ['employee-performance'] });
```

---

## 🎨 التخصيص

### تغيير الألوان
الألوان محددة في كل مكون باستخدام Tailwind classes:

- **Payment**: `from-emerald-500 to-emerald-600`
- **Call**: `from-blue-500 to-blue-600`
- **Followup**: `from-purple-500 to-purple-600`
- **Note**: `from-amber-500 to-amber-600`

### إضافة حقول جديدة
1. حدّث Zod schema
2. أضف الحقل في defaultValues
3. أضف FormField في الـ JSX
4. حدّث mutation function

---

## 🐛 استكشاف الأخطاء

### الحوار لا يفتح
تأكد من:
- `open` prop صحيح
- `onOpenChange` يُحدّث state بشكل صحيح

### البيانات لا تُحدّث
تأكد من:
- `queryClient` مُعرّف بشكل صحيح
- Query keys صحيحة
- Mutations تُنفّذ بنجاح

### Validation errors
تحقق من:
- Zod schema يطابق البيانات
- رسائل الخطأ واضحة
- جميع الحقول المطلوبة موجودة

---

## 📚 المراجع

- [Shadcn Dialog](https://ui.shadcn.com/docs/components/dialog)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [TanStack Query](https://tanstack.com/query)

---

**آخر تحديث:** 28 يناير 2026
