# إصلاح نظام الحالة القانونية للعقود

## المشكلة الأصلية
عند تحويل عقد إلى "تحت الإجراء القانوني"، كان النظام يغير حالة العقد الأساسية (`status`) من `active` أو `cancelled` إلى `under_legal_procedure`.

**المشكلة**: فقدان الحالة الأصلية للعقد.

## الحل المطبق

### 1. ✅ إضافة عمود `legal_status` منفصل
**الملف**: `supabase/migrations/20260126000002_add_legal_status_to_contracts.sql`

```sql
ALTER TABLE contracts ADD COLUMN legal_status TEXT DEFAULT NULL;
```

**الحالات القانونية المتاحة**:
- `under_legal_action` - تحت الإجراء القانوني
- `legal_case_filed` - تم رفع دعوى
- `in_court` - في المحكمة
- `judgment_issued` - صدر حكم
- `execution_phase` - مرحلة التنفيذ
- `settled` - تم التسوية
- `closed` - مغلق

### 2. ✅ تحديث مكون عرض الحالة
**الملف**: `src/components/contracts/ContractStatusBadge.tsx`

**التغييرات**:
- إضافة خاصية `legalStatus` اختيارية
- عرض الحالتين معاً إذا كانت الحالة القانونية موجودة
- تصميم مميز لكل حالة قانونية

**مثال**:
```typescript
<ContractStatusBadge 
  status="active" 
  legalStatus="under_legal_action" 
/>
// النتيجة: [نشط] + [تحت الإجراء القانوني]
```

### 3. ✅ تحديث الأنواع
**الملف**: `src/types/contracts.ts`

```typescript
export interface Contract {
  // ...
  status: ContractStatus
  legal_status?: LegalStatus | null
  // ...
}

export type LegalStatus = 
  | 'under_legal_action'
  | 'legal_case_filed'
  | 'in_court'
  | 'judgment_issued'
  | 'execution_phase'
  | 'settled'
  | 'closed'
```

### 4. ✅ تحديث Hook تحويل الحالة القانونية
**الملف**: `src/hooks/useConvertToLegalCase.ts`

**قبل**:
```typescript
.update({ status: 'under_legal_procedure' })
```

**بعد**:
```typescript
.update({ legal_status: 'under_legal_action' })
```

### 5. ✅ تحديث فلتر العقود
**الملف**: `src/pages/ContractsRedesigned.tsx`

**قبل**:
```typescript
case 'الإجراء القانوني':
  newFilters.status = "under_legal_procedure"
```

**بعد**:
```typescript
case 'الإجراء القانوني':
  newFilters.legal_status = "under_legal_action"
```

### 6. ⚠️ إزالة الحالات الخاطئة
**الملف**: `supabase/migrations/20260126000005_revert_legal_status_migration.sql`

```sql
-- إزالة legal_status من جميع العقود
UPDATE contracts
SET legal_status = NULL
WHERE legal_status IS NOT NULL;
```

**السبب**: Migration السابق قام بتحويل جميع العقود "تحت الإجراء القانوني" إلى `active` بشكل خاطئ.

## الخطوات المطلوبة من المستخدم

### ⚠️ إعادة تعيين الحالة القانونية يدوياً

للأسف، لا يمكن استرجاع الحالات الأصلية تلقائياً. يجب على المستخدم:

1. **تحديد العقود التي تحتاج إلى حالة قانونية**
   - الذهاب إلى صفحة "إدارة المتعثرات المالية"
   - تحديد العملاء المتعثرين
   
2. **تحويل العقود إلى حالة قانونية**
   - استخدام زر "تحويل إلى قضية قانونية"
   - سيتم تعيين `legal_status = 'under_legal_action'` تلقائياً
   - **الحالة الأساسية (`status`) لن تتغير**

3. **التحقق من النتيجة**
   - في صفحة تفاصيل العقد، يجب أن تظهر حالتين:
     - الحالة الأساسية (نشط، ملغي، إلخ)
     - الحالة القانونية (تحت الإجراء القانوني)

## الفوائد

### ✅ الحفاظ على الحالة الأصلية
- العقد النشط يبقى نشطاً حتى لو كان تحت إجراء قانوني
- العقد الملغي يبقى ملغياً مع إمكانية متابعة الإجراء القانوني

### ✅ تتبع أفضل للحالة القانونية
- مراحل متعددة للإجراء القانوني
- سهولة الفلترة والبحث
- تقارير أكثر دقة

### ✅ واجهة أوضح
- عرض الحالتين معاً
- تصميم مميز لكل حالة
- سهولة الفهم للمستخدم

## الملفات المتأثرة

### Backend (Supabase)
- ✅ `supabase/migrations/20260126000002_add_legal_status_to_contracts.sql`
- ✅ `supabase/migrations/20260126000005_revert_legal_status_migration.sql`

### Frontend (React/TypeScript)
- ✅ `src/types/contracts.ts`
- ✅ `src/components/contracts/ContractStatusBadge.tsx`
- ✅ `src/components/contracts/ContractHeaderRedesigned.tsx`
- ✅ `src/components/contracts/ContractHeader.tsx`
- ✅ `src/components/contracts/ContractCard.tsx`
- ✅ `src/hooks/useConvertToLegalCase.ts`
- ✅ `src/pages/ContractsRedesigned.tsx`
- ✅ `src/hooks/useContracts.ts`
- ✅ `src/hooks/api/useContractsApi.ts`
- ✅ `src/utils/queryKeys.ts`

## الحالة الحالية
- ✅ تم إضافة عمود `legal_status`
- ✅ تم تحديث جميع المكونات
- ✅ تم إزالة الحالات الخاطئة
- ⏳ يحتاج المستخدم إلى إعادة تعيين الحالة القانونية يدوياً

## التاريخ
- **2026-01-26**: تم تطبيق الإصلاح الكامل
