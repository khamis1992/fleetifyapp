# دليل تطبيق الصلاحيات على الأزرار والعمليات

## نظرة عامة

تم إنشاء نظام صلاحيات كامل (RBAC) لمشروع FleetifyApp. هذا الدليل يوضح كيفية تطبيق الحماية على الأزرار والعمليات الحساسة.

---

## المكونات المتاحة

### 1. PermissionGuard - حماية المكونات

```tsx
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Permission } from '@/lib/permissions/roles';

// إخفاء الزر إذا لم يكن لديه صلاحية
<PermissionGuard permission={Permission.DELETE_CONTRACT}>
  <Button variant="destructive">حذف العقد</Button>
</PermissionGuard>

// تعطيل الزر بدلاً من إخفائه
<PermissionGuard permission={Permission.DELETE_CONTRACT} disableOnDenied>
  <Button variant="destructive">حذف العقد</Button>
</PermissionGuard>

// عرض رسالة تنبيه
<PermissionGuard permission={Permission.DELETE_CONTRACT} showAlert>
  <Button variant="destructive">حذف العقد</Button>
</PermissionGuard>
```

### 2. RoleGuard - حماية الصفحات

```tsx
import { RoleGuard, SuperAdminGuard, AdminGuard } from '@/components/auth/RoleGuard';
import { UserRole } from '@/lib/permissions/roles';

// حماية صفحة كاملة
export default function UsersPage() {
  return (
    <SuperAdminGuard>
      <UsersPageContent />
    </SuperAdminGuard>
  );
}

// حماية بعدة أدوار
<RoleGuard roles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]}>
  <SettingsPage />
</RoleGuard>
```

### 3. useRolePermissions Hook

```tsx
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Permission } from '@/lib/permissions/roles';

function MyComponent() {
  const { hasPermission, hasRole, roleDisplayName } = useRolePermissions();
  
  const handleDelete = () => {
    if (!hasPermission(Permission.DELETE_CONTRACT)) {
      toast.error('ليس لديك صلاحية حذف العقود');
      return;
    }
    // تنفيذ الحذف
  };
  
  return (
    <div>
      {hasPermission(Permission.DELETE_CONTRACT) && (
        <Button onClick={handleDelete}>حذف</Button>
      )}
    </div>
  );
}
```

---

## الصلاحيات المتاحة

### إدارة المستخدمين
- `Permission.VIEW_USERS` - عرض المستخدمين
- `Permission.CREATE_USER` - إنشاء مستخدم
- `Permission.EDIT_USER` - تعديل مستخدم
- `Permission.DELETE_USER` - حذف مستخدم
- `Permission.MANAGE_USERS` - إدارة كاملة للمستخدمين
- `Permission.RESET_USER_PASSWORD` - إعادة تعيين كلمة المرور

### إدارة الشركات (Super Admin فقط)
- `Permission.VIEW_COMPANIES` - عرض الشركات
- `Permission.CREATE_COMPANY` - إنشاء شركة
- `Permission.EDIT_COMPANY` - تعديل شركة
- `Permission.DELETE_COMPANY` - حذف شركة
- `Permission.MANAGE_COMPANIES` - إدارة كاملة للشركات

### المالية
- `Permission.VIEW_FINANCE` - عرض البيانات المالية
- `Permission.MANAGE_FINANCE` - إدارة المالية
- `Permission.VIEW_REPORTS` - عرض التقارير
- `Permission.EXPORT_REPORTS` - تصدير التقارير
- `Permission.CREATE_INVOICE` - إنشاء فاتورة
- `Permission.EDIT_INVOICE` - تعديل فاتورة
- `Permission.DELETE_INVOICE` - حذف فاتورة
- `Permission.APPROVE_INVOICE` - اعتماد فاتورة
- `Permission.CREATE_PAYMENT` - إنشاء دفعة
- `Permission.EDIT_PAYMENT` - تعديل دفعة
- `Permission.DELETE_PAYMENT` - حذف دفعة
- `Permission.APPROVE_PAYMENT` - اعتماد دفعة
- `Permission.MANAGE_CHART_OF_ACCOUNTS` - إدارة دليل الحسابات
- `Permission.MANAGE_JOURNAL_ENTRIES` - إدارة القيود اليومية

### العقود
- `Permission.VIEW_CONTRACTS` - عرض العقود
- `Permission.CREATE_CONTRACT` - إنشاء عقد
- `Permission.EDIT_CONTRACT` - تعديل عقد
- `Permission.DELETE_CONTRACT` - حذف عقد
- `Permission.APPROVE_CONTRACT` - اعتماد عقد
- `Permission.CANCEL_CONTRACT` - إلغاء عقد
- `Permission.RENEW_CONTRACT` - تجديد عقد

### المركبات
- `Permission.VIEW_VEHICLES` - عرض المركبات
- `Permission.CREATE_VEHICLE` - إنشاء مركبة
- `Permission.EDIT_VEHICLE` - تعديل مركبة
- `Permission.DELETE_VEHICLE` - حذف مركبة
- `Permission.MANAGE_MAINTENANCE` - إدارة الصيانة
- `Permission.VIEW_VEHICLE_REPORTS` - عرض تقارير المركبات

### العملاء
- `Permission.VIEW_CUSTOMERS` - عرض العملاء
- `Permission.CREATE_CUSTOMER` - إنشاء عميل
- `Permission.EDIT_CUSTOMER` - تعديل عميل
- `Permission.DELETE_CUSTOMER` - حذف عميل
- `Permission.MANAGE_CUSTOMER_ACCOUNTS` - إدارة حسابات العملاء
- `Permission.VIEW_CUSTOMER_REPORTS` - عرض تقارير العملاء

### الموظفين
- `Permission.VIEW_EMPLOYEES` - عرض الموظفين
- `Permission.CREATE_EMPLOYEE` - إنشاء موظف
- `Permission.EDIT_EMPLOYEE` - تعديل موظف
- `Permission.DELETE_EMPLOYEE` - حذف موظف
- `Permission.MANAGE_EMPLOYEES` - إدارة كاملة للموظفين

### الإعدادات
- `Permission.VIEW_SETTINGS` - عرض الإعدادات
- `Permission.EDIT_COMPANY_SETTINGS` - تعديل إعدادات الشركة
- `Permission.EDIT_SYSTEM_SETTINGS` - تعديل إعدادات النظام (Super Admin فقط)
- `Permission.MANAGE_ROLES` - إدارة الأدوار والصلاحيات

---

## أمثلة التطبيق

### 1. حماية زر الحذف في صفحة العقود

**قبل**:
```tsx
<Button 
  variant="destructive" 
  onClick={handleDelete}
>
  حذف العقد
</Button>
```

**بعد**:
```tsx
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Permission } from '@/lib/permissions/roles';

<PermissionGuard permission={Permission.DELETE_CONTRACT} disableOnDenied>
  <Button 
    variant="destructive" 
    onClick={handleDelete}
  >
    حذف العقد
  </Button>
</PermissionGuard>
```

---

### 2. حماية زر الاعتماد في صفحة الفواتير

```tsx
<PermissionGuard permission={Permission.APPROVE_INVOICE} disableOnDenied>
  <Button onClick={handleApprove}>
    اعتماد الفاتورة
  </Button>
</PermissionGuard>
```

---

### 3. حماية زر التعديل في صفحة العملاء

```tsx
<PermissionGuard permission={Permission.EDIT_CUSTOMER}>
  <Button variant="outline" onClick={handleEdit}>
    <Pencil className="h-4 w-4 ml-2" />
    تعديل
  </Button>
</PermissionGuard>
```

---

### 4. حماية زر الإنشاء في صفحة المركبات

```tsx
<PermissionGuard permission={Permission.CREATE_VEHICLE}>
  <Button onClick={() => setCreateDialogOpen(true)}>
    <Plus className="h-4 w-4 ml-2" />
    إضافة مركبة جديدة
  </Button>
</PermissionGuard>
```

---

### 5. حماية قسم كامل في الصفحة

```tsx
import { HiddenContent } from '@/components/auth/PermissionGuard';

<HiddenContent permission={Permission.VIEW_FINANCE}>
  <Card>
    <CardHeader>
      <CardTitle>التقارير المالية</CardTitle>
    </CardHeader>
    <CardContent>
      {/* محتوى التقارير المالية */}
    </CardContent>
  </Card>
</HiddenContent>
```

---

### 6. التحقق في الكود قبل تنفيذ العملية

```tsx
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Permission } from '@/lib/permissions/roles';

function ContractActions() {
  const { hasPermission } = useRolePermissions();
  
  const handleDelete = async () => {
    // التحقق من الصلاحية قبل التنفيذ
    if (!hasPermission(Permission.DELETE_CONTRACT)) {
      toast.error('ليس لديك صلاحية حذف العقود');
      return;
    }
    
    try {
      await deleteContract(contractId);
      toast.success('تم حذف العقد بنجاح');
    } catch (error) {
      toast.error('فشل حذف العقد');
    }
  };
  
  return (
    <PermissionGuard permission={Permission.DELETE_CONTRACT} disableOnDenied>
      <Button variant="destructive" onClick={handleDelete}>
        حذف
      </Button>
    </PermissionGuard>
  );
}
```

---

## الملفات التي تحتاج إلى تحديث

### أولوية عالية جداً 🔴

1. **src/components/contracts/**
   - `BulkDeleteContractsDialog.tsx` - زر حذف جماعي
   - `ContractCard.tsx` - أزرار حذف وإلغاء
   - `ContractApprovalWorkflow.tsx` - زر اعتماد
   - `ContractCancellationDialog.tsx` - زر إلغاء

2. **src/components/customers/**
   - `CustomerDetailsPage.tsx` - أزرار حذف وأرشفة
   - `CustomerCard.tsx` - أزرار تعديل وحذف

3. **src/components/finance/**
   - `InvoiceCard.tsx` - أزرار اعتماد وحذف
   - `PaymentCard.tsx` - أزرار اعتماد وحذف

4. **src/components/hr/**
   - `DeleteEmployeeConfirmDialog.tsx` - زر حذف موظف
   - `EmployeeCard.tsx` - أزرار تعديل وحذف

### أولوية عالية 🟡

5. **src/components/fleet/**
   - `VehicleCard.tsx` - أزرار تعديل وحذف
   - `MaintenanceCard.tsx` - أزرار تعديل وحذف

6. **src/components/legal/**
   - `LegalCaseCard.tsx` - أزرار تعديل وحذف

7. **src/components/inventory/**
   - `AssetCard.tsx` - أزرار تعديل وحذف

### أولوية متوسطة 🟢

8. **src/pages/finance/**
   - `Reports.tsx` - أزرار تصدير
   - `GeneralLedger.tsx` - أزرار تصدير

9. **src/pages/hr/**
   - `Employees.tsx` - زر إضافة موظف

10. **src/pages/sales/**
    - `Contracts.tsx` - زر إنشاء عقد

---

## خطوات التطبيق

### الخطوة 1: إضافة الـ imports
```tsx
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Permission } from '@/lib/permissions/roles';
```

### الخطوة 2: لف الزر بـ PermissionGuard
```tsx
<PermissionGuard 
  permission={Permission.DELETE_CONTRACT} 
  disableOnDenied
>
  {/* الزر الأصلي */}
</PermissionGuard>
```

### الخطوة 3: اختبار الحماية
- تسجيل الدخول بدور Employee
- التأكد من أن الزر معطل أو مخفي
- تسجيل الدخول بدور Company Admin
- التأكد من أن الزر يعمل

---

## نصائح مهمة

1. **استخدم `disableOnDenied` للأزرار الرئيسية**
   - يعطل الزر بدلاً من إخفائه
   - يحسن تجربة المستخدم

2. **استخدم `HiddenContent` للأقسام الكاملة**
   - يخفي القسم بالكامل
   - يوفر مساحة في الواجهة

3. **تحقق دائماً في الكود قبل تنفيذ العملية**
   - حماية إضافية على مستوى الكود
   - منع التلاعب من Developer Tools

4. **اختبر مع جميع الأدوار**
   - Super Admin - يجب أن يرى كل شيء
   - Company Admin - يرى معظم الأشياء
   - Manager - يرى بعض الأشياء
   - Employee - يرى القليل فقط

---

## الخلاصة

نظام الصلاحيات جاهز للاستخدام! ما عليك سوى:

1. ✅ استيراد `PermissionGuard` و `Permission`
2. ✅ لف الأزرار الحساسة بـ `PermissionGuard`
3. ✅ اختبار الحماية مع جميع الأدوار

**الوقت المقدر لتطبيق الحماية على جميع الأزرار**: 10-15 ساعة

**الأولوية**: ابدأ بالأزرار الحمراء (حذف، اعتماد)، ثم الصفراء (تعديل)، ثم الخضراء (إنشاء، تصدير).
