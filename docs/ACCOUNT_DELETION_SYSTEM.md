# نظام الحذف الشامل للحسابات المحاسبية

## نظرة عامة

تم تطوير نظام شامل لحذف الحسابات المحاسبية يحل مشكلة "column i.account_id does not exist" ويوفر آلية آمنة ومتكاملة للتعامل مع حذف الحسابات وجميع البيانات المرتبطة بها.

## المشاكل التي تم حلها

### 1. خطأ "column i.account_id does not exist"
- **السبب**: محاولة الوصول لأعمدة غير موجودة في بعض الجداول
- **الحل**: إضافة فحص وجود الأعمدة قبل تنفيذ العمليات

### 2. عدم حذف البيانات المرتبطة
- **السبب**: عدم وجود آلية شاملة لتتبع جميع التبعيات
- **الحل**: تحليل شامل لجميع الجداول المرتبطة

### 3. فقدان البيانات غير المرغوب فيه
- **السبب**: حذف قسري دون تحليل التبعيات
- **الحل**: ثلاثة أنماط حذف مختلفة حسب الحاجة

## مكونات النظام الجديد

### 1. دوال قاعدة البيانات

#### `column_exists(table_name, column_name)`
```sql
-- فحص وجود عمود في جدول معين
SELECT column_exists('invoices', 'account_id');
```

#### `analyze_account_dependencies(account_id)`
```sql
-- تحليل شامل لجميع البيانات المرتبطة بالحساب
SELECT analyze_account_dependencies('account-uuid-here');
```

#### `comprehensive_delete_account(account_id, deletion_mode, transfer_to_account_id, user_id)`
```sql
-- حذف شامل مع خيارات متعددة
SELECT comprehensive_delete_account(
    'account-uuid-here',
    'transfer',  -- 'soft', 'transfer', 'force'
    'target-account-uuid',
    'user-uuid'
);
```

#### `verify_account_deletion_integrity(company_id)`
```sql
-- فحص سلامة البيانات بعد عمليات الحذف
SELECT verify_account_deletion_integrity('company-uuid-here');
```

#### `cleanup_orphaned_account_references(company_id)`
```sql
-- تنظيف المراجع المعلقة
SELECT cleanup_orphaned_account_references('company-uuid-here');
```

### 2. Hooks للواجهة الأمامية

#### `useAnalyzeAccountDependencies()`
```typescript
const analyzeQuery = useAnalyzeAccountDependencies();

// تحليل التبعيات
analyzeQuery.mutate(accountId);
```

#### `useComprehensiveAccountDeletion()`
```typescript
const deleteAccount = useComprehensiveAccountDeletion();

// حذف شامل
await deleteAccount.mutateAsync({
  accountId: 'account-id',
  deletionMode: 'transfer',
  transferToAccountId: 'target-account-id'
});
```

#### `useVerifyAccountIntegrity()`
```typescript
const verifyIntegrity = useVerifyAccountIntegrity();

// فحص سلامة البيانات
const result = await verifyIntegrity.mutateAsync();
```

#### `useCleanupOrphanedReferences()`
```typescript
const cleanup = useCleanupOrphanedReferences();

// تنظيف البيانات المعلقة
const result = await cleanup.mutateAsync();
```

### 3. مكونات واجهة المستخدم

#### `EnhancedAccountDeleteDialog`
حوار متقدم لحذف الحسابات مع:
- تحليل تلقائي للتبعيات
- خيارات حذف متعددة
- واجهة سهلة الاستخدام

#### `AccountDeletionLogViewer`
عارض سجل عمليات الحذف مع:
- تاريخ جميع العمليات
- تفاصيل البيانات المتأثرة
- حالة كل عملية

#### `AccountMaintenanceTools`
أدوات صيانة شاملة تشمل:
- فحص سلامة البيانات
- تنظيف المراجع المعلقة
- عرض السجلات

## أنماط الحذف

### 1. الحذف الآمن (Soft Delete)
```typescript
deletionMode: 'soft'
```
- **الوصف**: إلغاء تفعيل الحساب فقط
- **الاستخدام**: للحسابات النظامية أو التي تحتوي على بيانات حساسة
- **النتيجة**: الحساب يختفي من القوائم لكن البيانات تبقى سليمة

### 2. النقل والحذف (Transfer Delete)
```typescript
deletionMode: 'transfer'
transferToAccountId: 'target-account-id'
```
- **الوصف**: نقل جميع البيانات إلى حساب آخر ثم حذف الحساب
- **الاستخدام**: عند دمج الحسابات أو إعادة التنظيم
- **النتيجة**: البيانات تنتقل للحساب الجديد والحساب القديم يُحذف

### 3. الحذف القسري (Force Delete)
```typescript
deletionMode: 'force'
```
- **الوصف**: حذف الحساب وجميع البيانات المرتبطة نهائياً
- **الاستخدام**: للحسابات الخاطئة أو غير المرغوب فيها
- **النتيجة**: حذف نهائي لا يمكن التراجع عنه

## الجداول المشمولة في النظام

### الجداول الأساسية
1. **journal_entry_lines** - القيود المحاسبية
2. **chart_of_accounts** - دليل الحسابات (الحسابات الفرعية)

### الجداول الاختيارية (يتم فحصها إذا كانت موجودة)
3. **contracts** - العقود
4. **payments** - المدفوعات
5. **invoice_items** - عناصر الفواتير
6. **invoices** - الفواتير
7. **customers** - العملاء
8. **budget_items** - عناصر الميزانية
9. **fixed_assets** - الأصول الثابتة
10. **vendor_accounts** - حسابات التجار
11. **customer_accounts** - حسابات العملاء
12. **maintenance_account_mappings** - تخصيصات حسابات الصيانة

## سجل العمليات

### جدول `account_deletion_log`
يحفظ تفاصيل كاملة عن كل عملية حذف:

```sql
CREATE TABLE account_deletion_log (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    deleted_account_id UUID,
    deleted_account_code VARCHAR(20),
    deleted_account_name TEXT,
    deletion_type TEXT, -- 'soft', 'transfer', 'force'
    transfer_to_account_id UUID,
    deleted_by UUID,
    deletion_reason TEXT,
    analysis_data JSONB, -- نتائج التحليل
    affected_records JSONB, -- البيانات المتأثرة
    operation_result JSONB, -- نتيجة العملية
    error_message TEXT, -- رسالة الخطأ إن وجدت
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

## كيفية الاستخدام

### 1. في مكونات React

```typescript
import { EnhancedAccountDeleteDialog } from '@/components/finance/EnhancedAccountDeleteDialog';

const MyComponent = () => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  return (
    <>
      <Button onClick={() => {
        setSelectedAccount(account);
        setShowDeleteDialog(true);
      }}>
        حذف الحساب
      </Button>

      <EnhancedAccountDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        accountId={selectedAccount?.id}
        accountName={selectedAccount?.account_name}
        accountCode={selectedAccount?.account_code}
      />
    </>
  );
};
```

### 2. استخدام مباشر للـ Hooks

```typescript
import { 
  useAnalyzeAccountDependencies,
  useComprehensiveAccountDeletion 
} from '@/hooks/useEnhancedAccountDeletion';

const MyComponent = () => {
  const analyzeQuery = useAnalyzeAccountDependencies();
  const deleteAccount = useComprehensiveAccountDeletion();

  const handleDeleteAccount = async (accountId: string) => {
    // 1. تحليل التبعيات
    const analysis = await analyzeQuery.mutateAsync(accountId);
    
    // 2. تحديد الاستراتيجية
    const strategy = determineDeletionStrategy(analysis);
    
    // 3. تنفيذ الحذف
    await deleteAccount.mutateAsync({
      accountId,
      deletionMode: strategy.recommendedMode,
      transferToAccountId: strategy.requiresTransfer ? targetAccountId : undefined
    });
  };
};
```

### 3. أدوات الصيانة

```typescript
import { AccountMaintenanceTools } from '@/components/finance/AccountMaintenanceTools';

const FinanceSettings = () => {
  return (
    <div className="space-y-6">
      {/* باقي المحتوى */}
      
      <AccountMaintenanceTools />
    </div>
  );
};
```

## الفوائد المحققة

### 1. الأمان
- ✅ فحص شامل للتبعيات قبل الحذف
- ✅ خيارات حذف متدرجة حسب الخطورة
- ✅ سجل كامل لجميع العمليات

### 2. المرونة
- ✅ ثلاثة أنماط حذف مختلفة
- ✅ إمكانية نقل البيانات
- ✅ تحكم كامل في العملية

### 3. الشفافية
- ✅ تحليل مفصل للبيانات المرتبطة
- ✅ عرض واضح للتأثيرات
- ✅ سجل مفصل للعمليات

### 4. الصيانة
- ✅ أدوات فحص سلامة البيانات
- ✅ تنظيف تلقائي للمراجع المعلقة
- ✅ تقارير شاملة عن حالة النظام

## استكشاف الأخطاء

### مشكلة: "column does not exist"
```sql
-- فحص وجود العمود
SELECT column_exists('table_name', 'column_name');

-- إذا كان false، فالعمود غير موجود ولن يتم تنفيذ العملية عليه
```

### مشكلة: بيانات معلقة
```sql
-- فحص سلامة البيانات
SELECT verify_account_deletion_integrity('company-id');

-- تنظيف البيانات المعلقة
SELECT cleanup_orphaned_account_references('company-id');
```

### مشكلة: فشل الحذف
```sql
-- مراجعة سجل الأخطاء
SELECT * FROM account_deletion_log 
WHERE error_message IS NOT NULL 
ORDER BY created_at DESC;
```

## خطوات التطبيق

1. **تشغيل Migration الجديد**:
   ```bash
   supabase db push
   ```

2. **تحديث المكونات الحالية**:
   - استبدال `useDeleteAccount` القديم
   - إضافة `EnhancedAccountDeleteDialog`
   - إضافة أدوات الصيانة

3. **اختبار النظام**:
   - فحص سلامة البيانات
   - اختبار أنماط الحذف المختلفة
   - مراجعة السجلات

4. **التدريب**:
   - تدريب المستخدمين على الخيارات الجديدة
   - شرح أنماط الحذف المختلفة

## ملاحظات مهمة

⚠️ **تحذيرات**:
- الحذف القسري لا يمكن التراجع عنه
- تأكد من اختبار النظام في بيئة التطوير أولاً
- احتفظ بنسخ احتياطية قبل عمليات الحذف الكبيرة

✅ **أفضل الممارسات**:
- استخدم الحذف الآمن للحسابات النظامية
- استخدم النقل والحذف لإعادة التنظيم
- استخدم الحذف القسري فقط للحسابات الخاطئة
- راجع سجل العمليات بانتظام

## الملفات المضافة/المحدثة

### ملفات قاعدة البيانات
- `supabase/migrations/20250110000000_comprehensive_account_deletion_fix.sql`

### Hooks
- `src/hooks/useEnhancedAccountDeletion.ts` (جديد)
- `src/hooks/useChartOfAccounts.ts` (محدث)

### مكونات واجهة المستخدم
- `src/components/finance/EnhancedAccountDeleteDialog.tsx` (جديد)
- `src/components/finance/AccountDeletionLogViewer.tsx` (جديد)
- `src/components/finance/AccountMaintenanceTools.tsx` (جديد)

### ملفات التوثيق
- `ACCOUNT_DELETION_SYSTEM.md` (هذا الملف)

---

**تاريخ الإنشاء**: 10 يناير 2025  
**الحالة**: جاهز للتطبيق  
**المطور**: Manus AI
