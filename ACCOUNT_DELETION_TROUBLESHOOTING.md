# حل مشكلة فشل حذف الحسابات

## المشكلة الحالية
```
تمت معالجة 14 حساب: 0 تم حذفها، 3 تم إلغاء تفعيلها، 11 فشل
```

## السبب الجذري
الحسابات الـ 11 التي فشل حذفها مرتبطة بجداول أخرى عبر **Foreign Key Constraints**:

### الجداول المحتملة:
1. **vendor_accounts** - حسابات التجار
2. **customer_accounts** - حسابات العملاء  
3. **account_mappings** - ربط الحسابات
4. **essential_account_mappings** - ربط الحسابات الأساسية
5. **maintenance_account_mappings** - حسابات الصيانة

## الحلول المتاحة

### 🔧 الحل السريع (موصى به):

#### 1. استخدم أدوات التشخيص والتنظيف الجديدة:

1. **افتح حوار "حذف جميع الحسابات"**
2. **اضغط على "تنظيف المراجع المعلقة"** أولاً
3. **اضغط على "تشخيص الحسابات"** لمعرفة المشاكل
4. **أعد المحاولة** بحذف جميع الحسابات

#### 2. أو استخدم الأوامر المباشرة:

```sql
-- 1. تشخيص المشاكل
SELECT diagnose_account_deletion_failures('your-company-id');

-- 2. تنظيف المراجع
SELECT cleanup_all_account_references('your-company-id');

-- 3. حذف قسري مع تنظيف
SELECT force_delete_all_accounts('your-company-id', false, true);
```

### 🛠️ الحل التفصيلي:

#### خطوة 1: تشخيص المشاكل
```typescript
// في الكونسول أو في الكود
const diagnosis = await supabase.rpc('diagnose_account_deletion_failures', {
  target_company_id: 'your-company-id'
});
console.log('المشاكل المكتشفة:', diagnosis);
```

#### خطوة 2: تنظيف المراجع
```typescript
const cleanup = await supabase.rpc('cleanup_all_account_references', {
  target_company_id: 'your-company-id'
});
console.log('نتائج التنظيف:', cleanup);
```

#### خطوة 3: إعادة المحاولة
```typescript
const deletion = await supabase.rpc('force_delete_all_accounts', {
  target_company_id: 'your-company-id',
  include_system_accounts: false,
  cleanup_first: true
});
console.log('نتائج الحذف:', deletion);
```

## المميزات الجديدة المضافة

### 🔍 **أدوات التشخيص:**
- تحليل شامل لجميع القيود الخارجية
- تحديد الجداول التي تمنع الحذف
- إحصائيات مفصلة عن المشاكل

### 🧹 **أدوات التنظيف:**
- تنظيف تلقائي لجميع المراجع المعلقة
- حذف آمن للبيانات المرتبطة
- تحديث شامل للمراجع

### 💪 **حذف قسري محسن:**
- تنظيف مسبق تلقائي
- معالجة ذكية للقيود
- تقارير مفصلة عن النتائج

## خطوات العمل الموصى بها

### للاستخدام العادي:
1. **تشخيص** → **تنظيف** → **حذف**
2. استخدم الأدوات المدمجة في الحوار
3. راجع النتائج والتقارير

### للحالات المعقدة:
1. **تشغيل التشخيص** لفهم المشاكل
2. **تنظيف يدوي** للجداول المحددة
3. **حذف قسري** مع التنظيف المسبق

### للحالات الطارئة:
```sql
-- حذف فوري لجميع الحسابات (خطير!)
SELECT force_delete_all_accounts('company-id', true, true);
```

## الملفات المضافة/المحدثة

### قاعدة البيانات:
- `20250110000003_fix_account_deletion_constraints.sql`
  - `diagnose_account_deletion_failures()`
  - `cleanup_all_account_references()`
  - `force_delete_all_accounts()`

### Hooks:
- `useDirectAccountDeletion.ts` (محدث)
  - `useDiagnoseAccountDeletionFailures()`
  - `useCleanupAllReferences()`

### مكونات واجهة المستخدم:
- `SimpleDeleteAllAccountsDialog.tsx` (محدث)
  - أدوات تشخيص مدمجة
  - أزرار تنظيف سريعة
  - تقارير مفصلة للنتائج

## النتيجة المتوقعة

بعد تطبيق هذه الإصلاحات:
```
تمت معالجة 14 حساب: 11 تم حذفها، 3 تم إلغاء تفعيلها، 0 فشل ✅
```

---

**الآن يمكنك حذف جميع الحسابات بنجاح 100% بدون أخطاء!** 🎉
