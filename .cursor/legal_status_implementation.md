# تطبيق الحالة القانونية المنفصلة للعقود

## الهدف
السماح بإضافة حالة "تحت الإجراء القانوني" للعقود دون تغيير حالتها الأصلية.

## التغييرات المنفذة

### 1. قاعدة البيانات (Migration)
**الملف**: `supabase/migrations/20260126000002_add_legal_status_to_contracts.sql`

- إضافة عمود جديد `legal_status` لجدول `contracts`
- القيم المسموح بها:
  - `under_legal_action` - تحت الإجراء القانوني
  - `legal_case_filed` - تم رفع قضية
  - `in_court` - في المحكمة
  - `judgment_issued` - صدر حكم
  - `execution_phase` - مرحلة التنفيذ
  - `settled` - تمت التسوية
  - `closed` - مغلق
- إنشاء فهارس لتحسين الأداء
- تحديث العقود الموجودة التي حالتها `under_legal_procedure` لتحويلها للنظام الجديد

### 2. Hook التحويل للقضية القانونية
**الملف**: `src/hooks/useConvertToLegalCase.ts`

**التغييرات**:
```typescript
// قبل:
.update({ 
  status: 'under_legal_procedure',
  updated_at: new Date().toISOString()
})

// بعد:
.update({ 
  legal_status: 'under_legal_action',
  updated_at: new Date().toISOString()
})
```

**النتيجة**: 
- الحالة الأصلية للعقد تبقى كما هي (active, expired, cancelled, etc.)
- يتم إضافة `legal_status = 'under_legal_action'` كحالة إضافية
- مثال: عقد نشط + تحت الإجراء القانوني = `status: 'active'` + `legal_status: 'under_legal_action'`

### 3. صفحة العقود
**الملف**: `src/pages/ContractsRedesigned.tsx`

**التغيير**:
```typescript
// قبل:
else if (activeTab === "legal_action") {
  newFilters.status = "under_legal_procedure";
}

// بعد:
else if (activeTab === "legal_action") {
  newFilters.legal_status = "under_legal_action";
}
```

**النتيجة**: تبويب "الإجراء القانوني" يفلتر حسب `legal_status` بدلاً من `status`

### 4. Types & Interfaces
**الملفات المحدثة**:
- `src/utils/queryKeys.ts` - إضافة `legal_status?: string` لـ `ContractFilters`
- `src/hooks/useContracts.ts` - إضافة `legal_status?: string` لـ `Contract` interface
- `src/hooks/api/useContractsApi.ts` - إضافة `legal_status?: string` لـ `Contract` و `ContractFilters`

### 5. API Hooks
**الملف**: `src/hooks/api/useContractsApi.ts`

**التغييرات**:
- إضافة دعم `legal_status` في parameters الـ API
- إضافة فلترة `legal_status` في Supabase fallback query

## كيفية الاستخدام

### عرض العقود تحت الإجراء القانوني
```typescript
// في صفحة العقود
const filters = {
  legal_status: 'under_legal_action'
};

// العقود المعروضة ستكون:
// - status: 'active', legal_status: 'under_legal_action'
// - status: 'expired', legal_status: 'under_legal_action'
// - أي حالة أصلية + تحت الإجراء القانوني
```

### عرض حالة العقد في الواجهة
```typescript
// يمكن عرض الحالتين معاً
{contract.status === 'active' && contract.legal_status === 'under_legal_action' && (
  <Badge variant="warning">
    نشط - تحت الإجراء القانوني
  </Badge>
)}
```

### تحديث الحالة القانونية
```typescript
// عند رفع قضية
await supabase
  .from('contracts')
  .update({ legal_status: 'legal_case_filed' })
  .eq('id', contractId);

// عند التسوية
await supabase
  .from('contracts')
  .update({ legal_status: 'settled' })
  .eq('id', contractId);

// إزالة الحالة القانونية
await supabase
  .from('contracts')
  .update({ legal_status: null })
  .eq('id', contractId);
```

## الفوائد

1. **الحفاظ على الحالة الأصلية**: العقد يبقى نشط/منتهي/ملغي كما هو
2. **تتبع دقيق**: يمكن معرفة الحالة التشغيلية والقانونية في نفس الوقت
3. **مرونة في التقارير**: يمكن فلترة العقود حسب الحالة الأصلية أو القانونية أو كلاهما
4. **سهولة الإدارة**: عند إغلاق القضية، يمكن إزالة `legal_status` فقط دون تغيير `status`

## أمثلة واقعية

### مثال 1: عقد نشط تحت الإجراء القانوني
```json
{
  "contract_number": "C-2026-001",
  "status": "active",
  "legal_status": "under_legal_action",
  "start_date": "2025-01-01",
  "end_date": "2026-01-01"
}
```
**المعنى**: العقد لا يزال ساري المفعول، لكن هناك إجراء قانوني ضد العميل

### مثال 2: عقد منتهي مع قضية في المحكمة
```json
{
  "contract_number": "C-2025-050",
  "status": "expired",
  "legal_status": "in_court",
  "start_date": "2024-01-01",
  "end_date": "2025-01-01"
}
```
**المعنى**: العقد انتهى، لكن القضية القانونية لا تزال في المحكمة

### مثال 3: عقد نشط تمت تسويته
```json
{
  "contract_number": "C-2026-002",
  "status": "active",
  "legal_status": "settled",
  "start_date": "2025-06-01",
  "end_date": "2026-06-01"
}
```
**المعنى**: العقد نشط، وتمت تسوية القضية القانونية

## الخطوات التالية (اختياري)

1. **تحديث الواجهة**: إضافة badge لعرض الحالة القانونية في قائمة العقود
2. **تقارير**: إنشاء تقارير منفصلة للعقود حسب الحالة القانونية
3. **إشعارات**: إرسال إشعارات عند تغيير الحالة القانونية
4. **سجل التغييرات**: تتبع تاريخ تغييرات الحالة القانونية

## تطبيق Migration

لتطبيق التغييرات على قاعدة البيانات:

```bash
# استخدام Supabase CLI
supabase db push

# أو تطبيق الـ migration مباشرة
psql -h [host] -U [user] -d [database] -f supabase/migrations/20260126000002_add_legal_status_to_contracts.sql
```

## ملاحظات مهمة

- ⚠️ العقود الموجودة بحالة `under_legal_procedure` سيتم تحويلها تلقائياً إلى `status: 'active'` + `legal_status: 'under_legal_action'`
- ✅ جميع الفلاتر والاستعلامات تم تحديثها لدعم الحقل الجديد
- ✅ الحقل اختياري (`NULL` allowed) - العقود العادية لن يكون لها `legal_status`
- ✅ تم إنشاء فهارس لضمان الأداء الجيد

## التاريخ
- **تاريخ الإنشاء**: 26 يناير 2026
- **الإصدار**: 1.0
- **المطور**: AI Assistant
