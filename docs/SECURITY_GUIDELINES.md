# 🔒 دليل الأمان والصلاحيات في FleetifyApp

**التاريخ**: 14 نوفمبر 2025  
**الهدف**: توحيد طريقة التعامل مع الصلاحيات والأمان في جميع أنحاء التطبيق

---

## 📋 القواعد الأساسية

### 1. ✅ استخدم طبقة الخدمة (Service Layer)

**❌ خطأ**:
```typescript
// في الـ hook مباشرة
const { data } = await supabase
  .from('contracts')
  .select('*')
  .eq('company_id', companyId);
```

**✅ صحيح**:
```typescript
// استخدم الخدمة
import { contractService } from '@/services';

const contracts = await contractService.findContracts(companyId, filters);
```

---

### 2. ✅ تحقق من الصلاحيات دائماً

**❌ خطأ**:
```typescript
// بدون تحقق من الصلاحيات
const handleDelete = async (id: string) => {
  await supabase.from('contracts').delete().eq('id', id);
};
```

**✅ صحيح**:
```typescript
import { usePermissions } from '@/hooks/usePermissions';

const { hasPermission } = usePermissions();

const handleDelete = async (id: string) => {
  if (!hasPermission('contracts:delete')) {
    toast.error('ليس لديك صلاحية الحذف');
    return;
  }
  
  await contractService.delete(id, companyId);
};
```

---

### 3. ✅ استخدم `useUnifiedCompanyAccess`

**❌ خطأ**:
```typescript
// الوصول المباشر للمستخدم
const { user } = useAuth();
const companyId = user?.profile?.company_id;
```

**✅ صحيح**:
```typescript
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

const { companyId, hasCompanyAdminAccess, hasGlobalAccess } = useUnifiedCompanyAccess();
```

---

### 4. ✅ استخدم Stored Procedures للعمليات الحرجة

**❌ خطأ**:
```typescript
// عمليات منفصلة بدون معاملة
const createContract = async (data) => {
  // 1. إنشاء العقد
  const contract = await supabase.from('contracts').insert(data);
  
  // 2. تحديث المركبة
  await supabase.from('vehicles').update({ status: 'reserved' });
  
  // 3. تسجيل النشاط
  await supabase.from('activity_logs').insert({ ... });
};
```

**✅ صحيح**:
```typescript
// استخدم stored procedure مع معاملة
const createContract = async (data) => {
  const { data: result, error } = await supabase.rpc(
    'create_contract_with_transaction',
    {
      p_company_id: companyId,
      p_customer_id: data.customer_id,
      p_vehicle_id: data.vehicle_id,
      // ... باقي المعاملات
    }
  );
  
  if (error) throw error;
  return result;
};
```

---

## 🔧 الـ Stored Procedures المتاحة

### 1. `create_contract_with_transaction`

**الوظيفة**: إنشاء عقد مع تحديث حالة المركبة وتسجيل النشاط في معاملة واحدة.

**المعاملات**:
```typescript
{
  p_company_id: UUID,
  p_customer_id: UUID,
  p_vehicle_id: UUID,
  p_start_date: DATE,
  p_end_date: DATE,
  p_rental_type: 'daily' | 'weekly' | 'monthly',
  p_rental_duration: number,
  p_total_amount: number,
  p_security_deposit?: number,
  p_created_by?: UUID,
  p_additional_data?: JSONB
}
```

**الإرجاع**:
```typescript
{
  success: boolean,
  contract_id: UUID,
  contract_number: string,
  message: string
}
```

**مثال الاستخدام**:
```typescript
const { data, error } = await supabase.rpc('create_contract_with_transaction', {
  p_company_id: companyId,
  p_customer_id: customerId,
  p_vehicle_id: vehicleId,
  p_start_date: '2025-01-01',
  p_end_date: '2025-02-01',
  p_rental_type: 'monthly',
  p_rental_duration: 1,
  p_total_amount: 5000,
  p_security_deposit: 1000,
});

if (error) {
  console.error('Failed to create contract:', error.message);
  return;
}

console.log('Contract created:', data.contract_number);
```

---

### 2. `create_journal_entry_with_transaction`

**الوظيفة**: إنشاء قيد محاسبي مع خطوطه والتحقق من تساوي المدين والدائن.

**المعاملات**:
```typescript
{
  p_company_id: UUID,
  p_entry_number: string,
  p_entry_date: DATE,
  p_description: string,
  p_lines: JSONB, // Array of lines
  p_reference?: string,
  p_created_by?: UUID
}
```

**صيغة الخطوط**:
```typescript
[
  {
    account_id: UUID,
    description: string,
    debit: number,
    credit: number
  },
  // ... المزيد من الخطوط
]
```

**الإرجاع**:
```typescript
{
  success: boolean,
  entry_id: UUID,
  entry_number: string,
  total_debit: number,
  total_credit: number,
  line_count: number,
  message: string
}
```

**مثال الاستخدام**:
```typescript
const lines = [
  {
    account_id: cashAccountId,
    description: 'إيداع نقدي',
    debit: 5000,
    credit: 0
  },
  {
    account_id: revenueAccountId,
    description: 'إيرادات إيجار',
    debit: 0,
    credit: 5000
  }
];

const { data, error } = await supabase.rpc('create_journal_entry_with_transaction', {
  p_company_id: companyId,
  p_entry_number: 'JE-2025-001',
  p_entry_date: '2025-01-15',
  p_description: 'قيد إيرادات الإيجار',
  p_lines: JSON.stringify(lines),
});

if (error) {
  console.error('Failed to create journal entry:', error.message);
  return;
}

console.log('Journal entry created:', data.entry_number);
```

---

### 3. `create_payment_with_transaction`

**الوظيفة**: إنشاء دفعة مع تحديث مبالغ العقد وحالته تلقائياً.

**المعاملات**:
```typescript
{
  p_company_id: UUID,
  p_contract_id: UUID,
  p_customer_id: UUID,
  p_amount: number,
  p_payment_date: DATE,
  p_payment_method: string,
  p_payment_type?: 'rental' | 'security_deposit' | 'penalty' | 'refund',
  p_reference?: string,
  p_notes?: string,
  p_created_by?: UUID
}
```

**الإرجاع**:
```typescript
{
  success: boolean,
  payment_id: UUID,
  payment_number: string,
  contract_status: string,
  amount_paid: number,
  amount_remaining: number,
  security_deposit_paid: number,
  message: string
}
```

**مثال الاستخدام**:
```typescript
const { data, error } = await supabase.rpc('create_payment_with_transaction', {
  p_company_id: companyId,
  p_contract_id: contractId,
  p_customer_id: customerId,
  p_amount: 2500,
  p_payment_date: '2025-01-15',
  p_payment_method: 'cash',
  p_payment_type: 'rental',
  p_notes: 'دفعة أولى',
});

if (error) {
  console.error('Failed to create payment:', error.message);
  return;
}

console.log('Payment created:', data.payment_number);
console.log('Contract status:', data.contract_status);
console.log('Remaining:', data.amount_remaining);
```

---

## 🛡️ الصلاحيات المتاحة

### أنواع الصلاحيات

```typescript
type Permission = 
  | 'contracts:create'
  | 'contracts:read'
  | 'contracts:update'
  | 'contracts:delete'
  | 'payments:create'
  | 'payments:read'
  | 'payments:update'
  | 'payments:delete'
  | 'invoices:create'
  | 'invoices:read'
  | 'invoices:update'
  | 'invoices:delete'
  | 'vehicles:create'
  | 'vehicles:read'
  | 'vehicles:update'
  | 'vehicles:delete'
  | 'customers:create'
  | 'customers:read'
  | 'customers:update'
  | 'customers:delete'
  | 'finance:read'
  | 'finance:write'
  | 'reports:read'
  | 'settings:read'
  | 'settings:write'
  | 'users:manage';
```

### الأدوار والصلاحيات

| الدور | الصلاحيات |
|-------|-----------|
| **admin** | جميع الصلاحيات |
| **manager** | إنشاء وقراءة وتحديث (بدون حذف) |
| **accountant** | المحاسبة والتقارير |
| **driver** | قراءة فقط |
| **user** | قراءة فقط |

---

## 📝 أمثلة عملية

### مثال 1: صفحة إنشاء عقد

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { contractService } from '@/services';

function CreateContractPage() {
  const { hasPermission } = usePermissions();
  const { companyId } = useUnifiedCompanyAccess();
  
  // التحقق من الصلاحية
  if (!hasPermission('contracts:create')) {
    return <div>ليس لديك صلاحية إنشاء عقود</div>;
  }
  
  const handleSubmit = async (data) => {
    try {
      // استخدم stored procedure
      const { data: result, error } = await supabase.rpc(
        'create_contract_with_transaction',
        {
          p_company_id: companyId,
          ...data
        }
      );
      
      if (error) throw error;
      
      toast.success(`تم إنشاء العقد: ${result.contract_number}`);
    } catch (error) {
      toast.error('فشل إنشاء العقد');
      console.error(error);
    }
  };
  
  return <ContractForm onSubmit={handleSubmit} />;
}
```

### مثال 2: hook مخصص مع صلاحيات

```typescript
import { useQuery } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { contractService } from '@/services';

export function useContracts(filters?: ContractFilters) {
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();
  
  return useQuery({
    queryKey: ['contracts', companyId, filters],
    queryFn: async () => {
      // التحقق من الصلاحية
      if (!hasPermission('contracts:read')) {
        throw new Error('ليس لديك صلاحية قراءة العقود');
      }
      
      // استخدم الخدمة
      return contractService.findContracts(companyId, filters);
    },
    enabled: !!companyId && hasPermission('contracts:read'),
  });
}
```

---

## ✅ قائمة التحقق

عند كتابة hook أو صفحة جديدة، تأكد من:

- [ ] استخدام `useUnifiedCompanyAccess` للحصول على `companyId`
- [ ] استخدام `usePermissions` للتحقق من الصلاحيات
- [ ] استخدام طبقة الخدمة بدلاً من Supabase مباشرة
- [ ] استخدام Stored Procedures للعمليات الحرجة
- [ ] عدم استخدام `select('*')` - حدد الأعمدة المطلوبة فقط
- [ ] إضافة معالجة الأخطاء المناسبة
- [ ] تسجيل الأخطاء في Sentry (في الإنتاج)
- [ ] عدم استخدام `console.log` في الإنتاج

---

## 🚨 تحذيرات أمنية

### ❌ لا تفعل هذا أبداً:

1. **عدم التحقق من company_id**:
```typescript
// خطر أمني!
const { data } = await supabase
  .from('contracts')
  .select('*'); // بدون فلترة company_id
```

2. **عدم التحقق من الصلاحيات**:
```typescript
// خطر أمني!
const handleDelete = async (id) => {
  await supabase.from('contracts').delete().eq('id', id);
};
```

3. **استخدام hard-coded IDs**:
```typescript
// خطر أمني!
const companyId = '123e4567-e89b-12d3-a456-426614174000';
```

4. **تجاهل الأخطاء**:
```typescript
// خطأ!
try {
  await createContract(data);
} catch (error) {
  // تجاهل الخطأ
}
```

---

## 📚 المراجع

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)
- [Sentry Error Tracking](https://docs.sentry.io/platforms/javascript/guides/react/)

---

**آخر تحديث**: 14 نوفمبر 2025  
**الإصدار**: 1.0.0
